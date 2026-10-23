import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_DOCS_DIR = 'content/docs'

const LOCALE_META_PATTERN = /^meta\.([\w-]+)\.json$/
const SEPARATOR_PATTERN = /^---.*---$/
const LINK_PATTERN = /^\[[^\]]*\]\(([^)]+)\)$/

function linkTarget(entry) {
  return LINK_PATTERN.exec(entry)?.[1] ?? null
}

/**
 * Rebuilds a locale's `pages` list from the English one. Page slugs always
 * follow English, so a page added to `meta.json` cannot go missing from a
 * translated sidebar. Translated separators are reused by position when the
 * section count still matches, and translated link labels by URL; anything
 * without a translation keeps its English label.
 */
export function syncLocalePages(englishPages, localePages = []) {
  const englishSeparators = englishPages.filter((entry) => SEPARATOR_PATTERN.test(entry))
  const localeSeparators = localePages.filter((entry) => SEPARATOR_PATTERN.test(entry))
  const reuseSeparators = englishSeparators.length === localeSeparators.length
  const localeLinks = new Map(
    localePages.filter(linkTarget).map((entry) => [linkTarget(entry), entry]),
  )
  let separatorIndex = 0

  return englishPages.map((entry) => {
    if (SEPARATOR_PATTERN.test(entry)) {
      const translated = reuseSeparators ? localeSeparators[separatorIndex] : undefined
      separatorIndex += 1
      return translated ?? entry
    }

    const target = linkTarget(entry)
    if (target) {
      return localeLinks.get(target) ?? entry
    }

    return entry
  })
}

async function listMetaDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => listMetaDirs(path.join(dir, entry.name))),
  )
  const own = entries.some((entry) => entry.isFile() && entry.name === 'meta.json') ? [dir] : []
  return own.concat(...nested)
}

export async function syncLocaleMeta({
  docsDir = path.join(process.cwd(), DEFAULT_DOCS_DIR),
  write = false,
} = {}) {
  const changedFiles = []

  for (const dir of await listMetaDirs(docsDir)) {
    const english = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'))
    if (!Array.isArray(english.pages)) {
      continue
    }

    const localeFiles = (await readdir(dir)).filter((name) => LOCALE_META_PATTERN.test(name))

    for (const name of localeFiles) {
      const filePath = path.join(dir, name)
      const original = await readFile(filePath, 'utf8')
      const locale = JSON.parse(original)
      const pages = syncLocalePages(english.pages, locale.pages)

      if (JSON.stringify(pages) === JSON.stringify(locale.pages)) {
        continue
      }

      changedFiles.push(filePath)

      if (write) {
        await writeFile(filePath, `${JSON.stringify({ ...locale, pages }, null, 2)}\n`)
      }
    }
  }

  return { changedFiles }
}

function usage() {
  return [
    'Usage: node scripts/sync-locale-meta.mjs [--check|--write]',
    '',
    'Options:',
    '  --check           Report translated sidebars whose pages differ from English (default)',
    '  --write           Rewrite translated sidebars to follow the English pages',
    '  --docs-dir=<dir>  Docs content directory',
  ].join('\n')
}

function parseArgs(argv) {
  const options = { write: false }

  for (const arg of argv) {
    if (arg === '--check') {
      options.write = false
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg.startsWith('--docs-dir=')) {
      options.docsDir = arg.slice('--docs-dir='.length)
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

async function main() {
  let options

  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`[locale-meta] ${error.message}`)
    console.error(usage())
    process.exitCode = 1
    return
  }

  if (options.help) {
    console.log(usage())
    return
  }

  const { changedFiles } = await syncLocaleMeta(options)

  if (changedFiles.length === 0) {
    console.log('[locale-meta] translated sidebars match the English pages')
    return
  }

  const action = options.write ? 'updated' : 'found'
  console.error(`[locale-meta] ${action} ${changedFiles.length} stale translated sidebar(s)`)

  for (const filePath of changedFiles) {
    console.error(`[locale-meta] ${filePath}`)
  }

  if (options.write) {
    return
  }

  console.error('[locale-meta] run `pnpm sync:locale-meta` to update them')
  process.exitCode = 1
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
const modulePath = fileURLToPath(import.meta.url)

if (invokedPath === modulePath) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
