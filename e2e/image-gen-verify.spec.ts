import { test, expect } from '@playwright/test'

test.describe('Image generation docs', () => {
  test('@scenario:image-gen-page-has-no-dalle-setup no page documents the retired DALL-E tool', async ({
    page,
  }) => {
    await page.goto('/docs/features/image_gen')
    const main = page.locator('main')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(main.getByRole('heading', { name: /dall/i })).toHaveCount(0)
    await expect(main).not.toContainText(/DALLE_API_KEY|DALLE3_/)

    await page.goto('/docs/configuration/librechat_yaml/ai_endpoints/azure')
    const azure = page.locator('main')
    await expect(azure.getByRole('heading', { name: /generate images with azure/i })).toBeVisible()
    await expect(azure).not.toContainText(/DALL-?E/i)
    await expect(azure).toContainText('IMAGE_GEN_OAI_BASEURL')
  })

  test('@scenario:image-gen-default-model-matches-code the documented default is gpt-image-2.5-flare', async ({
    page,
  }) => {
    // The model default, size rules and resize setting live on the tool's config page.
    await page.goto('/docs/configuration/tools/openai_image_gen')
    const main = page.locator('main')
    await expect(main).toContainText('Default: gpt-image-2.5-flare.')
    await expect(main).not.toContainText('IMAGE_GEN_OAI_MODEL=gpt-image-1')
    await expect(main).not.toContainText(/defaults? to \**gpt-image-1/i)
    await expect(main).toContainText('accept others like 2048x1152 or 3840x2160')
    await expect(main).toContainText('stored at 1365x768')
    const resizeLink = main.getByRole('link', { name: 'fileConfig.imageGeneration' })
    await expect(resizeLink).toHaveAttribute('href', /file_config#imagegeneration$/)
    await resizeLink.click()
    await expect(page.locator('[id="imagegeneration"]')).toHaveCount(1)
  })

  test('@scenario:tools-table-and-agent-lists-omit-dalle feature cards and tool lists omit DALL-E and image links resolve', async ({
    page,
  }) => {
    const anchors = new Set<string>()
    let linked = 0
    for (const path of ['/docs/features', '/docs/configuration/tools', '/docs/features/agents']) {
      await page.goto(path)
      const main = page.locator('main')
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await expect(main).not.toContainText(/DALL-?E/i)
      const hrefs = await main
        .locator('a[href*="/docs/features/image_gen"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
      linked += hrefs.length
      for (const href of hrefs) if (href.includes('#')) anchors.add(href.split('#')[1])
    }

    expect(linked).toBeGreaterThan(0)
    await page.goto('/docs/features/image_gen')
    for (const anchor of anchors) {
      await expect(page.locator(`[id="${anchor}"]`)).toHaveCount(1)
    }
  })
})
