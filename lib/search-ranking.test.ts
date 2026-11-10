import { create, insertMultiple } from '@orama/orama'
import { describe, expect, it } from 'vitest'
import { rankPages, scoreTitle, searchRanked } from './search-ranking'

const SCHEMA = {
  id: 'string',
  page_id: 'string',
  type: 'string',
  content: 'string',
  url: 'string',
  breadcrumbs: 'string[]',
} as const

// Mirrors the shape fumadocs exports for the advanced index: one `page` doc per
// page (content = title, id = page_id) plus heading/text fragments.
function page(url: string, title: string, fragments: string[]) {
  return [
    { id: url, page_id: url, type: 'page', content: title, url, breadcrumbs: [] },
    ...fragments.map((content, i) => ({
      id: `${url}-${i}`,
      page_id: url,
      type: 'text',
      content,
      url: `${url}#${i}`,
      breadcrumbs: [],
    })),
  ]
}

async function createDB() {
  const db = create({ schema: SCHEMA })
  await insertMultiple(db, [
    ...page('/docs/remote', 'Overview', [
      'Development oriented docker compose',
      'For IaaS we recommend Docker Compose',
      'Deployment oriented docker compose',
      'There are two docker compose files',
      'Why Docker Compose? Docker guide',
      'deploy-compose includes Nginx, internal to Docker',
    ]),
    ...page('/docs/local/docker', 'Docker', ['Install LibreChat with docker compose']),
    ...page('/docs/remote/docker_linux', 'Docker (Remote Linux)', ['docker.io and docker-ce']),
    ...page('/docs/configuration/cdn', 'File Storage & CDN', ['Store uploaded files']),
    ...page('/docs/features/rag_api', 'RAG API', ['Chat with files using the RAG API']),
  ])
  return db
}

const pageUrls = (results: { type: string; url: string }[]) =>
  results.filter((r) => r.type === 'page').map((r) => r.url)

describe('scoreTitle', () => {
  it('ranks exact, prefix, and all-terms title matches in that order', () => {
    expect(scoreTitle('Docker', 'docker')).toBeGreaterThan(scoreTitle('Docker Override', 'docker'))
    expect(scoreTitle('Docker Override', 'docker')).toBeGreaterThan(
      scoreTitle('Remote Docker Guide', 'docker'),
    )
    expect(scoreTitle('Remote Docker Guide', 'docker')).toBeGreaterThan(
      scoreTitle('Overview', 'docker'),
    )
  })

  it('matches query terms on word prefixes only', () => {
    expect(scoreTitle('File Storage & CDN', 'rag')).toBe(0)
    expect(scoreTitle('RAG API', 'rag')).toBeGreaterThan(0)
  })

  it('falls back to substring matching for CJK titles', () => {
    expect(scoreTitle('Docker 部署指南', '部署')).toBeGreaterThan(0)
  })
})

describe('rankPages', () => {
  it('never lets body hits lift a weaker title match above a stronger one', () => {
    const doc = (page_id: string, type: 'page' | 'text', content: string) => ({
      id: `${page_id}-${content}`,
      page_id,
      type,
      content,
      url: page_id,
    })
    const pages = {
      '/override': doc('/override', 'page', 'Docker Override'),
      '/guide': doc('/guide', 'page', 'Remote Docker Guide'),
    }
    const hits = [
      { score: 1, document: doc('/override', 'text', 'docker') },
      ...Array.from({ length: 10 }, (_, i) => ({
        score: 100,
        document: doc('/guide', 'text', `docker ${i}`),
      })),
    ]
    const ranked = rankPages(hits, 'docker', (id) => pages[id as keyof typeof pages])
    expect(ranked.map((r) => r.page.url)).toEqual(['/override', '/guide'])
  })
})

describe('searchRanked', () => {
  it('puts the page titled with the query above pages that only repeat it in the body', async () => {
    const results = await searchRanked(await createDB(), 'docker')
    expect(pageUrls(results).slice(0, 2)).toEqual([
      '/docs/local/docker',
      '/docs/remote/docker_linux',
    ])
  })

  it('caps fragments per page', async () => {
    const results = await searchRanked(await createDB(), 'docker', { maxFragmentsPerPage: 2 })
    const overviewFragments = results.filter(
      (r) => r.type !== 'page' && r.url.startsWith('/docs/remote#'),
    )
    expect(overviewFragments).toHaveLength(2)
  })

  it('returns nothing for a blank query', async () => {
    expect(await searchRanked(await createDB(), '   ')).toEqual([])
  })
})
