import { test, expect } from '@playwright/test'

const companies = [
  'ClickHouse',
  'NASA',
  'BeiGene',
  'Shopify',
  'Stripe',
  'Daimler Truck',
  'Boston University',
  'UC Berkeley',
  'Harvard University',
  'Strategy',
  'SIXT',
  'Opendoor',
  'UMass Amherst',
  'Hinge Health',
  'Stanford University',
  'Université de Montréal',
  'Coinbase',
  'TDK',
  'cBioPortal',
  'Lennar',
  'Tekion',
  'Visa',
]

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads all community logos once for assistive technology in ${colorScheme} mode`, async ({
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
}

test('pauses on hover without displaying playback controls', async ({ page }) => {
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

test('the repeated row joins without a gap or a jump at the loop boundary', async ({ page }) => {
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

test('reduced motion exposes every logo in a static mobile layout', async ({ page }) => {
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
