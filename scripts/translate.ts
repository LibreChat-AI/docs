import { join } from 'node:path'
import { runTranslation } from '../lib/i18n/run'
import { createOpenRouterModel, type TranslateInput, type TranslateModel } from '../lib/i18n/engine'
import { createPrefetchedModel, prefetchMisses } from '../lib/i18n/batch'
import { TARGET_LOCALES, TRANSLATE_MODEL } from '../lib/i18n/config'
import { progress } from '../lib/i18n/progress'

const CACHE_DIR = join(process.cwd(), 'content/.i18n-cache')

/**
 * Errors that mean the run failed for an account-level reason rather than a
 * content one: no amount of retrying or re-running fixes them, and every affected
 * file is silently left in English. The workflow must go red on these — the
 * pipeline once sat dead for three weeks emitting green "success" runs because a
 * spend-limited key skipped every file.
 *
 * Matched only against raw provider errors, never against a formatted skip line. A
 * validation failure quotes the tokens it saw, and this repo documents billing,
 * quotas, and 401/403 responses — matching the formatted line would turn one
 * ordinary content failure on such a page into a false credits/auth outage.
 */
const FATAL_SKIP_RE =
  /requires more credits|insufficient|quota|billing|payment|invalid api key|no auth credentials|unauthor|forbidden|\b40[13]\b/i

/** Above this share of file×locale pairs failing, the run is broken, not degraded. */
const MAX_SKIP_RATE = Number(process.env.TRANSLATE_MAX_SKIP_RATE) || 0.25

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.split('=').slice(1).join('=')
}

async function main() {
  const force = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const locales = arg('locales')?.split(',') ?? [...TARGET_LOCALES]
  const only = arg('only') ?? null
  const batch = process.argv.includes('--batch') && !dryRun

  if (!dryRun && !process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set')
    process.exit(1)
  }

  // Auto-detect: live dashboard in an interactive terminal, periodic heartbeat
  // lines under CI (no TTY). A dry run does no API work, so keep it quiet.
  progress.configure(dryRun ? 'silent' : undefined)

  const base = {
    contentDir: join(process.cwd(), 'content/docs'),
    cacheDir: CACHE_DIR,
    locales,
    force,
    only,
  }
  let model: TranslateModel = createOpenRouterModel()
  let deferred: Set<string> | undefined

  if (batch) {
    // A silent dry run sees exactly the cache misses the real run will, so the
    // batch is asked for those and nothing else.
    const misses: TranslateInput[] = []
    progress.configure('silent')
    await runTranslation({ ...base, model, dryRun: true, onMiss: (input) => misses.push(input) })
    progress.configure()
    const prefetched = await prefetchMisses(misses, {
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: TRANSLATE_MODEL,
      chunkSize: Number(process.env.TRANSLATE_BATCH_SIZE) || 1000,
      waitMs: (Number(process.env.TRANSLATE_BATCH_WAIT_MINUTES) || 180) * 60_000,
      pollMs: (Number(process.env.TRANSLATE_BATCH_POLL_SECONDS) || 60) * 1000,
      ledgerPath: join(CACHE_DIR, 'batches.json'),
      log: (m) => console.log(`[translate] batch: ${m}`),
    })
    console.log(
      `[translate] batch: ${prefetched.answers.size} occurrence(s) answered, ${prefetched.deferred.size} string(s) still pending; the rest run live`,
    )
    model = createPrefetchedModel(prefetched.answers, model)
    deferred = prefetched.deferred
  }

  const stats = await runTranslation({ ...base, model, dryRun, deferred })

  console.log(
    `[translate] locales=${locales.join(',')} translated=${stats.translatedBlocks} cached=${stats.cachedBlocks} deferred=${stats.deferredBlocks} skipped=${stats.skipped.length}/${stats.attempted} quarantined=${stats.quarantined.length}`,
  )
  for (const s of stats.skipped) console.warn(`[translate] skipped ${s}`)
  // Settled, not outstanding: the page serves English until its source changes, so
  // these are reported apart from the failures that a rerun could still fix.
  for (const q of stats.quarantined) console.warn(`[translate] quarantined ${q}`)

  const fatal = stats.providerErrors.filter((s) => FATAL_SKIP_RE.test(s))
  if (fatal.length > 0) {
    console.error(
      `[translate] ${fatal.length} file(s) failed for an account-level reason (credits, quota, or auth). First: ${fatal[0]}`,
    )
    process.exit(1)
  }

  const skipRate = stats.attempted > 0 ? stats.skipped.length / stats.attempted : 0
  if (skipRate > MAX_SKIP_RATE) {
    console.error(
      `[translate] ${stats.skipped.length}/${stats.attempted} file translations failed (${Math.round(skipRate * 100)}%, limit ${Math.round(MAX_SKIP_RATE * 100)}%)`,
    )
    process.exit(1)
  }
}

main().catch((e) => {
  // Tear down the live display (stop the timer, restore the cursor) before the
  // error prints, so a crash mid-run doesn't leave the terminal in a bad state.
  progress.end()
  console.error(e)
  process.exit(1)
})
