import { docsSource } from '@/lib/source'
import { i18n } from '@/lib/i18n'
import { SEARCH_LANGUAGE_BY_LOCALE } from '@/lib/search-languages'
import {
  createKoreanTokenizer,
  createPolishTokenizer,
  createVietnameseTokenizer,
} from '@/lib/unicode-tokenizer'
import { createFromSource, type ExportedData } from 'fumadocs-core/search/server'
import { createTokenizer as createMandarinTokenizer } from '@orama/tokenizers/mandarin'
import { createTokenizer as createJapaneseTokenizer } from '@orama/tokenizers/japanese'

// Per-locale static search index.
//
// The whole index is built ONCE at build time (createFromSource caches the
// server per loader) and this route emits one prerendered JSON file per locale
// — so a reader downloads only their own language (~2 MB gzipped, one Orama DB)
// instead of the ~14 MB / six-DB combined blob. The client points its `from` at
// /api/search/<locale> (see components/search-dialog.tsx).
//
// This replaced the dynamic `GET` that rebuilt every locale index inside the
// serverless function on each cold start, which exceeded the function's max
// duration and returned 504s for every query in production.
export const revalidate = false
export const dynamicParams = false

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }))
}

// localeMap drives how each locale's index is tokenized at build time. Orama's
// built-in stemmers expect language names like "english", not locale codes.
// Chinese and Japanese use dedicated
// @orama/tokenizers via a top-level `tokenizer` field (createDB reads
// `tokenizer ?? components.tokenizer`). Korean uses a lightweight Unicode
// tokenizer so Hangul terms are kept instead of being treated as separators.
// The client's initOrama MUST mirror this map so query tokenization matches how
// the documents were indexed.
//
// Restrict each non-default locale's index to pages that have a real translated
// file (path ends `.<locale>.mdx`). The loader otherwise fills every locale with
// the English fallback for each untranslated page, and those hits resolve to
// /<locale>/docs/... URLs that immediately redirect to English (see the docs page
// route), so localized search would surface results that bounce. Filtering keeps
// each locale's search consistent with what actually renders under /<locale>/docs/,
// and keeps each prerendered index under Vercel's 20 MB response body limit
// (FALLBACK_BODY_TOO_LARGE). The default language keeps every page.
//
// createFromSource indexes loader.getPages() (every language, grouped by
// page.locale) and never calls getLanguages(), so the filter has to wrap getPages().
const localeFilteredSource: typeof docsSource = {
  ...docsSource,
  getPages: (language) =>
    docsSource
      .getPages(language)
      .filter(
        (page) => page.locale === i18n.defaultLanguage || page.path.endsWith(`.${page.locale}.mdx`),
      ),
}

const searchServer = createFromSource(localeFilteredSource, {
  localeMap: {
    ...SEARCH_LANGUAGE_BY_LOCALE,
    zh: { tokenizer: createMandarinTokenizer() },
    ja: { tokenizer: createJapaneseTokenizer() },
    ko: { tokenizer: createKoreanTokenizer() },
    pl: { tokenizer: createPolishTokenizer() },
    vi: { tokenizer: createVietnameseTokenizer() },
  },
})

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const full = (await searchServer.export()) as ExportedData
  const locale = full.type === 'i18n' ? full.data[lang] : undefined
  // Keep the i18n envelope the static client expects; emit only this locale.
  return Response.json({ type: 'i18n', data: locale ? { [lang]: locale } : {} })
}
