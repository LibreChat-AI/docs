import { describe, expect, it, vi } from 'vitest'

// The real fumadocs loader over a small in-memory source, so the route is exercised against the
// same createFromSource the site ships. createFromSource builds each locale's index from
// getPages(), which is what a locale filter has to wrap.
vi.mock('@/lib/source', async () => {
  const { loader } = await import('fumadocs-core/source')
  const { i18n } = await import('@/lib/i18n')

  const page = (path: string, title: string) => ({
    type: 'page' as const,
    path,
    data: {
      title,
      structuredData: {
        headings: [],
        contents: [{ heading: undefined, content: `${title} body` }],
      },
    },
  })

  return {
    docsSource: loader({
      baseUrl: '/docs',
      i18n,
      source: {
        files: [
          page('guide.mdx', 'Guide'),
          page('guide.pt-BR.mdx', 'Guia'),
          page('english-only.mdx', 'English only'),
        ],
      },
    }),
  }
})

import { GET } from '@/app/api/search/[lang]/route'

type ExportedIndex = {
  data: Record<
    string,
    { docs: { docs: Record<string, { url: string; type: string; content: string }> } }
  >
}

async function indexedPages(lang: string): Promise<{ url: string; title: string }[]> {
  const response = await GET(new Request(`https://www.librechat.ai/api/search/${lang}`), {
    params: Promise.resolve({ lang }),
  })
  const body = (await response.json()) as ExportedIndex
  return Object.values(body.data[lang].docs.docs)
    .filter((doc) => doc.type === 'page')
    .map((doc) => ({ url: doc.url, title: doc.content }))
    .sort((a, b) => a.url.localeCompare(b.url))
}

describe('per-locale search index', () => {
  it('keeps every page, translated or not, in the default language index', async () => {
    await expect(indexedPages('en')).resolves.toEqual([
      { url: '/docs/english-only', title: 'English only' },
      { url: '/docs/guide', title: 'Guide' },
    ])
  })

  it('indexes only the translated pages of a non-default locale', async () => {
    await expect(indexedPages('pt-BR')).resolves.toEqual([
      { url: '/pt-BR/docs/guide', title: 'Guia' },
    ])
  })

  it('leaves a locale without translations with an empty index instead of an English copy', async () => {
    await expect(indexedPages('de')).resolves.toEqual([])
  })
})
