import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { getUI } from '../lib/ui-i18n'
import {
  DOCS_VERSION_ID_PATTERN,
  compareDocsVersionsDescending,
  isUpcomingCandidate,
  latestStableVersion,
} from '../lib/docs-version-order'

/**
 * Every snapshot in content/docs-archive, whichever ones the build holds: the
 * releases archived by hand and the ones the Sync docs archive workflow adds,
 * release candidates included.
 */
const versions = readdirSync(path.resolve(__dirname, '..', 'content', 'docs-archive'), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && DOCS_VERSION_ID_PATTERN.test(entry.name))
  .map((entry) => entry.name)
  .sort(compareDocsVersionsDescending)

const latestRelease = latestStableVersion(versions)

function expectedBanner(version: string): { title: string; text: RegExp } {
  if (version === latestRelease) {
    return { title: 'Latest release', text: /, the latest release\./ }
  }
  if (isUpcomingCandidate(version, latestRelease)) {
    return { title: 'Release candidate', text: /, a release candidate of the next release/ }
  }
  return { title: 'Archived documentation', text: /, which is no longer\s+maintained\./ }
}

const escapeRegExp = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('@scenario:archived-snapshots-show-their-release-status every archived snapshot is listed in the version switcher and opens with the banner for its release status', async ({
  page,
}) => {
  expect(versions.length).toBeGreaterThan(0)

  await page.goto('/docs')
  await page.getByRole('button', { name: getUI('en').version.aria }).click()
  for (const version of versions) {
    const label = new RegExp(`^${escapeRegExp(version)}( \\(latest release\\))?$`)
    await expect(page.getByRole('menuitem', { name: label })).toHaveCount(1)
  }
  await page.keyboard.press('Escape')

  for (const version of versions) {
    const banner = expectedBanner(version)
    await page.goto(`/${version}/docs`)
    await expect(page.getByText(banner.title, { exact: true })).toBeVisible()
    const message = page.getByText(banner.text)
    await expect(message).toBeVisible()
    await expect(message.locator('strong')).toHaveText(version)
  }
})
