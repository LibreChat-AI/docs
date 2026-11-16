import { test, expect } from '@playwright/test'

const PAGE = '/docs/features/shareable_links'

test.describe('Shareable links group chat answer', () => {
  test('@scenario:shared-links-page-answers-group-chat-question the continue section says there is no multi-user group chat', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    await expect(main.locator('[id="continue-a-shared-chat"]')).toHaveCount(1)
    const answer = main.locator('p', { hasText: 'LibreChat has no multi-user group chat' })
    await expect(answer).toHaveCount(1)
    await expect(answer).toContainText(
      'Each recipient who continues a shared chat gets a separate copy',
    )
    await expect(answer).toContainText('share their copy with a new link')
    // The answer sits in the continue section, before the next heading.
    const followsContinueHeading = await answer.evaluate((el) => {
      let node = el.previousElementSibling
      while (node && !/^H[1-6]$/.test(node.tagName)) node = node.previousElementSibling
      return node?.id
    })
    expect(followsContinueHeading).toBe('continue-a-shared-chat')
  })
})
