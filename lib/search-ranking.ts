import { getByID, search, type AnyOrama } from '@orama/orama'
import { createContentHighlighter, type SortedResult } from 'fumadocs-core/search'

/**
 * Page-level ranking for the static (advanced) Orama index.
 *
 * fumadocs' built-in `searchAdvanced` scores every heading and paragraph as an
 * independent document with BM25 and then orders pages by their first hit. Short
 * paragraphs that repeat a term therefore outrank the page that is actually about
 * it: searching "docker" put the "Overview" page (seven short paragraphs that
 * mention docker) above the page titled "Docker". It also shows up to eight
 * fragments per page, so one page fills the whole dialog.
 *
 * Here Orama only finds the candidates; each page is then scored by how well its
 * title matches the query, with body relevance as the tie-breaker, and keeps a
 * few fragments only.
 */

type IndexedDoc = {
  id: string
  page_id: string
  type: SortedResult['type']
  content: string
  url: string
  breadcrumbs?: string[]
}

export type RankOptions = {
  /** Pages to return. */
  maxPages?: number
  /** Heading/text fragments shown under each page. */
  maxFragmentsPerPage?: number
}

const CANDIDATE_LIMIT = 500
const TYPE_WEIGHT: Record<SortedResult['type'], number> = { page: 1, heading: 1.5, text: 1 }
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/g, ' ').trim()
}

function splitWords(value: string): string[] {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/**
 * Title relevance: exact title, then a title that starts with the query, then a
 * title containing every query term as a word prefix ("rag" matches "RAG API",
 * not "Storage"). CJK titles have no word breaks, so they fall back to substring.
 */
export function scoreTitle(title: string, query: string): number {
  const t = normalize(title)
  const q = normalize(query)
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 60

  const terms = splitWords(q)
  if (terms.length === 0) return 0
  const words = splitWords(t)
  const matched = terms.filter((term) =>
    CJK.test(term) ? t.includes(term) : words.some((word) => word.startsWith(term)),
  ).length
  if (matched === terms.length) return 40
  return 20 * (matched / terms.length)
}

type Fragment = { doc: IndexedDoc; score: number }
type PageGroup = { pageId: string; best: number; count: number; fragments: Fragment[] }

export type RankedPage = {
  page: IndexedDoc
  titleScore: number
  bodyScore: number
  fragments: IndexedDoc[]
}

/**
 * Groups Orama hits by page and orders pages by title match first, then by
 * their best weighted body hit, then by how many fragments matched. The title
 * tier is compared on its own so body hits can never lift a weaker title match
 * above a stronger one.
 */
export function rankPages(
  hits: { score: number; document: IndexedDoc }[],
  query: string,
  getPage: (pageId: string) => IndexedDoc | undefined,
  { maxPages = 10, maxFragmentsPerPage = 3 }: RankOptions = {},
): RankedPage[] {
  const groups = new Map<string, PageGroup>()
  let maxScore = 0

  for (const hit of hits) {
    const doc = hit.document
    const weighted = hit.score * TYPE_WEIGHT[doc.type]
    maxScore = Math.max(maxScore, weighted)

    let group = groups.get(doc.page_id)
    if (!group) {
      group = { pageId: doc.page_id, best: 0, count: 0, fragments: [] }
      groups.set(doc.page_id, group)
    }
    group.best = Math.max(group.best, weighted)
    group.count++
    if (doc.type !== 'page') group.fragments.push({ doc, score: weighted })
  }

  const ranked: RankedPage[] = []
  for (const group of groups.values()) {
    const page = getPage(group.pageId)
    if (!page) continue
    const body = maxScore > 0 ? (group.best / maxScore) * 30 : 0
    const coverage = (Math.min(group.count, 10) / 10) * 10
    ranked.push({
      page,
      titleScore: scoreTitle(page.content, query),
      bodyScore: body + coverage,
      fragments: group.fragments
        .sort((a, b) => b.score - a.score)
        .slice(0, maxFragmentsPerPage)
        .map((f) => f.doc),
    })
  }

  return ranked
    .sort((a, b) => b.titleScore - a.titleScore || b.bodyScore - a.bodyScore)
    .slice(0, maxPages)
}

/** Runs a query against an exported fumadocs advanced index. */
export async function searchRanked(
  db: AnyOrama,
  query: string,
  options?: RankOptions,
): Promise<SortedResult[]> {
  if (!query.trim()) return []

  const result = await search(db, {
    term: query,
    limit: CANDIDATE_LIMIT,
    properties: ['content'],
  })
  const pages = rankPages(
    result.hits as unknown as { score: number; document: IndexedDoc }[],
    query,
    (pageId) => getByID(db, pageId) as IndexedDoc | undefined,
    options,
  )

  const highlighter = createContentHighlighter(query)
  const list: SortedResult[] = []
  for (const { page, fragments } of pages) {
    list.push({
      id: page.id,
      type: 'page',
      content: highlighter.highlightMarkdown(page.content),
      breadcrumbs: page.breadcrumbs,
      url: page.url,
    })
    for (const doc of fragments) {
      list.push({
        id: doc.id.toString(),
        type: doc.type,
        content: highlighter.highlightMarkdown(doc.content),
        breadcrumbs: doc.breadcrumbs,
        url: doc.url,
      })
    }
  }
  return list
}
