import { test, expect } from '@playwright/test'
import { getUI } from '../lib/ui-i18n'
import customEndpoints from '../content/docs/configuration/librechat_yaml/ai_endpoints/meta.json'

const providerIds = ['openai', 'anthropic', 'google', 'bedrock', ...customEndpoints.pages].sort()

const featurePaths = [
  '/docs/features/agents',
  '/docs/features/code_interpreter',
  '/docs/configuration/pre_configured_ai',
  '/docs/features/artifacts',
  '/docs/features/projects',
  '/docs/features/skills',
  '/docs/features/subagents',
  '/docs/features/search',
  '/docs/features/mcp',
  '/docs/features/memory',
  '/docs/features/web_search',
  '/docs/configuration/authentication',
]

for (const locale of ['en', 'de', 'ja']) {
  test(`@scenario:mobile-landing-readable-localized keeps the mobile landing page readable and links localized in ${locale}`, async ({
    page,
  }) => {
    const t = getUI(locale).home
    const prefix = locale === 'en' ? '' : `/${locale}`
    await page.setViewportSize({ width: 320, height: 844 })
    await page.emulateMedia({ colorScheme: locale === 'de' ? 'light' : 'dark' })
    await page.goto(prefix || '/')
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: t.getStartedAria, exact: true })).toHaveAttribute(
      'href',
      `${prefix}/docs`,
    )
    await expect(page.getByRole('link', { name: t.tryDemoAria, exact: true })).toHaveAttribute(
      'href',
      'https://chat.librechat.ai',
    )
    const links = page.locator('.landing-features a')
    await expect(links).toHaveCount(featurePaths.length)
    expect(
      await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')).sort()),
    ).toEqual(featurePaths.map((path) => `${prefix}${path}`).sort())

    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const marquee = page.locator('.landing-provider-marquees')
    await expect(marquee.getByRole('list')).toHaveCount(2)
    const providers = marquee.getByRole('listitem')
    await expect(providers).toHaveCount(providerIds.length)
    expect(
      await providers.evaluateAll((items) =>
        items.map((item) => item.getAttribute('data-provider')).sort(),
      ),
    ).toEqual(providerIds)
    expect(
      await providers.evaluateAll((items) =>
        items.every((item) => {
          const icon = item.querySelector('svg')
          return icon && icon.getBoundingClientRect().width >= 20 && item.textContent?.trim()
        }),
      ),
    ).toBe(true)
  })
}

test('@scenario:provider-animation-pauses-and-loops provider rows loop in opposite directions and pause for hover and keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const marquee = page.locator('.landing-provider-marquees')
  const rows = marquee.locator('.landing-provider-marquee')
  const tracks = marquee.locator('.marquee-track')
  await expect(rows).toHaveCount(2)
  await expect(tracks).toHaveCount(4)
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS('animation-play-state', 'running')
  }
  await marquee.hover()
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS('animation-play-state', 'paused')
  }
  await page.mouse.move(0, 0)
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS('animation-play-state', 'running')
  }
  await page.getByRole('link', { name: 'Learn more: Models', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(marquee).toBeFocused()
  await expect(marquee).toHaveCSS('outline-style', 'solid')
  for (const track of await tracks.all()) {
    await expect(track).toHaveCSS('animation-play-state', 'paused')
  }

  for (const [index, row] of (await rows.all()).entries()) {
    const rowTracks = row.locator('.marquee-track')
    await expect(rowTracks.last()).toHaveAttribute('aria-hidden', 'true')
    await expect(rowTracks.first()).toHaveCSS(
      'animation-direction',
      index === 0 ? 'normal' : 'reverse',
    )
    const positions = await rowTracks.evaluateAll((elements, reversed) => {
      const animations = elements.map((element) => element.getAnimations()[0])
      for (const animation of animations) {
        animation.pause()
        animation.currentTime = 0
      }
      const start = elements[reversed ? 1 : 0].getBoundingClientRect().left
      const { width } = elements[0].getBoundingClientRect()
      const containerWidth = elements[0].parentElement!.getBoundingClientRect().width
      for (const animation of animations) {
        animation.currentTime = Number(animation.effect!.getComputedTiming().duration) - 1
      }
      return {
        start,
        end: elements[reversed ? 0 : 1].getBoundingClientRect().left,
        width,
        containerWidth,
      }
    }, index === 1)
    expect(positions.width).toBeGreaterThanOrEqual(positions.containerWidth)
    expect(Math.abs(positions.end - positions.start)).toBeLessThan(1)
  }
})

