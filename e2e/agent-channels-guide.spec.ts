import { expect, test, type Page } from '@playwright/test'

const ROOT = '/docs/features/agent_channels'
const PAGES = [
  '',
  '/how_it_works',
  '/security',
  '/rich_messages',
  '/slack',
  '/slack/organization_setup',
  '/slack/manual_setup',
  '/slack/assign_agents',
  '/slack/using_slack',
  '/slack/troubleshooting',
  '/deployment',
  '/deployment/kubernetes',
  '/deployment/reference',
].map((path) => `${ROOT}${path}`)

function body(page: Page) {
  return page.locator('#nd-page')
}

async function internalLinks(page: Page): Promise<string[]> {
  return body(page)
    .locator('a[href^="/docs/"], a[href^="#"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
}

test.describe('Agent Channels guide', () => {
  test('@scenario:agent-channels-sidebar-lists-every-page the section groups shared pages, Slack and deployment in the sidebar', async ({
    page,
  }) => {
    // Nested folders open when one of their pages is active, so check each page from itself.
    for (const path of PAGES) {
      await page.goto(path)
      await expect(page.locator(`#nd-sidebar a[href="${path}"]`), path).toHaveCount(1)
    }
  })

  test('@scenario:agent-channels-screenshots-follow-the-reader-theme every screenshot loads and shows the variant for the active theme', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      for (const path of PAGES) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        const other = colorScheme === 'dark' ? 'light' : 'dark'
        // Screenshots inside an inactive tab are hidden until the tab is chosen.
        const outsideInactiveTabs = ':not([role="tabpanel"][data-state="inactive"] *)'
        const shown = body(page).locator(`.image-${colorScheme}-theme img${outsideInactiveTabs}`)
        const hidden = body(page).locator(`.image-${other}-theme img${outsideInactiveTabs}`)
        await expect(hidden).toHaveCount(await shown.count())
        for (const image of await shown.all()) {
          await image.scrollIntoViewIfNeeded()
          await expect(image).toBeVisible()
          await expect(image).toHaveAttribute('src', new RegExp(`-${colorScheme}\\.png$`))
          await expect(image).toHaveAttribute('alt', /\S/)
          await expect
            .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0)
        }
        for (const image of await hidden.all()) await expect(image).toBeHidden()
      }
    }
  })

  test('@scenario:agent-channels-links-resolve every internal link and anchor in the section resolves', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const targets = new Map<string, string>()
    for (const path of PAGES) {
      await page.goto(path)
      for (const href of await internalLinks(page)) {
        targets.set(href.startsWith('#') ? `${path}${href}` : href, path)
      }
    }
    for (const [href, from] of targets) {
      const [path, anchor] = href.split('#')
      const response = await page.goto(path)
      expect(response?.status(), `${from} links to ${path}`).toBeLessThan(400)
      if (anchor) {
        await expect(
          page.locator(`[id="${decodeURIComponent(anchor)}"]`),
          `${from} links to ${href}`,
        ).toHaveCount(1)
      }
    }
  })

  test('@scenario:agent-channels-diagrams-are-labelled flow diagrams expose their steps as a named list', async ({
    page,
  }) => {
    await page.goto(ROOT)
    const flow = body(page).getByRole('list', { name: /travels from Slack/ })
    await expect(flow.getByRole('listitem')).toHaveCount(4)
    await expect(flow).toContainText('Channel gateway')
  })

  test('@scenario:agent-channels-old-gateway-urls-redirect the former configuration pages redirect into the section', async ({
    page,
  }) => {
    await page.goto('/docs/configuration/channel_gateway')
    await expect(page).toHaveURL(new RegExp(`${ROOT}/deployment$`))
    await page.goto('/docs/configuration/channel_gateway_reference')
    await expect(page).toHaveURL(new RegExp(`${ROOT}/deployment/reference$`))
  })
})
