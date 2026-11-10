import { test, expect } from '@playwright/test'

const PAGE = '/docs/user_guides/ai_overview'

test.describe('AI Overview search guidance', () => {
  test('@scenario:ai-overview-web-search-explained web search names the composer, agents and both required services', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    const heading = main.locator('h2[id="searching"]')
    await expect(heading).toBeVisible()
    await expect(heading).toHaveText('Searching')
    await expect(main).toContainText('open the + palette in the message composer')
    await expect(main).toContainText('enable the Web Search capability in the Agent Builder')
    await expect(main).toContainText('needs both a search provider and a scraper')
  })

  test('@scenario:ai-overview-search-links-resolve the composer, missing-option and message search links reach their targets', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const composer = page
      .locator('main')
      .getByRole('link', { name: 'message composer', exact: true })
    await expect(composer).toHaveAttribute('href', /\/docs\/features\/composer$/)

    const missing = page
      .locator('main')
      .getByRole('link', { name: 'Web Search option is not visible', exact: true })
    await expect(missing).toHaveAttribute(
      'href',
      /\/docs\/features\/web_search#web-search-option-is-not-visible$/,
    )
    await missing.click()
    await expect(page.locator('[id="web-search-option-is-not-visible"]')).toHaveCount(1)

    await page.goto(PAGE)
    const messageSearch = page
      .locator('main')
      .getByRole('link', { name: 'Message Search', exact: true })
    await expect(messageSearch).toHaveAttribute('href', /\/docs\/features\/search$/)
    await messageSearch.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Message Search' })).toBeVisible()
  })

  test('@scenario:ai-overview-file-search-explained file search names the composer, agents and the RAG API it relies on', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    await expect(main).toContainText('In a regular chat, select File Search from the + palette')
    await expect(main).toContainText('enable the File Search capability in the Agent Builder')
    await expect(main).toContainText('using the RAG API, which your admin deploys')
    const rag = main.getByRole('link', { name: 'RAG API (Chat with Files)', exact: true })
    await expect(rag).toHaveAttribute('href', /\/docs\/features\/rag_api$/)
    await rag.click()
    await expect(page).toHaveURL(/\/docs\/features\/rag_api$/)
  })

  test('@scenario:ai-overview-missing-search-option-explained a reader missing Web Search or File Search learns the capability and role gates and where to look', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    await expect(main).toContainText(
      'which includes turning on the web_search or file_search agent capability and giving your role the matching permission',
    )
    const setting = main.getByRole('link', { name: 'fileSearch interface setting', exact: true })
    await expect(setting).toHaveAttribute(
      'href',
      /\/docs\/configuration\/librechat_yaml\/object_structure\/interface#filesearch$/,
    )
    await setting.click()
    await expect(page.locator('[id="filesearch"]')).toHaveCount(1)
  })

  test('@scenario:ai-overview-conversation-search-explained conversation search points to the sidebar and its Meilisearch condition', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    await expect(main).toContainText('Use the search box in the sidebar to find past messages')
    await expect(main).toContainText('It appears only when the admin has enabled Meilisearch')
  })
})
