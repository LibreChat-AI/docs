import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPrefetchedModel, prefetchMisses, prefetchTranslations, requestKey } from './batch'
import {
  buildTranslateRequest,
  TruncatedOutputError,
  type TranslateInput,
  type TranslateModel,
  type TranslateRequest,
} from './engine'
import { deferredKey, runTranslation } from './run'

const echoSource = (prompt: string) => prompt.split(/Translate the following[^\n]*:\n/).pop() ?? ''

function countingModel(): TranslateModel & { calls: number } {
  const m = {
    calls: 0,
    generate: async ({ prompt }: TranslateRequest) => {
      m.calls++
      return echoSource(prompt)
    },
  }
  return m
}

const req = (text: string): TranslateRequest =>
  buildTranslateRequest({ text, locale: 'de', kind: 'block' })

const byKey = (...reqs: TranslateRequest[]) => new Map(reqs.map((r) => [requestKey(r), r]))

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const baseOpts = {
  apiKey: 'k',
  model: 'anthropic/claude-haiku-5.5',
  chunkSize: 1000,
  waitMs: 60_000,
  pollMs: 1000,
  log: () => {},
  sleep: async () => {},
}

describe('createPrefetchedModel', () => {
  it('serves a prefetched answer once, then falls back to the live model', async () => {
    const live = countingModel()
    const r = req('Hello')
    const model = createPrefetchedModel(
      new Map([[requestKey(r), [{ text: 'Hallo', finishReason: 'stop' }]]]),
      live,
    )
    expect(await model.generate(r)).toBe('Hallo')
    expect(live.calls).toBe(0)
    // A second occurrence finds no copy left, so it runs live.
    expect(await model.generate(r)).toBe('Hello')
    expect(live.calls).toBe(1)
  })

  it('sends a validation retry live even while copies for other occurrences remain', async () => {
    const live = countingModel()
    const r = req('Hello')
    const answer = { text: 'Hallo', finishReason: 'stop' }
    const model = createPrefetchedModel(new Map([[requestKey(r), [answer, answer]]]), live)
    expect(await model.generate({ ...r, attempt: 0 })).toBe('Hallo')
    expect(await model.generate({ ...r, attempt: 1 })).toBe('Hello')
    expect(live.calls).toBe(1)
    // The remaining copy still serves the other occurrence's first request.
    expect(await model.generate({ ...r, attempt: 0 })).toBe('Hallo')
  })

  it('rejects a truncated batch answer like the live path does', async () => {
    const r = req('Hello')
    const model = createPrefetchedModel(
      new Map([[requestKey(r), [{ text: 'Hal', finishReason: 'length' }]]]),
      countingModel(),
    )
    await expect(model.generate(r)).rejects.toBeInstanceOf(TruncatedOutputError)
  })
})

