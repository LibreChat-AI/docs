import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPrefetchedModel, prefetchTranslations, requestKey, type BatchAnswer } from './batch'
import {
  buildTranslateRequest,
  TruncatedOutputError,
  type TranslateModel,
  type TranslateRequest,
} from './engine'
import { runTranslation } from './run'

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
      new Map([[requestKey(r), { text: 'Hallo', finishReason: 'stop' }]]),
      live,
    )
    expect(await model.generate(r)).toBe('Hallo')
    expect(live.calls).toBe(0)
    // A validation retry of the same request must reach the live model.
    expect(await model.generate(r)).toBe('Hello')
    expect(live.calls).toBe(1)
  })

  it('rejects a truncated batch answer like the live path does', async () => {
    const r = req('Hello')
    const model = createPrefetchedModel(
      new Map([[requestKey(r), { text: 'Hal', finishReason: 'length' }]]),
      countingModel(),
    )
    await expect(model.generate(r)).rejects.toBeInstanceOf(TruncatedOutputError)
  })
})

describe('prefetchTranslations', () => {
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

    const answers = await prefetchTranslations([a, b, a], { ...baseOpts, fetch: fakeFetch })

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
    await prefetchTranslations([req('1'), req('2'), req('3')], {
      ...baseOpts,
      chunkSize: 2,
      fetch: fakeFetch,
    })
    expect(posts).toBe(2)
  })

  it('stops waiting at the deadline and returns what it has', async () => {
    let t = 0
    const fakeFetch = (async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json({ id: 'b1', status: 'validating' })
        : json({ id: 'b1', status: 'in_progress', results: null })) as typeof fetch
    const answers = await prefetchTranslations([req('One')], {
      ...baseOpts,
      fetch: fakeFetch,
      now: () => t,
      sleep: async (ms) => {
        t += ms
      },
    })
    expect(answers.size).toBe(0)
    expect(t).toBeGreaterThanOrEqual(baseOpts.waitMs)
  })

  it('does not throw when a submit fails', async () => {
    const fakeFetch = (async () => json({ error: 'no :batch endpoint' }, 400)) as typeof fetch
    const answers = await prefetchTranslations([req('One')], { ...baseOpts, fetch: fakeFetch })
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
    await writeFile(
      join(content, 'index.mdx'),
      // The description repeats the paragraph as an inline string: one source text,
      // two different requests, but only one is ever sent by a real run.
      `---\ntitle: Hello\ndescription: A paragraph.\n---\n\n# Hello\n\nA paragraph.\n`,
    )
    await writeFile(join(content, 'meta.json'), JSON.stringify({ title: 'Docs', pages: ['index'] }))
  })

  it('answers every request a real run makes, so nothing runs live', async () => {
    const opts = { contentDir: content, cacheDir: cache, locales: ['de', 'fr'] }
    const requests: TranslateRequest[] = []
    await runTranslation({
      ...opts,
      model: countingModel(),
      dryRun: true,
      onMiss: (input) => requests.push(buildTranslateRequest(input)),
    })
    expect(requests.length).toBeGreaterThan(0)

    const answers = new Map<string, BatchAnswer>()
    for (const r of requests)
      answers.set(requestKey(r), { text: echoSource(r.prompt), finishReason: 'stop' })

    const live = countingModel()
    const stats = await runTranslation({ ...opts, model: createPrefetchedModel(answers, live) })
    expect(live.calls).toBe(0)
    // Every billed batch answer is consumed: a repeated block is not requested twice.
    expect(answers.size).toBe(0)
    expect(stats.translatedBlocks).toBeGreaterThan(0)
    expect(stats.skipped).toEqual([])
  })
})
