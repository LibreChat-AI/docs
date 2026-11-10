import { test, expect } from '@playwright/test'
import { getUI } from '../lib/ui-i18n'

const companies = [
  'Tekion',
  'cBioPortal',
  'NASA',
  'Visa',
  'Harvard University',
  'Stanford University',
  'Stripe',
  'Shopify',
  'Coinbase',
  'UC Berkeley',
  'Daimler Truck',
  'TDK',
  'ClickHouse',
  'SIXT',
  'Lennar',
  'Strategy',
  'Boston University',
  'UMass Amherst',
  'Université de Montréal',
  'BeiGene',
  'Opendoor',
  'Hinge Health',
]

for (const colorScheme of ['light', 'dark'] as const) {
  test(`@scenario:company-assets-${colorScheme} loads all community logos once for assistive technology in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
    await page.goto('/')
    const section = page.getByRole('region', { name: 'Trusted by companies worldwide' })
    await section.scrollIntoViewIfNeeded()
    const logos = section.getByRole('img')
    await expect(logos).toHaveCount(companies.length)
    expect(
      await logos.evaluateAll((images) => images.map((image) => image.getAttribute('alt'))),
    ).toEqual(companies.map((name) => `${name} logo`))
    await expect(async () => {
      expect(
        await logos.evaluateAll((images) =>
          images.every((image) => {
            const bounds = image.getBoundingClientRect()
            return (
              (image as HTMLImageElement).naturalWidth > 0 &&
              bounds.width > 20 &&
              bounds.width <= 225 &&
              bounds.height > 12
            )
          }),
        ),
      ).toBe(true)
    }).toPass()
    expect(
      await logos.evaluateAll(
        (images, theme) =>
          images.every(
            (image) =>
              image.getAttribute('src')?.includes(`_${theme}`) ||
              image.getAttribute('src')?.includes(theme === 'light' ? 'Slate' : 'White') ||
              image.getAttribute('src')?.includes('NASA.svg') ||
              image.getAttribute('src')?.includes('Stanford.svg') ||
              image.getAttribute('src')?.includes('Tekion.svg') ||
              image.getAttribute('src')?.includes('cBioPortal.svg'),
          ),
        colorScheme,
      ),
    ).toBe(true)
  })

  test(`@scenario:company-hover-boundary-${colorScheme} logos highlight before, across, and after the loop boundary in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
    await page.goto('/')
    const section = page.getByRole('region', { name: 'Trusted by companies worldwide' })
    await section.scrollIntoViewIfNeeded()
    const tracks = section.locator('.marquee-track')

    for (const trackIndex of [0, 1, 0]) {
      await page.mouse.move(0, 0)
      await tracks.evaluateAll((elements, visibleTrack) => {
        const container = elements[0].parentElement!
        const gap = parseFloat(getComputedStyle(container).columnGap)
        const distance = elements[0].getBoundingClientRect().width + gap
        const progress =
          visibleTrack === 0 ? 0 : 1 - container.getBoundingClientRect().width / 3 / distance
        for (const element of elements) {
          const animation = element.getAnimations()[0]
          animation.pause()
          animation.currentTime = Number(animation.effect!.getComputedTiming().duration) * progress
        }
      }, trackIndex)

      for (const name of ['NASA', 'Visa']) {
        const logo = tracks.nth(trackIndex).locator(`img[alt="${name} logo"]:visible`)
        const bounds = await logo.boundingBox()
        expect(bounds).not.toBeNull()
        await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
        await expect(logo, `${name} in track ${trackIndex} responds to hover`).toHaveCSS(
          'opacity',
          '1',
          { timeout: 2000 },
        )
        await page.mouse.move(0, 0)
        await expect(logo).toHaveCSS('opacity', '0.6')
      }
    }
    await expect(section.getByRole('img')).toHaveCount(companies.length)
  })
}

test('@scenario:company-pause-hover pauses on hover without displaying playback controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const section = page.getByRole('region', { name: 'Trusted by companies worldwide' })
  const track = section.locator('.marquee-track').first()
  await expect(section.getByRole('button')).toHaveCount(0)
  await expect(track).toHaveCSS('animation-play-state', 'running')
  await section.locator('.marquee').hover()
  await expect(track).toHaveCSS('animation-play-state', 'paused')
  await page.mouse.move(0, 0)
  await expect(track).toHaveCSS('animation-play-state', 'running')
})

test('@scenario:company-continuous-loop the repeated row joins without a gap or a jump at the loop boundary', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const tracks = page.locator('.landing-trust .marquee-track')
  await expect(tracks).toHaveCount(2)
  const positions = await tracks.evaluateAll((elements) => {
    const animations = elements.map((element) => element.getAnimations()[0])
    for (const animation of animations) {
      animation.pause()
      animation.currentTime = 0
    }
    const start = elements[0].getBoundingClientRect().left
    const { width } = elements[0].getBoundingClientRect()
    const containerWidth = elements[0].parentElement!.getBoundingClientRect().width
    for (const animation of animations) {
      animation.currentTime = Number(animation.effect!.getComputedTiming().duration) - 1
    }
    return { start, end: elements[1].getBoundingClientRect().left, width, containerWidth }
  })
  expect(positions.width).toBeGreaterThanOrEqual(positions.containerWidth)
  expect(Math.abs(positions.end - positions.start)).toBeLessThan(1)
})

test('@scenario:company-reduced-motion-mobile reduced motion exposes every logo in a static mobile layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = page.getByRole('region', { name: 'Trusted by companies worldwide' })
  await expect(section.getByRole('img')).toHaveCount(companies.length)
  await expect(section.locator('.marquee-track').first()).toHaveCSS('animation-name', 'none')
  await expect(section.locator('.marquee-track').last()).toBeHidden()
  await expect(section.locator('.marquee')).toHaveCSS('mask-image', 'none')
  await expect(section.getByRole('button')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(
    await section.getByRole('img').evaluateAll((images) =>
      images.every((image) => {
        const bounds = image.getBoundingClientRect()
        return bounds.left >= 0 && bounds.right <= window.innerWidth
      }),
    ),
  ).toBe(true)
})

test('@scenario:company-localized-section the localized homepage exposes every company in the same order', async ({
  page,
}) => {
  await page.goto('/de')
  const section = page.getByRole('region', { name: getUI('de').home.trustedBy })
  await expect(section.getByRole('img')).toHaveCount(companies.length)
  expect(
    await section
      .getByRole('img')
      .evaluateAll((images) => images.map((image) => image.getAttribute('alt'))),
  ).toEqual(companies.map((name) => `${name} logo`))
})

test('@scenario:company-keyboard-pause keyboard focus pauses the company logos without adding controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const section = page.getByRole('region', { name: 'Trusted by companies worldwide' })
  await section.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(section).toBeFocused()
  await expect(section).toHaveCSS('outline-style', 'solid')
  await expect(section).toHaveCSS('outline-width', '2px')
  for (const track of await section.locator('.marquee-track').all()) {
    await expect(track).toHaveCSS('animation-play-state', 'paused')
  }
  await expect(section.getByRole('button')).toHaveCount(0)
  await page.keyboard.press('Tab')
  for (const track of await section.locator('.marquee-track').all()) {
    await expect(track).toHaveCSS('animation-play-state', 'running')
  }
})