describe('prefetchTranslations', () => {
  let ledgerPath: string
  beforeEach(async () => {
    ledgerPath = join(await mkdtemp(join(tmpdir(), 'ledger-')), 'batches.json')
  })
  it('submits distinct requests with `requests` last and harvests completed answers', async () => {
    const a = req('One')
    const b = req('Two')
    const bodies: Record<string, unknown>[] = []
    let polls = 0
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        bodies.push(JSON.parse(String(init.body)))
        return json({ id: 'b1', status: 'validating' })
      }
      polls++
      if (polls === 1) return json({ id: 'b1', status: 'in_progress', results: null })
      return json({
        id: 'b1',
        status: 'completed',
        results: [
          {
            custom_id: requestKey(a),
            response: {
              status_code: 200,
              body: { choices: [{ message: { content: 'Eins' }, finish_reason: 'stop' }] },
            },
            error: null,
          },
          { custom_id: requestKey(b), response: null, error: { message: 'boom' } },
        ],
      })
    }) as typeof fetch

    const { answers } = await prefetchTranslations(byKey(a, b, a), {
      ...baseOpts,
      ledgerPath,
      fetch: fakeFetch,
    })

    expect(bodies).toHaveLength(1)
    expect(Object.keys(bodies[0]).at(-1)).toBe('requests')
    expect(bodies[0].model).toBe('anthropic/claude-haiku-5.5')
    expect((bodies[0].requests as unknown[]).length).toBe(2)
    expect(answers.get(requestKey(a))).toEqual({ text: 'Eins', finishReason: 'stop' })
    // An errored result has no answer, so that request runs live.
    expect(answers.has(requestKey(b))).toBe(false)
  })

  it('splits requests into chunks', async () => {
    let posts = 0
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return json({ id: `b${++posts}`, status: 'validating' })
      return json({ id: 'x', status: 'completed', results: [] })
    }) as typeof fetch
    await prefetchTranslations(byKey(req('1'), req('2'), req('3')), {
      ...baseOpts,
      ledgerPath,
      chunkSize: 2,
      fetch: fakeFetch,
    })
    expect(posts).toBe(2)
  })

  it('hands a batch still running at the deadline to the next run instead of live', async () => {
    let t = 0
    const r = req('One')
    let posts = 0
    const running = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts++
        return json({ id: 'b1', status: 'validating' })
      }
      return json({ id: 'b1', status: 'in_progress', results: null })
    }) as typeof fetch
    const first = await prefetchTranslations(byKey(r), {
      ...baseOpts,
      ledgerPath,
      fetch: running,
      now: () => t,
      sleep: async (ms) => {
        t += ms
      },
    })
    expect(first.answers.size).toBe(0)
    expect(t).toBeGreaterThanOrEqual(baseOpts.waitMs)
    // Not run live: the batch will still answer it.
    expect([...first.pending]).toEqual([requestKey(r)])
    expect(JSON.parse(await readFile(ledgerPath, 'utf8'))).toEqual({
      b1: { model: baseOpts.model, keys: [requestKey(r)], at: 0 },
    })

    // The next run collects the carried batch rather than submitting it again.
    const done = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') posts++
      return json({
        id: 'b1',
        status: 'completed',
        results: [
          {
            custom_id: requestKey(r),
            response: {
              status_code: 200,
              body: { choices: [{ message: { content: 'Eins' }, finish_reason: 'stop' }] },
            },
          },
        ],
      })
    }) as typeof fetch
    const second = await prefetchTranslations(byKey(r), { ...baseOpts, ledgerPath, fetch: done })
    expect(posts).toBe(1)
    expect(second.answers.get(requestKey(r))?.text).toBe('Eins')
    expect(second.pending.size).toBe(0)
    // Kept until a run no longer needs its answers, in case this one dies first.
    expect(Object.keys(JSON.parse(await readFile(ledgerPath, 'utf8')))).toEqual(['b1'])
    // A run that does not need it keeps it a while (a scoped run must not forget a
    // batch a full run wants), then drops it once nothing is left to collect.
    const later = (ms: number) => ({ ...baseOpts, ledgerPath, fetch: done, now: () => ms })
    await prefetchTranslations(new Map(), later(3600_000))
    expect(Object.keys(JSON.parse(await readFile(ledgerPath, 'utf8')))).toEqual(['b1'])
    await prefetchTranslations(new Map(), later(49 * 3600_000))
    expect(JSON.parse(await readFile(ledgerPath, 'utf8'))).toEqual({})
  })

  it('records a submitted batch before waiting, so a run that dies mid-wait loses nothing', async () => {
    const r = req('One')
    const fakeFetch = (async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json({ id: 'b1', status: 'validating' })
        : json({ id: 'b1', status: 'in_progress', results: null })) as typeof fetch
    await expect(
      prefetchTranslations(byKey(r), {
        ...baseOpts,
        ledgerPath,
        fetch: fakeFetch,
        sleep: async () => {
          throw new Error('runner killed')
        },
      }),
    ).rejects.toThrow('runner killed')
    expect(JSON.parse(await readFile(ledgerPath, 'utf8'))).toMatchObject({
      b1: { model: baseOpts.model, keys: [requestKey(r)] },
    })
  })

  it('collects a carried batch even when the string now first appears in another context', async () => {
    const inA: TranslateInput = { text: 'Shared.', locale: 'de', kind: 'block', context: 'Page A' }
    const inB: TranslateInput = { ...inA, context: 'Page B' }
    let t = 0
    const posts: string[] = []
    let customId = ''
    const running = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        customId = JSON.parse(String(init.body)).requests[0].custom_id
        posts.push(customId)
        return json({ id: 'b1', status: 'validating' })
      }
      return json({ id: 'b1', status: 'in_progress', results: null })
    }) as typeof fetch
    const first = await prefetchMisses([inA], {
      ...baseOpts,
      ledgerPath,
      fetch: running,
      now: () => t,
      sleep: async (ms) => {
        t += ms
      },
    })
    expect([...first.deferred]).toEqual([deferredKey('de', 'Shared.')])

    const done = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') posts.push('again')
      return json({
        id: 'b1',
        status: 'completed',
        results: [
          {
            custom_id: customId,
            response: {
              status_code: 200,
              body: { choices: [{ message: { content: 'Geteilt.' }, finish_reason: 'stop' }] },
            },
          },
        ],
      })
    }) as typeof fetch
    const second = await prefetchMisses([inB], { ...baseOpts, ledgerPath, fetch: done })
    expect(posts).toHaveLength(1)
    expect(second.answers.get(requestKey(buildTranslateRequest(inB)))?.[0]?.text).toBe('Geteilt.')
    expect(second.deferred.size).toBe(0)
  })

  it('stops a stalled status request so the deadline still holds', async () => {
    let t = 0
    const r = req('One')
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return json({ id: 'b1', status: 'validating' })
      // Never answers; only the abort signal ends it.
      return new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
      )
    }) as typeof fetch
    const { pending } = await prefetchTranslations(byKey(r), {
      ...baseOpts,
      ledgerPath,
      fetch: fakeFetch,
      requestTimeoutMs: 5,
      now: () => t,
      sleep: async (ms) => {
        t += ms
      },
    })
    expect([...pending]).toEqual([requestKey(r)])
  })

  it('drops a carried batch that this run no longer needs or that is gone', async () => {
    const r = req('One')
    await writeFile(
      ledgerPath,
      JSON.stringify({
        stale: { model: baseOpts.model, keys: ['no-longer-needed'], at: 0 },
        other: { model: 'some/other-model', keys: [requestKey(r)], at: Date.now() },
        gone: { model: baseOpts.model, keys: [requestKey(r)] },
      }),
    )
    const polled: string[] = []
    let posts = 0
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts++
        return json({ id: 'fresh', status: 'validating' })
      }
      polled.push(url.split('/').at(-1)!)
      return url.endsWith('/gone')
        ? json({ error: 'forbidden' }, 403)
        : json({ id: 'fresh', status: 'completed', results: [] })
    }) as typeof fetch
    const { pending } = await prefetchTranslations(byKey(r), {
      ...baseOpts,
      ledgerPath,
      fetch: fakeFetch,
    })
    // `gone` still covers the request, so it is not resubmitted; once it is unreadable the
    // request simply runs live.
    expect(posts).toBe(0)
    expect(polled).toEqual(['gone'])
    expect(pending.size).toBe(0)
    // The other model's batch is kept for when that model is used again.
    expect(Object.keys(JSON.parse(await readFile(ledgerPath, 'utf8')))).toEqual(['other'])
  })

  it('does not throw when a submit fails', async () => {
    const fakeFetch = (async () => json({ error: 'no :batch endpoint' }, 400)) as typeof fetch
    const { answers } = await prefetchTranslations(byKey(req('One')), {
      ...baseOpts,
      ledgerPath,
      fetch: fakeFetch,
    })
    expect(answers.size).toBe(0)
  })
})

