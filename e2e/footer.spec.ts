import { test, expect } from '@playwright/test'
import { getUI } from '../lib/ui-i18n'

const destinations = [
  ['about', '/about'],
  ['contactUs', '/about#contact-us'],
  ['features', '/docs/features'],
  ['changelog', '/changelog'],
  ['roadmap', '/blog/2026-02-18_2026_roadmap'],
  ['demo', 'https://chat.librechat.ai/'],
  ['status', 'https://status.librechat.ai/'],
  ['getStarted', '/docs'],
  ['localInstall', '/docs/local'],
  ['remoteInstall', '/docs/remote'],
  ['blog', '/blog'],
  ['blogAuthors', '/authors'],
  ['subscribe', '/subscribe'],
  ['unsubscribe', '/unsubscribe'],
  ['termsOfService', '/tos'],
  ['privacyPolicy', '/privacy'],
  ['cookiePolicy', '/cookie'],
] as const

test('@scenario:footer-localized-navigation footer links retain their destinations and locale on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  for (const locale of ['en', 'de', 'ja']) {
    const prefix = locale === 'en' ? '' : `/${locale}`
    const ui = getUI(locale)
    await page.goto(prefix || '/', { waitUntil: 'domcontentloaded' })
    const footer = page.getByRole('contentinfo')
    await expect(footer).toHaveCount(1)
    await expect(footer.getByRole('heading', { level: 2 })).toHaveText(ui.home.ctaHeading)
    await expect(
      footer.getByRole('link', { name: ui.home.quickstartAria, exact: true }),
    ).toHaveAttribute('href', `${prefix}/docs`)
    const navigation = footer.getByRole('navigation', { name: 'Footer', exact: true })
    await expect(navigation.getByRole('heading')).toHaveCount(6)
    await expect(navigation.getByRole('link')).toHaveCount(destinations.length)
    for (const [key, href] of destinations) {
      await expect(
        navigation.getByRole('link', { name: ui.footer.items[key], exact: true }),
      ).toHaveAttribute('href', href.startsWith('/docs') ? `${prefix}${href}` : href)
    }
    await page.evaluate(() => document.fonts.ready)
    expect(
      await footer.getByRole('link').evaluateAll((links) =>
        links.every((link) => {
          const bounds = link.getBoundingClientRect()
          return bounds.left >= 0 && bounds.right <= innerWidth
        }),
      ),
    ).toBe(true)
  }
})

test('@scenario:footer-branding-shared-layout original branding fits the shared footer in both themes', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/about']) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        const footer = page.getByRole('contentinfo')
        await expect(footer).toHaveCount(1)
        const wordmark = footer.locator('.footer-wordmark')
        await expect(wordmark).toHaveText('LibreChat')
        await expect(wordmark).toHaveCSS('text-transform', 'none')
        await expect(footer.locator('.footer-wordmark-wrap')).toHaveAttribute('aria-hidden', 'true')
        await page.evaluate(() => document.fonts.ready)
        expect(
          await wordmark.evaluate((element) => {
            const range = document.createRange()
            range.selectNodeContents(element)
            const text = range.getBoundingClientRect()
            const frame = element.parentElement!.getBoundingClientRect()
            return (
              text.width > 0 &&
              text.left >= frame.left - 1 &&
              text.right <= frame.right + 1 &&
              frame.left >= 0 &&
              frame.right <= innerWidth
            )
          }),
        ).toBe(true)
        const social = footer.getByRole('navigation', { name: 'Social media', exact: true })
        await expect(social.getByRole('link')).toHaveCount(6)
        for (const name of ['GitHub', 'Discord', 'LinkedIn', 'X', 'YouTube', 'Email']) {
          await expect(social.getByRole('link', { name, exact: true })).toBeVisible()
        }
      }
    }
  }
})

test('@scenario:footer-keyboard-navigation footer links show keyboard focus and navigate to About', async ({
  page,
}) => {
  const ui = getUI('en')
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const footer = page.getByRole('contentinfo')
  const cta = footer.getByRole('link', { name: ui.home.quickstartAria, exact: true })
  await cta.focus()
  await expect(cta).toHaveCSS('outline-style', 'solid')
  await expect(cta).toHaveCSS('outline-width', '2px')
  await page.keyboard.press('Tab')
  const about = footer
    .getByRole('navigation', { name: 'Footer', exact: true })
    .getByRole('link', { name: ui.footer.items.about, exact: true })
  await expect(about).toBeFocused()
  await expect(about).toHaveCSS('outline-style', 'solid')
  await expect(about).toHaveCSS('outline-width', '2px')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const github = page
    .getByRole('contentinfo')
    .getByRole('navigation', { name: 'Social media', exact: true })
    .getByRole('link', { name: 'GitHub', exact: true })
  await github.focus()
  await expect(github).toHaveCSS('outline-style', 'solid')
  await expect(github).toHaveCSS('outline-width', '2px')
})
