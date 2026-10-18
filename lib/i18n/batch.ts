import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { OPENROUTER_APP_HEADERS } from '../openrouter-attribution'
import {
  assertNotTruncated,
  buildTranslateRequest,
  TRANSLATE_MODEL_SETTINGS,
  type TranslateInput,
  type TranslateModel,
  type TranslateRequest,
} from './engine'
import { deferredKey } from './run'

/**
 * Batch prefetch for the translation pipeline. OpenRouter's `:batch` endpoints bill
 * at half the live rate but answer asynchronously (up to a 24h window), which does
 * not fit the per-block translate/validate/retry loop in run.ts. So the batch only
 * answers each request's first attempt: the run then consumes those answers and
 * falls back to the live model for everything else (validation retries, truncation,
 * failed batches). A batch still running when the run stops waiting cannot be
 * cancelled, so its requests are not bought again live: they stay untranslated
 * for this run and a later run collects the batch's answers through the ledger.
 *
 * https://openrouter.ai/docs/projects/docs/batch-quickstart
 */

const BATCHES_URL = 'https://openrouter.ai/api/v1/batches'
const TERMINAL = new Set(['completed', 'failed', 'expired', 'cancelled'])

export interface BatchAnswer {
  text: string
  finishReason: string
}

/** Stable id for one request; doubles as the batch `custom_id`. */
export function requestKey(req: Parameters<TranslateModel['generate']>[0]): string {
  return createHash('sha256')
    .update(JSON.stringify([req.system, req.prompt, req.maxOutputTokens]))
    .digest('hex')
    .slice(0, 32)
}

/**
 * Serves each prefetched answer once, and only to a block's first request: a
 * validation retry always reaches the live model, never another copy of the answer
 * it just rejected.
 */
export function createPrefetchedModel(
  prefetched: Map<string, BatchAnswer[]>,
  live: TranslateModel,
): TranslateModel {
  return {
    async generate(req) {
      const hit = req.attempt ? undefined : prefetched.get(requestKey(req))?.shift()
      if (!hit) return live.generate(req)
      // Same contract as the live path: a length-limited answer is not a translation.
      assertNotTruncated(hit.finishReason, req.maxOutputTokens)
      return hit.text
    },
  }
}

interface BatchObject {
  id: string
  status: string
  request_counts?: { total?: number; completed?: number; failed?: number }
  results?: Array<{
    custom_id: string
    response?: {
      status_code?: number
      body?: { choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }> }
    } | null
    error?: unknown
  }> | null
}

