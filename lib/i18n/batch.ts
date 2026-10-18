import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { OPENROUTER_APP_HEADERS } from '../openrouter-attribution'
import {
  assertNotTruncated,
  TRANSLATE_MODEL_SETTINGS,
  type TranslateModel,
  type TranslateRequest,
} from './engine'

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
 * Serves each prefetched answer once, then defers to the live model. Once, so a
 * validation retry of the same request reaches the live model instead of being
 * handed the same rejected answer again.
 */
export function createPrefetchedModel(
  prefetched: Map<string, BatchAnswer>,
  live: TranslateModel,
): TranslateModel {
  return {
    async generate(req) {
      const key = requestKey(req)
      const hit = prefetched.get(key)
      if (!hit) return live.generate(req)
      prefetched.delete(key)
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
  /** Answers keyed by `requestKey`. */
  answers: Map<string, BatchAnswer>
  /** Requests a still-running batch will answer; the caller must not run them live. */
  pending: Set<string>
}

/** Batch id to the request keys it carries, for one model. */
type Ledger = Record<string, { model: string; keys: string[] }>

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
 * distinct request as new batches, and wait for all of them up to `waitMs`. Never
 * throws for a batch-side failure: a request without an answer or a pending batch
 * simply runs live, so the worst case is the old cost, not a failed run.
 */
export async function prefetchTranslations(
  requests: TranslateRequest[],
  opts: PrefetchOptions,
): Promise<PrefetchResult> {
  const doFetch = opts.fetch ?? fetch
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
  const now = opts.now ?? Date.now
  const headers = {
    Authorization: `Bearer ${opts.apiKey}`,
    'Content-Type': 'application/json',
    ...OPENROUTER_APP_HEADERS,
  }

  const unique = new Map<string, TranslateRequest>()
  for (const req of requests) unique.set(requestKey(req), req)
  const answers = new Map<string, BatchAnswer>()

  // A carried batch is only worth waiting for if this run still needs one of its
  // answers from the same model; anything else is billed either way and dropped.
  const batches = new Map<string, string[]>()
  for (const [id, entry] of Object.entries(await readLedger(opts.ledgerPath))) {
    if (entry?.model === opts.model && entry.keys?.some((k) => unique.has(k))) {
      batches.set(id, entry.keys)
    }
  }
  if (batches.size > 0) opts.log(`waiting on ${batches.size} batch(es) from an earlier run`)
  const carried = new Set([...batches.values()].flat())

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
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
      const created = (await res.json()) as BatchObject
      batches.set(
        created.id,
        chunk.map(([key]) => key),
      )
      opts.log(`submitted batch ${created.id} (${chunk.length} request(s))`)
    } catch (e) {
      opts.log(
        `batch submit failed, ${chunk.length} request(s) will run live: ${(e as Error).message}`,
      )
    }
  }

  const deadline = now() + opts.waitMs
  while (batches.size > 0) {
    for (const id of [...batches.keys()]) {
      let batch: BatchObject
      try {
        const res = await doFetch(`${BATCHES_URL}/${id}`, { headers })
        if (res.status === 404) {
          // Deleted or never ours: nothing will ever arrive, so stop waiting on it.
          batches.delete(id)
          opts.log(`batch ${id} not found; its requests will run live`)
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

  const ledger: Ledger = {}
  const pending = new Set<string>()
  for (const [id, keys] of batches) {
    ledger[id] = { model: opts.model, keys }
    for (const key of keys) if (unique.has(key)) pending.add(key)
  }
  try {
    await mkdir(dirname(opts.ledgerPath), { recursive: true })
    await writeFile(opts.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`)
  } catch (e) {
    // Without the ledger a later run cannot find these batches, so their requests
    // run live now rather than being left for an answer nobody will collect.
    opts.log(`could not save the batch ledger: ${(e as Error).message}`)
    pending.clear()
  }
  return { answers, pending }
}
