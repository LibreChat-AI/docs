/**
 * Search relevance check against a real exported index.
 *
 * Usage:
 *   pnpm tsx scripts/search-eval.ts https://www.librechat.ai/api/search/en
 *   pnpm tsx scripts/search-eval.ts .next/server/app/api/search/en.body
 *
 * Each case lists the pages that must appear in the top 3 results (any one of
 * them passes). Exits 1 when a case fails, so it can gate ranking changes.
 */
import { readFile } from 'node:fs/promises'
import { create, load } from '@orama/orama'
import { searchRanked } from '../lib/search-ranking'

const TOP_N = 3

const CASES: { query: string; expect: string[] }[] = [
  { query: 'docker', expect: ['/docs/local/docker'] },
  { query: 'docker override', expect: ['/docs/configuration/docker_override'] },
  { query: 'ollama', expect: ['/docs/configuration/librechat_yaml/ai_endpoints/ollama'] },
  { query: 'mcp', expect: ['/docs/features/mcp'] },
  { query: 'rag api', expect: ['/docs/features/rag_api', '/docs/configuration/rag_api'] },
  { query: 'meilisearch', expect: ['/docs/configuration/meilisearch'] },
  { query: 'helm', expect: ['/docs/local/helm_chart'] },
  { query: 'nginx', expect: ['/docs/remote/nginx'] },
  { query: 'ldap', expect: ['/docs/configuration/authentication/ldap'] },
  { query: 'keycloak', expect: ['/docs/configuration/authentication/OAuth2-OIDC/keycloak'] },
  { query: 'azure openai', expect: ['/docs/configuration/librechat_yaml/ai_endpoints/azure'] },
  { query: 'bedrock', expect: ['/docs/configuration/pre_configured_ai/bedrock'] },
  { query: 'redis', expect: ['/docs/configuration/redis'] },
  { query: 'web search', expect: ['/docs/features/web_search'] },
  { query: 'memory', expect: ['/docs/features/memory'] },
  { query: 'agents', expect: ['/docs/features/agents'] },
  { query: 'code interpreter', expect: ['/docs/features/code_interpreter'] },
  { query: 'environment variables', expect: ['/docs/configuration/dotenv'] },
  { query: 'custom endpoints', expect: ['/docs/quick_start/custom_endpoints'] },
  { query: 'openrouter', expect: ['/docs/configuration/librechat_yaml/ai_endpoints/openrouter'] },
  {
    query: 'model specs',
    expect: ['/docs/configuration/librechat_yaml/object_structure/model_specs'],
  },
  { query: 'railway', expect: ['/docs/remote/railway'] },
  { query: 'mongodb atlas', expect: ['/docs/configuration/mongodb/mongodb_atlas'] },
  { query: 'artifacts', expect: ['/docs/features/artifacts'] },
  { query: 'ocr', expect: ['/docs/features/ocr'] },
]

async function readIndex(source: string): Promise<unknown> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source)
    if (!res.ok) throw new Error(`${source} returned ${res.status}`)
    return res.json()
  }
  return JSON.parse(await readFile(source, 'utf8'))
}

async function main() {
  const source = process.argv[2]
  if (!source) {
    console.error('usage: tsx scripts/search-eval.ts <index url or file>')
    process.exit(2)
  }

  const exported = (await readIndex(source)) as { type: string; data: Record<string, unknown> }
  const raw = exported.type === 'i18n' ? exported.data.en : exported
  const db = create({ schema: { _: 'string' }, language: 'english' })
  load(db, raw as Parameters<typeof load>[1])

  let failed = 0
  for (const { query, expect } of CASES) {
    const pages = (await searchRanked(db, query))
      .filter((r) => r.type === 'page')
      .slice(0, TOP_N)
      .map((r) => r.url)
    const ok = pages.some((url) => expect.includes(url))
    if (!ok) failed++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${query.padEnd(22)} ${pages.join('  ')}`)
  }

  console.log(`\n${CASES.length - failed}/${CASES.length} passed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
