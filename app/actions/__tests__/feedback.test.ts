import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckFeedbackRateLimit = vi.fn(async (_clientId: string) => true)
const mockHeaders = vi.fn(() => new Headers({ 'cf-connecting-ip': '203.0.113.7' }))
const KNOWN_PAGES = new Set([
  'en:quick-start',
  'en:configuration',
  'en:limits',
  'en:no-message',
  'de:quick-start',
])

vi.mock('@/lib/ratelimit', () => ({
  checkFeedbackRateLimit: (clientId: string) => mockCheckFeedbackRateLimit(clientId),
}))

vi.mock('next/headers', () => ({
  headers: async () => mockHeaders(),
}))

vi.mock('@/lib/i18n', () => ({
  i18n: { defaultLanguage: 'en', languages: ['en', 'de'] },
}))

vi.mock('@/lib/source', () => ({
  docsSource: {
    getPage: (slugs: string[], locale: string) =>
      KNOWN_PAGES.has(`${locale}:${slugs.join('/')}`) ? {} : undefined,
  },
}))

const { submitFeedback } = await import('../feedback')

describe('submitFeedback', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckFeedbackRateLimit.mockResolvedValue(true)
    mockHeaders.mockReturnValue(new Headers({ 'cf-connecting-ip': '203.0.113.7' }))
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.GITHUB_FEEDBACK_TOKEN
    delete process.env.GITHUB_DISCUSSION_CATEGORY_ID
    delete process.env.GITHUB_DISCUSSION_REPO_ID
    delete process.env.DISCORD_FEEDBACK_WEBHOOK
  })

  it('rejects invalid payloads before rate limiting', async () => {
    const result = await submitFeedback({
      opinion: 'great',
      message: 'nice',
      url: '/docs/test',
    } as never)

    expect(result).toEqual({ success: false })
    expect(mockCheckFeedbackRateLimit).not.toHaveBeenCalled()
  })

  it('rejects external URLs to prevent open redirects', async () => {
    const result = await submitFeedback({
      opinion: 'good',
      message: 'helpful',
      url: 'https://evil.example/docs',
    })

    expect(result).toEqual({ success: false })
    expect(mockCheckFeedbackRateLimit).not.toHaveBeenCalled()
  })

  it('rejects protocol-relative URLs', async () => {
    const result = await submitFeedback({
      opinion: 'bad',
      message: 'confusing',
      url: '//evil.example/docs',
    })

    expect(result).toEqual({ success: false })
  })

  it.each([
    '/\\evil.example',
    '/@evil.example',
    '/%2f%2fevil.example',
    '/∕∕evil.example',
    '/docs?next=http:169.254.169.254',
    '/docs\nX-Injected: 1',
  ])('rejects page values that are not bare pathnames: %j', async (url) => {
    const result = await submitFeedback({ opinion: 'good', message: 'x', url })

    expect(result).toEqual({ success: false })
    expect(mockCheckFeedbackRateLimit).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns false when the client is rate limited', async () => {
    mockCheckFeedbackRateLimit.mockResolvedValue(false)

    const result = await submitFeedback({
      opinion: 'good',
      message: 'clear docs',
      url: '/docs/quick-start',
    })

    expect(result).toEqual({ success: false })
    expect(mockCheckFeedbackRateLimit).toHaveBeenCalledWith('203.0.113.7')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('keys the limit on the client, not the submitted URL', async () => {
    const counts = new Map<string, number>()
    mockCheckFeedbackRateLimit.mockImplementation(async (clientId: string) => {
      const next = (counts.get(clientId) ?? 0) + 1
      counts.set(clientId, next)
      return next <= 3
    })

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        submitFeedback({
          opinion: 'good',
          message: 'spam',
          url: ['/docs/quick-start', '/docs/configuration', '/de/docs/quick-start'][i % 3],
        }),
      ),
    )

    expect(results.filter((r) => r.success)).toHaveLength(3)
    expect([...counts.keys()]).toEqual(['203.0.113.7'])
  })

  it('rejects paths that are not existing docs pages', async () => {
    for (const url of ['/docs/does-not-exist', '/blog/post', '/', '/xx/docs/quick-start']) {
      const result = await submitFeedback({ opinion: 'good', message: '', url })
      expect(result).toEqual({ success: false })
    }
    expect(mockCheckFeedbackRateLimit).not.toHaveBeenCalled()
  })

  it('keeps the locale prefix in the posted URL', async () => {
    process.env.DISCORD_FEEDBACK_WEBHOOK = 'https://discord.test/webhook'

    const result = await submitFeedback({
      opinion: 'good',
      message: '',
      url: '/de/docs/quick-start',
    })

    expect(result).toEqual({ success: true })
    const body = JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[0]?.[1]?.body))
    expect(body.embeds[0].fields[0].value).toBe('/de/docs/quick-start')
    expect(body.allowed_mentions).toEqual({ parse: [] })
  })

  it('breaks @mentions in the GitHub discussion body', async () => {
    process.env.GITHUB_FEEDBACK_TOKEN = 'gh-token'
    process.env.GITHUB_DISCUSSION_CATEGORY_ID = 'category-id'
    process.env.GITHUB_DISCUSSION_REPO_ID = 'repo-id'

    await submitFeedback({ opinion: 'bad', message: 'ping @maintainer', url: '/docs/quick-start' })

    const payload = JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[0]?.[1]?.body))
    expect(payload.variables.body).not.toContain('@maintainer')
    expect(payload.variables.body).toContain('@\u200bmaintainer')
  })

  it('accepts valid feedback and posts to configured integrations', async () => {
    process.env.GITHUB_FEEDBACK_TOKEN = 'gh-token'
    process.env.GITHUB_DISCUSSION_CATEGORY_ID = 'category-id'
    process.env.GITHUB_DISCUSSION_REPO_ID = 'repo-id'
    process.env.DISCORD_FEEDBACK_WEBHOOK = 'https://discord.test/webhook'

    const result = await submitFeedback({
      opinion: 'bad',
      message: '  Needs more examples  ',
      url: '/docs/configuration',
    })

    expect(result).toEqual({ success: true })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('truncates overly long messages', async () => {
    process.env.GITHUB_FEEDBACK_TOKEN = 'gh-token'
    process.env.GITHUB_DISCUSSION_CATEGORY_ID = 'category-id'
    process.env.GITHUB_DISCUSSION_REPO_ID = 'repo-id'

    const longMessage = 'a'.repeat(2500)

    const result = await submitFeedback({
      opinion: 'good',
      message: longMessage,
      url: '/docs/limits',
    })

    expect(result).toEqual({ success: true })

    const githubCall = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([url]) => url === 'https://api.github.com/graphql')
    expect(githubCall).toBeDefined()

    const payload = JSON.parse(String(githubCall?.[1]?.body))
    expect(payload.variables.body.length).toBeLessThan(longMessage.length)
    expect(payload.variables.body).not.toContain('a'.repeat(2500))
  })

  it('treats non-string messages as empty', async () => {
    const result = await submitFeedback({
      opinion: 'good',
      message: 123 as never,
      url: '/docs/no-message',
    })

    expect(result).toEqual({ success: true })
  })
})
