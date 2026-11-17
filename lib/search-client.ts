import { create, load, type AnyOrama } from '@orama/orama'
import type { SearchClient } from 'fumadocs-core/search/client'
import { SEARCH_LANGUAGE_BY_LOCALE } from '@/lib/search-languages'
import { searchRanked } from '@/lib/search-ranking'

/**
 * Build the same locale-specific tokenizer used by the static search route.
 * Search queries and the generated index must use matching tokenizers.
 */
export async function initOrama(locale?: string): Promise<AnyOrama> {
  if (locale === 'zh') {
    const { createTokenizer } = await import('@orama/tokenizers/mandarin')
    return create({ schema: { _: 'string' }, components: { tokenizer: createTokenizer() } })
  }
  if (locale === 'ja') {
    const { createTokenizer } = await import('@orama/tokenizers/japanese')
    return create({ schema: { _: 'string' }, components: { tokenizer: createTokenizer() } })
  }
  if (locale === 'ko') {
    const { createKoreanTokenizer } = await import('@/lib/unicode-tokenizer')
    return create({ schema: { _: 'string' }, components: { tokenizer: createKoreanTokenizer() } })
  }
  if (locale === 'pl') {
    const { createPolishTokenizer } = await import('@/lib/unicode-tokenizer')
    return create({ schema: { _: 'string' }, components: { tokenizer: createPolishTokenizer() } })
  }
  if (locale === 'vi') {
    const { createVietnameseTokenizer } = await import('@/lib/unicode-tokenizer')
    return create({
      schema: { _: 'string' },
      components: { tokenizer: createVietnameseTokenizer() },
    })
  }

  return create({
    schema: { _: 'string' },
    language: SEARCH_LANGUAGE_BY_LOCALE[locale ?? 'en'] ?? 'english',
  })
}

// One download per locale per page load, shared by every client. A failed
// download is evicted so the next query can retry.
const dbCache = new Map<string, Promise<AnyOrama | undefined>>()

function getLocaleDB(locale: string): Promise<AnyOrama | undefined> {
  let cached = dbCache.get(locale)
  if (!cached) {
    cached = (async () => {
      const res = await fetch(`/api/search/${encodeURIComponent(locale)}`)
      if (!res.ok) throw new Error(`failed to fetch search index for "${locale}": ${res.status}`)
      const exported = (await res.json()) as { data: Record<string, unknown> }
      const data = exported.data[locale]
      if (!data) return undefined
      const db = await initOrama(locale)
      load(db, data as Parameters<typeof load>[1])
      return db
    })()
    cached.catch(() => dbCache.delete(locale))
    dbCache.set(locale, cached)
  }
  return cached
}

/**
 * Static search over the per-locale index, ranked by page (see
 * lib/search-ranking.ts) instead of fumadocs' per-fragment ordering.
 */
export function createDocsSearchClient(locale: string): SearchClient {
  return {
    deps: [locale],
    async search(query) {
      const db = await getLocaleDB(locale)
      return db ? searchRanked(db, query) : []
    },
  }
}
