import { expect, test, type Page } from '@playwright/test'

const FEATURE_PAGES = [
  'mcp',
  'agents',
  'scheduled_chats',
  'skills',
  'agent_plugins',
  'subagents',
  'agents_api',
  'artifacts',
  'code_interpreter',
  'pull_requests',
  'image_gen',
].map((slug) => `/docs/features/${slug}`)

const CONFIG_PAGES = [
  '/docs/configuration/artifacts',
  '/docs/configuration/pull_requests',
  '/docs/configuration/scheduled_chats',
  '/docs/configuration/agent_plugins',
  '/docs/configuration/access_control',
  '/docs/configuration/admin_panel',
  '/docs/configuration/tools/code_interpreter',
  '/docs/configuration/tools/openai_image_gen',
]

/** Top-level librechat.yaml keys and KEY=value lines: setup that belongs on a config page. */
const YAML_CONFIG =
  /^\s*(version|endpoints|interface|mcpServers|fileConfig|webSearch|memory|registration|skillSync|ocr|speech|balance):\s*$/m
const ENV_ASSIGNMENT = /^\s*[A-Z][A-Z0-9_]{2,}=/m

async function internalLinks(page: Page): Promise<string[]> {
  return page
    .locator('#nd-page a[href^="/docs/"], #nd-page a[href^="#"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
}

async function expectTargetExists(page: Page, from: string, href: string) {
  const [path, anchor] = href.startsWith('#') ? [from, href.slice(1)] : href.split('#')
  const response = await page.goto(path)
  expect(response?.status(), `${from} links to ${path}`).toBeLessThan(400)
  if (anchor) {
    await expect(
      page.locator(`[id="${decodeURIComponent(anchor)}"]`),
      `${from} links to ${href}`,
    ).toHaveCount(1)
  }
}

test.describe('Agentic feature pages', () => {
  test('@scenario:agentic-feature-pages-render-in-both-themes every agentic page and its config page renders with loading screenshots in light and dark', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      for (const path of [...FEATURE_PAGES, ...CONFIG_PAGES]) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        const images = page.locator(`#nd-page .image-${colorScheme}-theme img`)
        for (const image of await images.all()) {
          await image.scrollIntoViewIfNeeded()
          await expect(image, `${path} ${colorScheme}`).toHaveAttribute(
            'src',
            new RegExp(`-${colorScheme}\\.png$`),
          )
          await expect
            .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0)
        }
      }
    }
  })

  test('@scenario:agentic-setup-lives-in-configuration each feature page ends with a Setup section that links to configuration and carries no config blocks', async ({
    page,
  }) => {
    for (const path of FEATURE_PAGES) {
      await page.goto(path)
      const setup = page.locator('#nd-page h2').filter({ hasText: /^Setup$/ })
      await expect(setup, path).toHaveCount(1)
      const setupLinks = await setup.evaluate((heading) => {
        const hrefs: string[] = []
        for (let node = heading.nextElementSibling; node; node = node.nextElementSibling) {
          if (node.tagName === 'H2') break
          for (const a of node.querySelectorAll('a[href]')) hrefs.push(a.getAttribute('href') ?? '')
        }
        return hrefs
      })
      expect(
        setupLinks.some((href) => href.startsWith('/docs/configuration')),
        `${path} Setup links to configuration`,
      ).toBe(true)

      const blocks = await page.locator('#nd-page pre').allInnerTexts()
      for (const block of blocks) {
        expect(block, `${path} has a librechat.yaml block`).not.toMatch(YAML_CONFIG)
        expect(block, `${path} has a .env block`).not.toMatch(ENV_ASSIGNMENT)
      }
    }
  })

  test('@scenario:agentic-config-pages-listed-in-sidebar the new configuration pages appear in the English and a translated Configuration sidebar', async ({
    page,
  }) => {
    for (const prefix of ['', '/de']) {
      await page.goto(`${prefix}/docs/configuration`)
      const sidebar = page.locator('#nd-sidebar')
      for (const path of CONFIG_PAGES.filter((p) => !p.includes('/tools/'))) {
        await expect(
          sidebar.locator(`a[href="${prefix}${path}"], a[href="${path}"]`),
          `${prefix || 'en'} sidebar lists ${path}`,
        ).not.toHaveCount(0)
      }
    }
  })

  test('@scenario:agentic-internal-links-resolve every internal link and anchor on the agentic pages reaches its target', async ({
    page,
  }) => {
    test.setTimeout(300_000)
    const targets = new Map<string, string>()
    for (const path of [...FEATURE_PAGES, ...CONFIG_PAGES]) {
      await page.goto(path)
      for (const href of await internalLinks(page)) {
        const absolute = href.startsWith('#') ? `${path}${href}` : href
        if (!targets.has(absolute)) targets.set(absolute, path)
      }
    }
    expect(targets.size).toBeGreaterThan(0)
    for (const [href, from] of targets) await expectTargetExists(page, from, href)
  })

  test('@scenario:custom-artifact-mode-syntax-documented the Artifacts page shows the wrapper and the types a Custom-mode agent must use', async ({
    page,
  }) => {
    await page.goto('/docs/features/artifacts')
    const example = page.locator('#nd-page pre').filter({ hasText: ':::artifact{identifier=' })
    await expect(example).toHaveCount(1)
    for (const type of [
      'text/html',
      'application/vnd.react',
      'image/svg+xml',
      'application/vnd.mermaid',
      'text/markdown',
    ]) {
      await expect(page.locator('#nd-page')).toContainText(type)
    }
  })

  test('@scenario:standalone-admin-panel-separates-browser-and-server-urls the standalone example sends the browser to a host it can reach', async ({
    page,
  }) => {
    await page.goto('/docs/configuration/admin_panel')
    const example = page.locator('#nd-page pre').filter({ hasText: 'docker run' })
    await expect(example).toContainText('VITE_API_BASE_URL=http://localhost:3080')
    await expect(example).toContainText('API_SERVER_URL=http://host.docker.internal:3080')
    await expect(example).not.toContainText('VITE_API_BASE_URL=http://host.docker.internal')
  })

  test('@scenario:moved-anchors-retargeted links from other pages to sections this change moved reach the new sections', async ({
    page,
  }) => {
    const sources = [
      '/docs/configuration/librechat_yaml/object_structure/interface',
      '/docs/configuration/librechat_yaml/object_structure/model_specs',
      '/docs/configuration/redis',
      '/docs/features/web_search',
      '/docs/features/import_convos',
      '/docs/features/access_control',
    ]
    const moved =
      /\/docs\/(features\/(agents|scheduled_chats|mcp|code_interpreter|image_gen|pull_requests)|configuration\/(access_control|admin_panel|scheduled_chats|pull_requests))(#|$)/
    let checked = 0
    for (const source of sources) {
      await page.goto(source)
      const hrefs = (await internalLinks(page)).filter((href) => moved.test(href))
      for (const href of hrefs) {
        await expectTargetExists(page, source, href)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})