describe('batch prefetch with runTranslation', () => {
  let content: string
  let cache: string
  beforeEach(async () => {
    const base = await mkdtemp(join(tmpdir(), 'batch-'))
    content = join(base, 'docs')
    cache = join(base, 'cache')
    await mkdir(content, { recursive: true })
    // The description repeats the paragraph as an inline string, and the second page
    // shares that paragraph next to different neighbors: one string, several
    // distinct requests, of which a real run sends at most one per file.
    await writeFile(
      join(content, 'index.mdx'),
      `---\ntitle: Hello\ndescription: A paragraph.\n---\n\n# Hello\n\nA paragraph.\n`,
    )
    await writeFile(
      join(content, 'other.mdx'),
      `---\ntitle: Other\n---\n\n# Other\n\nA paragraph.\n\n\`\`\`js\nx()\n\`\`\`\n\nTail text.\n`,
    )
    await writeFile(
      join(content, 'meta.json'),
      JSON.stringify({ title: 'Docs', pages: ['index', 'other'] }),
    )
  })

  /** A batch API that answers every request by echoing its source text. */
  function echoBatchApi() {
    const submitted: string[] = []
    const results: unknown[] = []
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          requests: Array<{ custom_id: string; body: { messages: Array<{ content: string }> } }>
        }
        for (const r of body.requests) {
          submitted.push(r.custom_id)
          results.push({
            custom_id: r.custom_id,
            response: {
              status_code: 200,
              body: {
                choices: [
                  {
                    message: { content: echoSource(r.body.messages[1].content) },
                    finish_reason: 'stop',
                  },
                ],
              },
            },
          })
        }
        return json({ id: 'b1', status: 'validating' })
      }
      return json({ id: 'b1', status: 'completed', results })
    }) as typeof fetch
    return { submitted, fakeFetch }
  }

  it('buys each string once per locale and serves every occurrence, so nothing runs live', async () => {
    const opts = { contentDir: content, cacheDir: cache, locales: ['de', 'fr'] }
    const misses: TranslateInput[] = []
    await runTranslation({
      ...opts,
      model: countingModel(),
      dryRun: true,
      onMiss: (input) => misses.push(input),
    })
    const distinct = new Set(misses.map((m) => deferredKey(m.locale, m.text)))
    expect(misses.length).toBeGreaterThan(distinct.size)

    const api = echoBatchApi()
    const { answers, deferred } = await prefetchMisses(misses, {
      ...baseOpts,
      ledgerPath: join(cache, 'batches.json'),
      fetch: api.fakeFetch,
    })
    expect(api.submitted).toHaveLength(distinct.size)
    expect(deferred.size).toBe(0)

    const live = countingModel()
    const stats = await runTranslation({ ...opts, model: createPrefetchedModel(answers, live) })
    expect(live.calls).toBe(0)
    expect(stats.translatedBlocks).toBeGreaterThan(0)
    expect(stats.skipped).toEqual([])
  })

  it('keeps a deferred block in English and uncached so a later run can fill it', async () => {
    const opts = { contentDir: content, cacheDir: cache, locales: ['de'] }
    const prompts: string[] = []
    const live: TranslateModel = {
      generate: async ({ prompt }) => {
        prompts.push(echoSource(prompt))
        return echoSource(prompt)
      },
    }
    const stats = await runTranslation({
      ...opts,
      model: live,
      deferred: new Set([deferredKey('de', 'A paragraph.')]),
    })
    // The description, and the paragraph on both pages: none bought live.
    expect(stats.deferredBlocks).toBe(3)
    expect(prompts).not.toContain('A paragraph.')
    expect(stats.skipped).toEqual([])

    // Not cached, so the next run (once the batch has answered) still translates it.
    prompts.length = 0
    const next = await runTranslation({ ...opts, model: live })
    expect(next.deferredBlocks).toBe(0)
    expect(prompts).toContain('A paragraph.')
  })
})
