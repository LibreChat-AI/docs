import { expect, test, type Page } from '@playwright/test'

const DOCKER = '/docs/local/docker'

function body(page: Page) {
  return page.locator('#nd-page')
}

function requirements(page: Page) {
  return body(page).locator('h3#system-requirements ~ p')
}

test.describe('Local installation system requirements', () => {
  test('@scenario:docker-guide-separates-host-and-container-requirements a Docker reader sees Docker Desktop host minimums apart from the container minimum', async ({
    page,
  }) => {
    await page.goto(DOCKER)

    await expect(
      body(page).getByRole('heading', { level: 3, name: 'System Requirements' }),
    ).toBeVisible()

    // Docker Desktop's own host requirement comes first, per platform, so the
    // 1 GiB container minimum is never read as the whole machine's requirement.
    for (const [name, href] of [
      ['macOS', 'https://docs.docker.com/desktop/setup/install/mac-install/'],
      ['Linux', 'https://docs.docker.com/desktop/setup/install/linux/'],
      ['Windows', 'https://docs.docker.com/desktop/setup/install/windows-install/'],
    ]) {
      await expect(
        requirements(page).getByRole('link', { name, exact: true }).first(),
      ).toHaveAttribute('href', href)
    }
    await expect(requirements(page).filter({ hasText: 'at least 4 GB of system RAM' })).toHaveCount(
      1,
    )
    await expect(requirements(page).filter({ hasText: '1 GiB of RAM and 1 vCPU' })).toHaveCount(1)

    const minimum = requirements(page).getByRole('link', { name: 'minimum', exact: true })
    await expect(minimum).toHaveAttribute('href', '/docs/remote#minimum-requirements')

    await page.goto('/docs/remote')
    await expect(page.locator('#minimum-requirements')).toBeVisible()
  })

  test('@scenario:docker-guide-admin-panel-needs-session-secret the admin panel is not promised to run without its session secret', async ({
    page,
  }) => {
    await page.goto(DOCKER)

    const compose = requirements(page).filter({ hasText: 'default Docker Compose file' })
    await expect(compose).toContainText('ADMIN_PANEL_SESSION_SECRET')
    await expect(compose.getByRole('link', { name: 'Admin Panel' })).toHaveAttribute(
      'href',
      '/docs/features/admin_panel',
    )
  })

  test('@scenario:npm-guide-links-to-system-requirements an npm reader is pointed at the requirements section', async ({
    page,
  }) => {
    await page.goto('/docs/local/npm')

    const link = body(page).getByRole('link', { name: 'System Requirements' })
    await expect(link).toHaveAttribute('href', `${DOCKER}#system-requirements`)

    await link.click()
    await expect(page).toHaveURL(new RegExp(`${DOCKER}#system-requirements$`))
    await expect(page.locator('#system-requirements')).toBeVisible()
  })
})
