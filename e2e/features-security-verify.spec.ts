import { expect, test, type Page } from '@playwright/test'

const FEATURE_PAGES = [
  'authentication',
  'access_control',
  'admin_panel',
  'insights',
  'password_reset',
  'mod_system',
].map((slug) => `/docs/features/${slug}`)

const CONFIG_PAGES = [
  '/docs/configuration/authentication',
  '/docs/configuration/authentication/email',
  '/docs/configuration/mod_system',
  '/docs/configuration/librechat_yaml/object_structure/registration',
]

/** Top-level librechat.yaml keys and KEY=value lines: setup that belongs on a config page. */
const YAML_CONFIG = /^\s*(version|endpoints|interface|registration|balance|rateLimits):\s*$/m
const ENV_ASSIGNMENT = /^\s*[A-Z][A-Z0-9_]{2,}=/m

async function internalLinks(page: Page): Promise<string[]> {
  return page
    .locator('#nd-page a[href^="/docs/"], #nd-page a[href^="#"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
}

test.describe('Security feature pages', () => {
  test('@scenario:security-feature-pages-render-in-both-themes every security page and its config page renders with loading screenshots in light and dark', async ({
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

  test('@scenario:security-setup-lives-in-configuration each security feature page ends with a Setup section that links to configuration and carries no config blocks', async ({
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

      for (const block of await page.locator('#nd-page pre').allInnerTexts()) {
        expect(block, `${path} has a librechat.yaml block`).not.toMatch(YAML_CONFIG)
        expect(block, `${path} has a .env block`).not.toMatch(ENV_ASSIGNMENT)
      }
    }
  })

  test('@scenario:security-internal-links-resolve every internal link and anchor on the security pages reaches its target', async ({
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

  test('@scenario:access-control-describes-one-role-per-user a reader learns that each user holds exactly one role', async ({
    page,
  }) => {
    await page.goto('/docs/features/access_control')
    const main = page.locator('#nd-page')
    await expect(main).toContainText('Every user has exactly one role')
    await expect(main).not.toContainText(/union of (their|the) (roles|permissions)/i)
  })

  test('@scenario:admin-panel-session-secret-required the admin panel pages say the panel will not start without a session secret', async ({
    page,
  }) => {
    await page.goto('/docs/configuration/admin_panel')
    await expect(page.locator('#nd-page')).toContainText(
      'The panel refuses to start without a session secret',
    )
    await expect(page.locator('#nd-page')).not.toContainText(/falls? back to CREDS_KEY/i)

    await page.goto('/docs/features/admin_panel')
    await expect(page.locator('#nd-page')).toContainText('ADMIN_PANEL_SESSION_SECRET')
  })

  test('@scenario:bans-stored-in-mongodb moderation pages tell admins where bans live and how to lift one', async ({
    page,
  }) => {
    await page.goto('/docs/features/mod_system')
    await expect(page.locator('#nd-page')).toContainText(
      'removes its entry from the logs collection in MongoDB',
    )
    await page.goto('/docs/configuration/mod_system')
    await expect(page.locator('#nd-page')).toContainText(
      'Bans are stored in the logs collection in MongoDB',
    )
  })
})
