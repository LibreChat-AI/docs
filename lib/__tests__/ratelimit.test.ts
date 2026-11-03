import { beforeEach, describe, expect, it, vi } from 'vitest'

type LimitResult = { success: boolean; reason?: string }

const limitByPrefix = new Map<string, ReturnType<typeof vi.fn>>()

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({}) },
}))

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow() {
      return {}
    }
    limit: ReturnType<typeof vi.fn>
    constructor({ prefix }: { prefix: string }) {
      const fn = vi.fn(async (): Promise<LimitResult> => ({ success: true }))
      limitByPrefix.set(prefix, fn)
      this.limit = fn
    }
  }
  return { Ratelimit }
})

async function load() {
  vi.resetModules()
  limitByPrefix.clear()
  process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.test'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  const mod = await import('../ratelimit')
  // Limiters are created lazily on the first call.
  await mod.checkFeedbackRateLimit('warmup')
  const client = limitByPrefix.get('ratelimit:feedback:client')!
  const global = limitByPrefix.get('ratelimit:feedback:global')!
  return { ...mod, client, global }
}

describe('checkFeedbackRateLimit with Upstash', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('follows the Upstash verdicts when Redis answers in time', async () => {
    const { checkFeedbackRateLimit, client, global } = await load()

    client.mockResolvedValueOnce({ success: false })
    expect(await checkFeedbackRateLimit('203.0.113.1')).toBe(false)

    global.mockResolvedValueOnce({ success: false })
    expect(await checkFeedbackRateLimit('203.0.113.2')).toBe(false)

    expect(await checkFeedbackRateLimit('203.0.113.3')).toBe(true)
  })

  it('keeps a per-client limit when the client window times out', async () => {
    const { checkFeedbackRateLimit, client } = await load()
    client.mockResolvedValue({ success: true, reason: 'timeout' })

    const results = []
    for (let i = 0; i < 5; i++) results.push(await checkFeedbackRateLimit('203.0.113.9'))

    expect(results).toEqual([true, true, true, false, false])
  })

  it('keeps a per-client limit when the global window times out', async () => {
    const { checkFeedbackRateLimit, global } = await load()
    global.mockResolvedValue({ success: true, reason: 'timeout' })

    const results = []
    for (let i = 0; i < 5; i++) results.push(await checkFeedbackRateLimit('203.0.113.10'))

    expect(results).toEqual([true, true, true, false, false])
  })
})
