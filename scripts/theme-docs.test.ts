import { readFileSync } from 'node:fs'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { expect, it } from 'vitest'

// Refresh this fixture from the same path on LibreChat dev when the registry changes.
// https://raw.githubusercontent.com/LibreChat-AI/LibreChat/4dac6bd0a78e76fb508498cf56e7b8679abf3fa6/packages/data-provider/specs/themedocs.json
import manifest from './fixtures/themedocs.json'

it('documents the appearance keys in the theme.mdx reference table', () => {
  const page = readFileSync(
    'content/docs/configuration/librechat_yaml/object_structure/theme.mdx',
    'utf8',
  )
  const { children } = unified().use(remarkParse).use(remarkGfm).parse(page)
  const heading = children.findIndex(
    (node) =>
      node.type === 'heading' &&
      node.children.some((part) => part.type === 'text' && part.value === 'Appearance'),
  )
  expect(heading, 'Missing Appearance heading in theme.mdx').toBeGreaterThanOrEqual(0)

  const documented = new Set<string>()
  for (const node of children.slice(heading + 1)) {
    if (node.type === 'heading') break
    if (node.type !== 'table') continue
    for (const row of node.children.slice(1)) {
      const cell = row.children[0]?.children
      if (cell?.length !== 1 || (cell[0].type !== 'inlineCode' && cell[0].type !== 'text')) {
        throw new Error('Expected a single appearance key in the first cell of each theme.mdx row')
      }
      documented.add(cell[0].value)
    }
  }

  expect({
    missing: manifest.filter((key) => !documented.has(key)),
    extra: [...documented].filter((key) => !manifest.includes(key)),
  }).toEqual({ missing: [], extra: [] })
})