test('@scenario:provider-viewports provider rows span standard and ultrawide viewports', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  for (const width of [320, 1440, 3440]) {
    await page.setViewportSize({ width, height: 900 })
    const bounds = await page.locator('.landing-feature-visual-models').evaluate((element) => {
      const { left, right } = element.getBoundingClientRect()
      return { left, right, viewport: document.documentElement.clientWidth }
    })
    expect(Math.abs(bounds.left)).toBeLessThan(1)
    expect(Math.abs(bounds.right - bounds.viewport)).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('@scenario:reduced-motion-providers-visible reduced motion shows every provider without clipping on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const marquee = page.locator('.landing-provider-marquees')
  await expect(marquee.getByRole('listitem')).toHaveCount(providerIds.length)
  for (const row of await marquee.locator('.landing-provider-marquee').all()) {
    await expect(row.locator('.marquee-track').first()).toHaveCSS('animation-name', 'none')
    await expect(row.locator('.marquee-track').last()).toBeHidden()
    await expect(row).toHaveCSS('mask-image', 'none')
  }
  expect(
    await marquee.getByRole('listitem').evaluateAll((items) =>
      items.every((item) => {
        const bounds = item.getBoundingClientRect()
        return bounds.left >= 0 && bounds.right <= window.innerWidth
      }),
    ),
  ).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('@scenario:mobile-navigation-search-banner-usable mobile navigation, search, and banner dismissal remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Reject non-essential' }).click()
  const banner = page.locator('#clickhouse-agentic-data-stack')
  await expect(banner).toBeVisible()
  const text = await banner.locator('p').boundingBox()
  const close = banner.getByRole('button', { name: 'Close Banner' })
  const button = await close.boundingBox()
  expect(text!.x + text!.width).toBeLessThanOrEqual(button!.x)
  expect(text!.height).toBeLessThanOrEqual((await banner.boundingBox())!.height)

  const header = page.locator('#nd-nav')
  const menu = header.getByRole('button', { name: 'Toggle Menu' })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(header.getByRole('link', { name: 'Docs', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveAttribute('aria-expanded', 'false')

  await header.getByRole('button', { name: 'Open Search' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await close.click()
  await expect(banner).toBeHidden()
  await expect(header).toHaveCSS('top', '0px')
  await page.reload()
  await expect(banner).toBeHidden()
  await expect(header).toHaveCSS('top', '0px')
})

test('@scenario:keyboard-focus-visible primary actions and feature links have visible keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const t = getUI('en').home
  await page.getByRole('link', { name: t.getStartedAria, exact: true }).focus()
  await page.keyboard.press('Tab')
  const demo = page.getByRole('link', { name: t.tryDemoAria, exact: true })
  await expect(demo).toBeFocused()
  await expect(demo).toHaveCSS('outline-style', 'solid')
  await expect(demo).toHaveCSS('outline-width', '2px')

  await page.keyboard.press('Tab')
  const companies = page.getByRole('region', { name: t.trustedBy })
  await expect(companies).toBeFocused()
  await expect(companies).toHaveCSS('outline-style', 'solid')
  await expect(companies).toHaveCSS('outline-width', '2px')
  for (const track of await companies.locator('.marquee-track').all()) {
    await expect(track).toHaveCSS('animation-play-state', 'paused')
  }

  await page.keyboard.press('Tab')
  const agents = page.getByRole('link', { name: 'Learn more: Agents', exact: true })
  await expect(agents).toBeFocused()
  await expect(agents).toHaveCSS('outline-style', 'solid')
  await expect(agents).toHaveCSS('outline-width', '2px')
  for (const track of await companies.locator('.marquee-track').all()) {
    await expect(track).toHaveCSS('animation-play-state', 'running')
  }
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`@scenario:landing-themed-previews-branding-community product previews and original branding remain visible in ${colorScheme} mode`, async ({
    page,
  }) => {
    const t = getUI('en').home
    await page.emulateMedia({ colorScheme })
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/')
      const brand = page.locator('#nd-nav').getByRole('link', { name: 'LibreChat', exact: true })
      await expect(brand).toBeVisible()
      await expect(brand.locator('img')).toHaveAttribute('src', '/librechat.svg')
      const hero = page.locator('.landing-product-preview img:visible')
      await expect(hero).toHaveCount(1)
      const heroAlt =
        width < 768
          ? colorScheme === 'dark'
            ? t.mobileDarkAlt
            : t.mobileLightAlt
          : colorScheme === 'dark'
            ? t.desktopDarkAlt
            : t.desktopLightAlt
      await expect(hero).toHaveAttribute('alt', heroAlt)
      await expect(hero).toHaveAttribute(
        'src',
        new RegExp(`demo_${width < 768 ? 'mobile_' : ''}${colorScheme}`),
      )
      for (const preview of [
        hero,
        page.locator('.landing-feature-visual-agents img:visible'),
        page.locator('.landing-feature-visual-artifacts img:visible'),
      ]) {
        await preview.scrollIntoViewIfNeeded()
        await expect(preview).toBeVisible()
        await expect(preview).toHaveAttribute('src', new RegExp(colorScheme))
        await expect(async () => {
          expect(
            await preview.evaluate(
              (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
            ),
          ).toBe(true)
        }).toPass()
      }
      const discord = page
        .locator('.landing-community-links')
        .getByRole('link', { name: t.discordAria, exact: true })
      await expect(discord).toHaveAttribute('href', 'https://discord.librechat.ai')
      await expect(discord).toHaveAttribute('target', '_blank')
      await expect(discord).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(discord.locator('svg').first()).toBeVisible()
    }
  })
}
