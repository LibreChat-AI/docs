import { test, expect, type Page } from '@playwright/test'

/** The live preview embedded on a component page, located by its iframe title. */
function preview(page: Page, title: string) {
  return page.frameLocator(`iframe[title="${title}"]`)
}

test.describe('Component library', () => {
  test('a component page renders the live component next to its source', async ({ page }) => {
    await page.goto('/docs/development/components/button')

    const frame = preview(page, 'Button variants')
    await expect(frame.getByRole('button').first()).toBeVisible()
    await expect(page.locator('pre').filter({ hasText: '@librechat/client' }).first()).toBeVisible()
  })

  test('previews follow the docs color scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/docs/development/components/switch')
    await expect(page.locator('html')).toHaveClass(/dark/)

    const frame = preview(page, 'Switch with a label')
    await expect(frame.getByRole('switch')).toBeVisible()
    await expect(frame.locator('html')).toHaveClass(/dark/)
  })

  test('the switch toggles with the keyboard', async ({ page }) => {
    await page.goto('/docs/development/components/switch')

    const toggle = preview(page, 'Switch with a label').getByRole('switch', {
      name: 'Auto-send dictation',
    })
    await expect(toggle).toBeChecked()
    await toggle.focus()
    await page.keyboard.press('Space')
    await expect(toggle).not.toBeChecked()
  })

  test('the dropdown opens, selects with the keyboard and shows the choice', async ({ page }) => {
    await page.goto('/docs/development/components/dropdown')

    const frame = preview(page, 'Dropdown in a form')
    const trigger = frame.getByRole('combobox', { name: 'Model' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(frame.getByRole('option', { name: 'Claude Sonnet' })).toBeVisible()
    await frame.getByRole('option', { name: 'Claude Sonnet' }).press('Enter')
    await expect(trigger).toHaveText(/Claude Sonnet/)
  })

  test('the dialog opens, closes on Escape and returns focus', async ({ page }) => {
    await page.goto('/docs/development/components/dialog')

    const frame = preview(page, 'Confirmation dialog')
    const trigger = frame.getByRole('button', { name: 'Delete conversation' })
    await trigger.click()
    await expect(frame.getByRole('dialog', { name: 'Delete conversation?' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(frame.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('only the preview app may be framed, and only by the docs itself', async ({ request }) => {
    const previewResponse = await request.get('/component-previews/index.html')
    expect(previewResponse.ok()).toBe(true)
    expect(previewResponse.headers()['x-frame-options']).toBe('SAMEORIGIN')
    expect(previewResponse.headers()['content-security-policy']).toContain("frame-ancestors 'self'")

    const docsResponse = await request.get('/docs/development/components')
    expect(docsResponse.headers()['x-frame-options']).toBe('DENY')
  })
})
