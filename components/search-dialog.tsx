'use client'

import { useI18n } from 'fumadocs-ui/contexts/i18n'
import { useDocsSearch } from 'fumadocs-core/search/client'
import { i18n } from '@/lib/i18n'
import { createDocsSearchClient } from '@/lib/search-client'
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search'

/**
 * Static search dialog.
 *
 * The per-locale Orama indexes are built at build time by
 * app/api/search/[lang]/route.ts; this component downloads only the current
 * reader's language and runs every query client-side. It mirrors fumadocs'
 * DefaultSearchDialog layout (so the UX is unchanged) but swaps the fetch client
 * for a static one with a locale-aware `initOrama` and page-level ranking
 * (lib/search-client.ts, lib/search-ranking.ts).
 *
 * `initOrama` must reproduce the SAME tokenizer the route used to build each
 * locale's index, otherwise the query is tokenized differently from the stored
 * terms and matches nothing. The built-in static `initOrama` passes the raw
 * locale CODE ('en') to Orama as a language, which Orama rejects (it expects
 * 'english'), so a custom one is required here.
 */

export default function StaticSearchDialog(props: SharedProps) {
  const { locale } = useI18n()
  const lang = locale ?? i18n.defaultLanguage
  // Created inline (like fumadocs' DefaultSearchDialog); useDocsSearch re-queries
  // when the client's `deps` ([locale]) change, and the downloaded index is
  // cached module-side per locale, so this stays cheap across renders.
  const client = createDocsSearchClient(lang)
  const { search, setSearch, query } = useDocsSearch({ client })

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data === 'empty' ? null : query.data} />
      </SearchDialogContent>
      <SearchDialogFooter />
    </SearchDialog>
  )
}