export interface PrefetchOptions {
  apiKey: string
  /** Plain model slug; OpenRouter routes it to the model's `:batch` endpoint itself. */
  model: string
  /** Requests per submitted batch. */
  chunkSize: number
  /** Stop waiting after this long; batches still running are handed to a later run. */
  waitMs: number
  pollMs: number
  /** Abort one submit or status request after this long, so a stalled call cannot
   *  outlast the wait. Defaults to two minutes. */
  requestTimeoutMs?: number
  /**
   * Batches still running when a run stops waiting, kept across runs. OpenRouter
   * has no way to cancel a batch, so a later run collects these answers instead of
   * buying the same translations again live.
   */
  ledgerPath: string
  log: (message: string) => void
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

export interface PrefetchResult {
  /** Answers keyed by request id. */
  answers: Map<string, BatchAnswer>
  /** Ids a still-running batch will answer; the caller must not run them live. */
  pending: Set<string>
}

/** Batch id to the request keys it carries, its model, and when it was submitted. */
type Ledger = Record<string, { model: string; keys: string[]; at: number }>

/**
 * How long a batch this run does not need stays in the ledger. A run scoped with
 * `--only` or `--locales` must not forget a batch a full run will want; past the
 * 24h completion window plus a margin, nothing is left to collect.
 */
const UNNEEDED_RETENTION_MS = 48 * 3600_000

async function readLedger(path: string): Promise<Ledger> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Collect the answers of batches an earlier run left running, submit every other
 * request as new batches, and wait for all of them up to `waitMs`. Requests are
 * keyed by a caller-chosen id, which doubles as the batch `custom_id` and is what
 * the ledger remembers, so it must identify the answer across runs. Never
 * throws for a batch-side failure: a request without an answer or a pending batch
 * simply runs live, so the worst case is the old cost, not a failed run.
 */
export async function prefetchTranslations(
  unique: Map<string, TranslateRequest>,
  opts: PrefetchOptions,
): Promise<PrefetchResult> {
  const doFetch = opts.fetch ?? fetch
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
  const now = opts.now ?? Date.now
  let deadline = Infinity
  // Never longer than the wait has left, so stalled calls cannot add up past it.
  const timeout = () =>
    AbortSignal.timeout(Math.max(1, Math.min(opts.requestTimeoutMs ?? 120_000, deadline - now())))
  const headers = {
    Authorization: `Bearer ${opts.apiKey}`,
    'Content-Type': 'application/json',
    ...OPENROUTER_APP_HEADERS,
  }

  const answers = new Map<string, BatchAnswer>()

  // A carried batch is only worth waiting for if this run still needs one of its
  // answers from the same model. `known` is what the ledger keeps, `batches` what
  // this run waits on: a completed batch stays known until a run no longer needs any
  // of its answers, so a run that dies before caching them can collect them later.
  // One this run does not need is kept, unpolled, for a while (see the retention).
  // Batches of another model (an OPENROUTER_TRANSLATE_MODEL override) are kept the
  // same way, so switching back still finds them.
  const known = new Map<string, Ledger[string]>()
  const batches = new Map<string, string[]>()
  for (const [id, entry] of Object.entries(await readLedger(opts.ledgerPath))) {
    if (typeof entry?.model !== 'string' || !Array.isArray(entry.keys)) continue
    const kept = {
      model: entry.model,
      keys: entry.keys,
      at: typeof entry.at === 'number' ? entry.at : 0,
    }
    if (entry.model === opts.model && entry.keys.some((k) => unique.has(k))) {
      known.set(id, kept)
      batches.set(id, entry.keys)
    } else if (now() - kept.at < UNNEEDED_RETENTION_MS) {
      known.set(id, kept)
    }
  }
  if (batches.size > 0) opts.log(`waiting on ${batches.size} batch(es) from an earlier run`)
  const carried = new Set([...batches.values()].flat())

  // Saved after every submit, not only at the end: a run that dies during the long
  // wait must still leave the next run a way to find what it already paid for.
  const saveLedger = async (): Promise<boolean> => {
    const ledger: Ledger = Object.fromEntries(known)
    try {
      await mkdir(dirname(opts.ledgerPath), { recursive: true })
      // Write then rename, so an interrupted write never leaves a truncated ledger
      // that the next run would read as empty.
      const tmp = `${opts.ledgerPath}.tmp`
      await writeFile(tmp, `${JSON.stringify(ledger, null, 2)}\n`)
      await rename(tmp, opts.ledgerPath)
      return true
    } catch (e) {
      opts.log(`could not save the batch ledger: ${(e as Error).message}`)
      return false
    }
  }

  const entries = [...unique].filter(([key]) => !carried.has(key))
  for (let i = 0; i < entries.length; i += opts.chunkSize) {
    const chunk = entries.slice(i, i + opts.chunkSize)
    // Key order matters: OpenRouter rejects a body whose `requests` comes first.
    // `model` is the plain slug; a `:batch` suffix here is rejected.
    const body = {
      endpoint: '/v1/chat/completions',
      model: opts.model,
      completion_window: '24h',
      requests: chunk.map(([key, req]) => ({
        custom_id: key,
        body: {
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.prompt },
          ],
          max_tokens: req.maxOutputTokens,
          ...TRANSLATE_MODEL_SETTINGS,
        },
      })),
    }
    try {
      const res = await doFetch(BATCHES_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: timeout(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
      const created = (await res.json()) as BatchObject
      const keys = chunk.map(([key]) => key)
      known.set(created.id, { model: opts.model, keys, at: now() })
      batches.set(created.id, keys)
      opts.log(`submitted batch ${created.id} (${chunk.length} request(s))`)
      await saveLedger()
    } catch (e) {
      opts.log(
        `batch submit failed, ${chunk.length} request(s) will run live: ${(e as Error).message}`,
      )
    }
  }

  deadline = now() + opts.waitMs
  while (batches.size > 0) {
    for (const id of [...batches.keys()]) {
      let batch: BatchObject
      try {
        const res = await doFetch(`${BATCHES_URL}/${id}`, { headers, signal: timeout() })
        // Deleted, never ours, or no longer readable with this key (any 4xx but a
        // timeout or rate limit): nothing will ever arrive, so stop waiting on it.
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          batches.delete(id)
          known.delete(id)
          opts.log(`batch ${id} unreadable (HTTP ${res.status}); its requests will run live`)
          continue
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        batch = (await res.json()) as BatchObject
      } catch (e) {
        // A failed poll is not a failed batch; try again next round.
        opts.log(`batch ${id} poll failed: ${(e as Error).message}`)
        continue
      }
      if (!TERMINAL.has(batch.status)) continue
      batches.delete(id)
      // Only a completed batch keeps results to collect again.
      if (batch.status !== 'completed') known.delete(id)
      let harvested = 0
      for (const r of batch.results ?? []) {
        const choice = r.response?.status_code === 200 ? r.response.body?.choices?.[0] : undefined
        const text = choice?.message?.content
        if (typeof text !== 'string') continue
        answers.set(r.custom_id, {
          text,
          finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : 'stop',
        })
        harvested++
      }
      opts.log(`batch ${id} ${batch.status}: ${harvested} answer(s)`)
    }
    if (batches.size === 0) break
    if (now() >= deadline) {
      opts.log(
        `stopped waiting on ${batches.size} batch(es) after ${Math.round(opts.waitMs / 60000)} min; a later run collects their answers`,
      )
      break
    }
    await sleep(opts.pollMs)
  }

  const pending = new Set<string>()
  // Without the ledger a later run cannot find these batches, so their requests run
  // live now rather than being left for an answer nobody will collect.
  if (await saveLedger()) {
    for (const keys of batches.values())
      for (const key of keys) if (unique.has(key)) pending.add(key)
  }
  return { answers, pending }
}

export interface MissPrefetch {
  /** One answer per occurrence, keyed by its `requestKey`: identical requests from
   *  different files each get their own copy. */
  answers: Map<string, BatchAnswer[]>
  /** `deferredKey`s of strings a still-running batch will answer. */
  deferred: Set<string>
}

/**
 * Prefetch the misses a dry run reported, buying one answer per string per locale
 * and serving it to every occurrence. Two files processed at once can both miss
 * the same text before either commits it to the TM, and their requests differ by
 * context; the TM itself is keyed by text alone, so sharing the answer matches
 * what the run would cache anyway, without paying for the text twice.
 */
export async function prefetchMisses(
  misses: TranslateInput[],
  opts: PrefetchOptions,
): Promise<MissPrefetch> {
  // Keyed by locale and text, not by the request: which occurrence comes first can
  // change between runs (`--only`, edited pages), and the ledger must still match a
  // batch already paid for to the string it answers.
  const textId = (input: TranslateInput) =>
    createHash('sha256').update(deferredKey(input.locale, input.text)).digest('hex').slice(0, 32)
  const first = new Map<string, TranslateRequest>()
  const texts = new Map<string, string>()
  for (const input of misses) {
    const id = textId(input)
    if (first.has(id)) continue
    first.set(id, buildTranslateRequest(input))
    texts.set(id, deferredKey(input.locale, input.text))
  }
  opts.log(`${misses.length} uncached occurrence(s), ${first.size} distinct string(s)`)
  const { answers, pending } = await prefetchTranslations(first, opts)

  const served = new Map<string, BatchAnswer[]>()
  for (const input of misses) {
    const answer = answers.get(textId(input))
    if (!answer) continue
    const key = requestKey(buildTranslateRequest(input))
    served.set(key, [...(served.get(key) ?? []), answer])
  }
  const deferred = new Set<string>()
  for (const id of pending) {
    const text = texts.get(id)
    if (text) deferred.add(text)
  }
  return { answers: served, deferred }
}
