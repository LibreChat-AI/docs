import { test, expect } from '@playwright/test'

const PAGE = '/docs/configuration/librechat_yaml/object_structure/mcp_servers'

test.describe('MCP OAuth sign-in timing docs', () => {
  test('@scenario:mcp-oauth-prompt-keys-documented both keys have sections that state when each mode prompts', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    await expect(main.locator('[id="oauthprompt"]')).toHaveCount(1)
    await expect(main.locator('[id="oauthtoolcatalog"]')).toHaveCount(1)
    await expect(main).toContainText('the sign-in prompt appears when the conversation turn starts')
    await expect(main).toContainText('The prompt appears when the agent first calls one of the')
    await expect(main).toContainText('Without one, the server keeps the turn-start prompt')
    await expect(main).toContainText('fails config validation instead of being ignored')
    const admin = main.getByRole('link', { name: 'admin configuration overrides', exact: true })
    await expect(admin).toHaveAttribute(
      'href',
      /\/docs\/configuration\/admin_panel#configuration-overrides$/,
    )
  })

  test('@scenario:mcp-oauth-prompt-links-resolve the deferred tools, capability and catalog links reach their targets', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const section = page.locator('main')
    const catalogLink = section.getByRole('link', { name: 'oauthToolCatalog', exact: true }).first()
    await expect(catalogLink).toHaveAttribute('href', /#oauthtoolcatalog$/)

    const deferred = section.getByRole('link', { name: 'deferred', exact: true }).first()
    await expect(deferred).toHaveAttribute('href', /\/docs\/features\/agents#deferred-tools$/)
    await deferred.click()
    await expect(page.locator('[id="deferred-tools"]')).toHaveCount(1)

    await page.goto(PAGE)
    const capability = page
      .locator('main')
      .getByRole('link', { name: 'agent capability', exact: true })
      .first()
    await expect(capability).toHaveAttribute('href', /object_structure\/agents#capabilities$/)
    await capability.click()
    await expect(page.locator('[id="capabilities"]')).toHaveCount(1)
  })

  test('@scenario:mcp-oauth-prompt-example-shown the on_use example with a declared catalog is on the page', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const main = page.locator('main')
    await expect(
      main.getByRole('heading', { name: 'MCP Server with OAuth Sign-In on First Tool Use' }),
    ).toBeVisible()
    const example = main.locator('figure, pre').filter({ hasText: 'oauthPrompt: on_use' }).last()
    await expect(example).toContainText('oauthToolCatalog:')
    await expect(example).toContainText('required: [range]')
  })
})
