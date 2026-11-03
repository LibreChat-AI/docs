import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/**
 * The feedback server action limits submissions per client (cf-connecting-ip),
 * not per submitted page, and only accepts bare pathnames of existing docs pages.
 * Each test sends its own client address so the in-memory limiter of a single
 * `next start` process keeps the tests independent.
 */

const PAGES = [
  '/docs/features/agents',
  '/docs/features/artifacts',
  '/docs/features/fork',
  '/docs/features/composer',
]

/** A random client address, so parallel workers never share a limiter key. */
function nextClientIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1
  return `10.${octet()}.${octet()}.${octet()}`
}

/** A browser context for one client address, with the analytics prompt already answered. */
async function newClient(browser: Browser, ip = nextClientIp()): Promise<BrowserContext> {
  const context = await browser.newContext({ extraHTTPHeaders: { 'cf-connecting-ip': ip } })
  await context.addInitScript(() => window.localStorage.setItem('librechat_reo_consent', 'denied'))
  return context
}

interface ActionCall {
  success: boolean
  actionId: string
  headers: Record<string, string>
}

/** Rate the page through the widget and return what the server action answered. */
async function submitThroughWidget(page: Page, path: string): Promise<ActionCall> {
  await page.goto(path)
  await page.getByRole('button', { name: 'Good', exact: true }).click()

  // Read the action response in a route handler: the streamed body is not
  // retrievable from the page once the client has consumed it.
  let resolveCall: (value: { body: string; headers: Record<string, string> }) => void = () => {}
  const captured = new Promise<{ body: string; headers: Record<string, string> }>((resolve) => {
    resolveCall = resolve
  })
  await page.route(path, async (route) => {
    const request = route.request()
    if (request.method() !== 'POST' || !request.headers()['next-action']) return route.fallback()
    const response = await route.fetch()
    resolveCall({ body: await response.text(), headers: await request.allHeaders() })
    await route.fulfill({ response })
  })

  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  const { body, headers: requestHeaders } = await captured
  await expect(page.getByText('Thank you for your feedback!')).toBeVisible()
  await page.unroute(path)

  const match = body.match(/"success":(true|false)/)
  expect(match, `unexpected action response: ${body.slice(0, 200)}`).not.toBeNull()
  return {
    success: match?.[1] === 'true',
    actionId: requestHeaders['next-action'] ?? '',
    headers: {
      'next-action': requestHeaders['next-action'] ?? '',
      'next-router-state-tree': requestHeaders['next-router-state-tree'] ?? '',
      'content-type': requestHeaders['content-type'] ?? 'text/plain;charset=UTF-8',
      accept: 'text/x-component',
    },
  }
}

/** Call the same server action directly with an arbitrary page value. */
async function callActionWithUrl(
  page: Page,
  call: ActionCall,
  path: string,
  url: string,
): Promise<boolean> {
  const response = await page.request.post(path, {
    headers: call.headers,
    data: JSON.stringify([{ opinion: 'good', message: '', url }]),
  })
  const body = await response.text()
  const match = body.match(/"success":(true|false)/)
  expect(match, `unexpected action response: ${body.slice(0, 200)}`).not.toBeNull()
  return match?.[1] === 'true'
}

test.describe('Docs feedback rate limit', () => {
  test('@scenario:feedback-from-a-docs-page-is-accepted rating a docs page through the widget is accepted', async ({
    browser,
  }) => {
    const context = await newClient(browser)
    const page = await context.newPage()
    const call = await submitThroughWidget(page, PAGES[0])
    expect(call.success).toBe(true)
    await context.close()
  })

  test('@scenario:feedback-limit-follows-the-client-across-pages a fourth rating within a minute is refused even on a different page', async ({
    browser,
  }) => {
    const context = await newClient(browser)
    const page = await context.newPage()
    const results: boolean[] = []
    for (const path of PAGES) {
      results.push((await submitThroughWidget(page, path)).success)
    }
    expect(results).toEqual([true, true, true, false])
    await context.close()
  })

  test('@scenario:feedback-limit-does-not-block-another-client a client that hit the limit does not block a different client', async ({
    browser,
  }) => {
    const noisy = await newClient(browser)
    const noisyPage = await noisy.newPage()
    for (const path of PAGES.slice(0, 3)) {
      expect((await submitThroughWidget(noisyPage, path)).success).toBe(true)
    }
    expect((await submitThroughWidget(noisyPage, PAGES[3])).success).toBe(false)
    await noisy.close()

    const other = await newClient(browser)
    const otherPage = await other.newPage()
    expect((await submitThroughWidget(otherPage, PAGES[0])).success).toBe(true)
    await other.close()
  })

  test('@scenario:feedback-rejects-page-values-that-are-not-docs-pages page values other than an existing docs pathname are refused without using the budget', async ({
    browser,
  }) => {
    const context = await newClient(browser)
    const page = await context.newPage()
    const first = await submitThroughWidget(page, PAGES[0])
    expect(first.success).toBe(true)

    for (const url of [
      `${PAGES[1]}?utm=1`,
      `${PAGES[1]}#intro`,
      '/docs/does-not-exist',
      '/blog',
      '//evil.example/docs',
      'https://evil.example/docs',
      '/\\evil.example',
      '/%2f%2fevil.example',
    ]) {
      expect(await callActionWithUrl(page, first, PAGES[0], url), url).toBe(false)
    }

    // The refused values did not count: two more valid ratings still fit in the limit of three.
    expect(await callActionWithUrl(page, first, PAGES[0], PAGES[1])).toBe(true)
    expect(await callActionWithUrl(page, first, PAGES[0], PAGES[2])).toBe(true)
    expect(await callActionWithUrl(page, first, PAGES[0], PAGES[3])).toBe(false)
    await context.close()
  })
})
