import { expect, test } from '@playwright/test'
import { load } from 'js-yaml'

const GUIDE = '/docs/features/discord_channels'

test.describe('Discord Agent Channels guide', () => {
  test('@scenario:discord-guide-discovery readers can open the unreleased guide from Agents and find it in the sidebar', async ({
    page,
  }, testInfo) => {
    await page.goto('/docs/features/agents')
    await page.getByRole('button', { name: 'Reject non-essential', exact: true }).click()
    await page.locator(`#nd-page a[href="${GUIDE}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${GUIDE}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discord Agent Channels')
    await expect(page.locator('#nd-page')).toContainText('Unreleased implementation documentation')
    await expect(page.locator(`#nd-sidebar a[href="${GUIDE}"]`)).toHaveCount(1)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await expect(page.locator('html')).toHaveClass(
        colorScheme === 'dark' ? /dark/ : /^(?!.*dark).*$/,
      )
      await testInfo.attach(`Discord guide ${colorScheme}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
    }
  })

  test('@scenario:discord-guide-setup readers receive usable policy examples and separate installation, consent and DM instructions', async ({
    page,
  }) => {
    await page.goto(GUIDE)
    const body = page.locator('#nd-page')
    const policy = body.locator('pre').filter({ hasText: 'endpoints:' })
    await expect(policy).toHaveCount(1)
    expect(load(await policy.innerText())).toEqual({
      endpoints: {
        agents: {
          remoteApi: { background: { enabled: true } },
          channels: {
            enabled: true,
            discord: {
              enabled: true,
              publicUrl: 'https://discord.example.com',
              gateway: { enabled: false, messageContent: false },
              dm: { enabled: false },
            },
          },
        },
      },
    })
    const compose = body.locator('pre').filter({ hasText: 'docker compose' })
    await expect(compose).toContainText('docker-compose.mongo-replica.yml')
    await expect(compose).toContainText('--profile channels config --quiet')
    for (const anchor of [
      'requirements',
      'docker-compose',
      'helm',
      'connect-an-application-and-server',
      'bind-a-text-channel-to-an-agent',
      'link-your-account-and-run-the-agent',
      'native-threads',
      'bot-mentions',
      'direct-messages',
      'health-and-diagnostics',
      'rotation-rollback-and-removal',
    ]) {
      await expect(body.locator(`[id="${anchor}"]`)).toHaveCount(1)
    }
    await expect(body).toContainText('enable Require OAuth2 Code Grant')
    await expect(body).toContainText('Browser consent alone does not authorize an earlier prompt')
    await expect(body).toContainText('ordinary DM messages require both switches')
    await expect(body).toContainText('Expose only /discord/ publicly')
    await expect(body).toContainText(
      'Leave the shared channels.enabled setting enabled if Slack must keep working',
    )
  })

  test('@scenario:discord-guide-links every internal guide link and anchor resolves', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.goto(GUIDE)
    const targets = await page
      .locator('#nd-page a[href^="/docs/"], #nd-page a[href^="#"]')
      .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href') ?? ''))])
    expect(targets.length).toBeGreaterThan(0)
    for (const href of targets) {
      const target = new URL(href, `http://localhost${GUIDE}`)
      const response = await page.goto(target.pathname)
      expect(response?.status(), href).toBe(200)
      await expect(page.getByRole('heading', { level: 1 }), href).toBeVisible()
      if (target.hash) {
        const anchor = decodeURIComponent(target.hash.slice(1))
        expect(
          await page.evaluate((id) => document.getElementById(id) !== null, anchor),
          href,
        ).toBe(true)
      }
    }
  })
})
