import { expect, test, type Page } from '@playwright/test'

const GUIDE = '/docs/features/pull_requests'
const AGENTS = '/docs/configuration/librechat_yaml/object_structure/agents'
const DOTENV = '/docs/configuration/dotenv'
const SETUP = '/docs/configuration/pull_requests'

function body(page: Page) {
  return page.locator('#nd-page')
}

/** A heading by its own text; its accessible name also carries the "Copy Anchor Link" button. */
function heading(page: Page, text: string, level: 2 | 3) {
  const escaped = text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return body(page)
    .locator(`h${level}`)
    .filter({ hasText: new RegExp(`^${escaped}$`) })
}

/** The section between a heading and the next heading of the same level, as text. */
async function sectionText(page: Page, text: string, level: 2 | 3) {
  return heading(page, text, level).evaluate((start, tag) => {
    const parts: string[] = []
    for (let node = start.nextElementSibling; node; node = node.nextElementSibling) {
      if (node.tagName === tag) break
      parts.push((node as HTMLElement).innerText)
    }
    return parts.join('\n')
  }, `H${level}`)
}

test.describe('Conversation Pull Requests guide', () => {
  test('@scenario:pull-request-screenshots-follow-the-reader-theme every screenshot loads and shows the variant for the active theme', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(GUIDE)
      await expect(page.locator('html')).toHaveClass(
        colorScheme === 'dark' ? /dark/ : /^(?!.*dark).*$/,
      )

      const shown = body(page).locator(
        `.image-${colorScheme}-theme img[src*="/images/pull-requests/"]`,
      )
      const hidden = body(page).locator(
        `.image-${colorScheme === 'dark' ? 'light' : 'dark'}-theme img[src*="/images/pull-requests/"]`,
      )
      await expect(shown).toHaveCount(2)
      await expect(hidden).toHaveCount(2)

      for (const image of await shown.all()) {
        await image.scrollIntoViewIfNeeded()
        await expect(image).toBeVisible()
        await expect(image).toHaveAttribute('src', new RegExp(`-${colorScheme}\\.png$`))
        await expect(image).toHaveAttribute('alt', /\S/)
        // A broken path renders an empty box rather than failing the page.
        await expect
          .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
          .toBeGreaterThan(0)
      }
      for (const image of await hidden.all()) await expect(image).toBeHidden()
    }
  })

  test('@scenario:pull-request-card-names-the-conflicts-state the card section lists Conflicts among the state badges', async ({
    page,
  }) => {
    await page.goto(GUIDE)
    const card = await sectionText(page, 'Reading the card', 2)
    expect(card).toMatch(/State: Open, Conflicts, Draft, Merged or Closed/)
    expect(card).toMatch(/Conflicts replaces Open/)
  })

  test('@scenario:pull-request-icon-table-matches-the-app merged is purple with no dot, and the header dot sits on the icon', async ({
    page,
  }) => {
    await page.goto(GUIDE)
    const table = heading(page, 'Reading the card', 2).locator(
      'xpath=following-sibling::*[.//table][1]//table',
    )
    const row = (situation: string) =>
      table.locator('tr', { has: page.getByRole('cell', { name: situation, exact: true }) })

    await expect(row('Merged').getByRole('cell')).toHaveText(['Merged', 'Purple', 'None'])
    await expect(row('Closed').getByRole('cell')).toHaveText(['Closed', 'Neutral', 'None'])
    await expect(row('Open, merge conflicts').getByRole('cell')).toHaveText([
      'Open, merge conflicts',
      'Red',
      'From the checks',
    ])
    // The app shows no dot once a pull request is merged or closed, running checks or not.
    await expect(body(page).getByText('amber while checks still run')).toHaveCount(0)

    const chip = await sectionText(page, 'In the chat header', 2)
    expect(chip).toMatch(/a small CI dot on its corner, and the pull request title/)
    expect(chip).toMatch(/Hover or focus the chip to open a card/)
  })

  test('@scenario:released-pull-request-features-carry-no-pending-label Bitbucket, per-user accounts and the shared cache read as released', async ({
    page,
  }) => {
    await page.goto(GUIDE)
    await expect(body(page)).not.toContainText('Pending')
    await expect(heading(page, 'Connect your own account', 2)).toBeVisible()

    await page.goto(AGENTS)
    const reference = await sectionText(page, 'pullRequests', 2)
    expect(reference).toContain('bitbucket')
    expect(reference).not.toContain('Pending')

    await page.goto(DOTENV)
    const env = await sectionText(page, 'Conversation Pull Requests', 2)
    expect(env).toContain('BITBUCKET_PULL_REQUEST_TOKEN')
    expect(env).not.toContain('Pending')
  })

  test('@scenario:shared-cache-slots-is-documented sharedCacheSlots has its range, default and YAML-only note', async ({
    page,
  }) => {
    await page.goto(AGENTS)
    const reference = await sectionText(page, 'pullRequests', 2)
    expect(reference).toContain('sharedCacheSlots')
    expect(reference).toMatch(
      /64-1000000\)\. A new entry replaces the one in its slot\. Read from the YAML only\. Default: 65536\./,
    )
    expect(reference).toMatch(
      /`?provider`?, `?host`?, `?oauth`? and `?sharedCacheSlots`? are read from/,
    )

    // Deployment setup moved from the feature page to the configuration page.
    await page.goto(SETUP)
    await expect(body(page)).toContainText('sharedCacheSlots (64-1000000, default 65536)')
  })
})
