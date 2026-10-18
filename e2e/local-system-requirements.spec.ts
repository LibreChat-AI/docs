import { expect, test, type Page } from '@playwright/test'

const DOCKER = '/docs/local/docker'
const NPM = '/docs/local/npm'

function body(page: Page) {
  return page.locator('#nd-page')
}

function requirements(page: Page) {
  return body(page).locator('h3#system-requirements ~ p')
}

function desktop(page: Page) {
  return requirements(page).filter({ hasText: 'If you use Docker Desktop' })
}

test.describe('Local installation system requirements', () => {
  test('@scenario:docker-guide-scopes-host-requirements-to-docker-desktop a Docker reader sees the container minimum, with host minimums only for Docker Desktop', async ({
    page,
  }) => {
    await page.goto(DOCKER)

    await expect(
      body(page).getByRole('heading', { level: 3, name: 'System Requirements' }),
    ).toBeVisible()

    const containers = requirements(page).filter({ hasText: '1 GiB of RAM and 1 vCPU' })
    await expect(containers).toHaveCount(1)
    await expect(containers.getByRole('link', { name: 'minimum', exact: true })).toHaveAttribute(
      'href',
      '/docs/remote#minimum-requirements',
    )

    // The Docker Desktop host minimums are conditional, so a native Docker
    // Engine install on Linux is not ruled out by them.
    await expect(desktop(page)).toHaveCount(1)
    await expect(desktop(page)).toContainText('at least 4 GB of system RAM')
    await expect(desktop(page)).toContainText('Docker Engine installed directly on Linux')
    for (const [name, href] of [
      ['macOS', 'https://docs.docker.com/desktop/setup/install/mac-install/'],
      ['Linux', 'https://docs.docker.com/desktop/setup/install/linux/'],
      ['Windows', 'https://docs.docker.com/desktop/setup/install/windows-install/'],
    ]) {
      await expect(desktop(page).getByRole('link', { name, exact: true })).toHaveAttribute(
        'href',
        href,
      )
    }

    await page.goto('/docs/remote')
    await expect(page.locator('#minimum-requirements')).toBeVisible()
  })

  test('@scenario:docker-guide-memory-setting-matches-desktop-backend Hyper-V and WSL 2 readers are each sent to the control that sets container memory', async ({
    page,
  }) => {
    await page.goto(DOCKER)

    await expect(desktop(page).getByRole('link', { name: 'resource settings' })).toHaveAttribute(
      'href',
      'https://docs.docker.com/desktop/settings-and-maintenance/settings/',
    )
    await expect(desktop(page)).toContainText('with the Windows WSL 2 backend')
    await expect(
      desktop(page).getByRole('link', { name: "Docker's WSL guidance" }),
    ).toHaveAttribute('href', 'https://docs.docker.com/desktop/features/wsl/best-practices/')
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
    await page.goto(NPM)

    const link = body(page).getByRole('link', { name: 'System Requirements' })
    await expect(link).toHaveAttribute('href', `${DOCKER}#system-requirements`)

    await link.click()
    await expect(page).toHaveURL(new RegExp(`${DOCKER}#system-requirements$`))
    await expect(page.locator('#system-requirements')).toBeVisible()
  })

  test('@scenario:npm-guide-warns-source-build-needs-more-memory an npm reader learns the frontend build needs more memory than the runtime minimum', async ({
    page,
  }) => {
    await page.goto(NPM)

    const build = body(page)
      .locator('li')
      .filter({ hasText: 'Building the frontend from source' })
      .last()
    await expect(build).toContainText('npm run reinstall')
    await expect(build).toContainText('8 GB of heap')
    await expect(build.getByRole('link', { name: 'Docker', exact: true })).toHaveAttribute(
      'href',
      DOCKER,
    )
  })
})
