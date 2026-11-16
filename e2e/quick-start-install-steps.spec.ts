import { expect, test, type Page } from '@playwright/test'

function body(page: Page) {
  return page.locator('#nd-page')
}

// The final step each locale shows on the Docker and npm cards. The hub copy is
// hand-maintained per locale, so every dictionary has to carry it.
const OPEN_AND_REGISTER: Record<string, string> = {
  en: 'Open localhost:3080 and register',
  de: 'localhost:3080 öffnen und registrieren',
  es: 'Abre localhost:3080 y regístrate',
  fr: 'Ouvrez localhost:3080 et inscrivez-vous',
  id: 'Buka localhost:3080 dan daftar',
  it: 'Apri localhost:3080 e registrati',
  ja: 'localhost:3080 を開いてアカウント登録',
  ko: 'localhost:3080을 열고 계정 등록',
  nl: 'Open localhost:3080 en registreer',
  pl: 'Otwórz localhost:3080 i zarejestruj się',
  'pt-BR': 'Abra localhost:3080 e cadastre-se',
  tr: 'localhost:3080 adresini açın ve kaydolun',
  vi: 'Mở localhost:3080 và đăng ký',
  zh: '打开 localhost:3080 并注册',
}

async function cardSteps(page: Page, method: string) {
  // Each item is a number badge followed by the step label; read the label only.
  return page
    .getByRole('list', { name: `${method} steps` })
    .getByRole('listitem')
    .locator('span:last-child')
    .allInnerTexts()
}

test.describe('Quick Start install steps', () => {
  test('@scenario:quick-start-cards-end-at-first-login the Docker and npm cards end with opening LibreChat and registering', async ({
    page,
  }) => {
    await page.goto('/docs/quick_start')

    for (const method of ['Docker', 'npm']) {
      const steps = await cardSteps(page, method)
      expect(steps).toHaveLength(4)
      expect(steps[3].trim()).toBe(OPEN_AND_REGISTER.en)
    }

    // The npm card must match the Node.js version the npm guide pins.
    await expect(body(page).getByText('Node.js v24.22.1', { exact: true })).toBeVisible()
    await expect(body(page).getByText('Node.js v20.19+')).toHaveCount(0)
  })

  test('@scenario:quick-start-cards-localized-in-every-locale every locale shows the first-login step and the current Node.js version', async ({
    page,
  }) => {
    for (const [locale, step] of Object.entries(OPEN_AND_REGISTER)) {
      if (locale === 'en') continue
      await page.goto(`/${locale}/docs/quick_start`)
      for (const method of ['Docker', 'npm']) {
        const steps = await cardSteps(page, method)
        expect(steps, `${locale} ${method}`).toHaveLength(4)
        expect(steps[3].trim(), `${locale} ${method}`).toBe(step)
      }
      await expect(body(page).getByText('Node.js v24.22.1', { exact: true })).toBeVisible()
    }
  })

  test('@scenario:local-setup-gives-exact-run-commands the Local Setup guide gives the commands to run, in order', async ({
    page,
  }) => {
    await page.goto('/docs/quick_start/local_setup')

    const commands = (await body(page).locator('pre').allInnerTexts()).map((text) => text.trim())
    const expected = ['cd LibreChat', 'cp .env.example .env', 'docker compose up -d']
    const positions = expected.map((command) => commands.indexOf(command))
    expect(
      positions.every((position) => position >= 0),
      commands.join(' | '),
    ).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)

    await expect(body(page).getByText('copy .env.example .env')).toBeVisible()

    // Step 4 still hands the reader to the first-chat walkthrough. Checked
    // before leaving the page: the Docker guide links there too. Exact match
    // skips the footer's next-page card, which exists regardless of Step 4.
    await expect(
      body(page).getByRole('link', { name: 'Your First Chat', exact: true }),
    ).toHaveAttribute('href', '/docs/quick_start/first_chat')

    // The failure path points somewhere that exists.
    const troubleshooting = body(page).getByRole('link', {
      name: 'Docker guide troubleshooting section',
    })
    await expect(troubleshooting).toHaveAttribute('href', '/docs/local/docker#troubleshooting')
    await troubleshooting.click()
    await expect(page).toHaveURL(/\/docs\/local\/docker#troubleshooting$/)
    await expect(page.locator('#troubleshooting')).toBeVisible()
  })

  test('@scenario:docs-landing-desktop-callout-covers-macos the desktop installer callout tells Mac readers what to use', async ({
    page,
  }) => {
    await page.goto('/docs')

    const callout = body(page).getByText('Looking for a desktop installer?').locator('..')
    await expect(callout).toContainText('On macOS, also use Docker Desktop')
    await expect(callout).toContainText('Apple Silicon (M-series)')
    const dockerLinks = callout.getByRole('link', { name: 'Docker Desktop' })
    await expect(dockerLinks).toHaveCount(2)
    for (const link of await dockerLinks.all()) {
      await expect(link).toHaveAttribute('href', '/docs/local/docker')
    }
  })
})
