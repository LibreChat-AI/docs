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

function entryKey(entry) {
  return linkTarget(entry) ?? entry
}

/** Maps each separator to the pages listed under it, up to the next separator. */
function sectionPages(pages) {
  const sections = []
  for (const entry of pages) {
    if (SEPARATOR_PATTERN.test(entry)) {
      sections.push({ separator: entry, pages: new Set() })
    } else if (sections.length > 0) {
      sections[sections.length - 1].pages.add(entryKey(entry))
    }
  }
  return sections
}

/**
 * Rebuilds a locale's `pages` list from the English one. Page slugs always
 * follow English, so a page added to `meta.json` cannot go missing from a
 * translated sidebar. A translated separator is reused for the English
 * section that shares the most pages with it, so reordered or regrouped
 * sections keep the right heading, and translated link labels are reused by
 * URL; anything without a translation keeps its English label. A renamed
 * English heading keeps its old translation, because the pages cannot tell a
 * rename from a regroup, so update the translated headings by hand when you
 * rename one.
 */
export function syncLocalePages(englishPages, localePages = []) {
  const englishSections = sectionPages(englishPages)
  const localeSections = sectionPages(localePages)
  // Strongest overlap first, so a split section cannot take the heading of
  // the section that kept most of the original pages.
  const candidates = englishSections.flatMap((english, englishIndex) =>
    localeSections.map((locale, localeIndex) => ({
      english,
      locale,
      englishIndex,
      localeIndex,
      shared: [...locale.pages].filter((page) => english.pages.has(page)).length,
    })),
  )
  candidates.sort(
    (a, b) =>
      b.shared - a.shared || a.englishIndex - b.englishIndex || a.localeIndex - b.localeIndex,
  )
  const translatedSeparators = new Map()
  const usedLocale = new Set()
  for (const { english, locale, shared } of candidates) {
    if (shared === 0 || translatedSeparators.has(english) || usedLocale.has(locale)) {
      continue
    }
    translatedSeparators.set(english, locale.separator)
    usedLocale.add(locale)
  }
  const separatorByIndex = englishSections.map((section) => translatedSeparators.get(section))
  const localeLinks = new Map(
    localePages.filter(linkTarget).map((entry) => [linkTarget(entry), entry]),
  )

  let sectionIndex = -1
  return englishPages.map((entry) => {
    if (SEPARATOR_PATTERN.test(entry)) {
      sectionIndex += 1
      return separatorByIndex[sectionIndex] ?? entry
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
  const metaDirs = await listMetaDirs(docsDir)
  const localeFilesByDir = new Map()
  for (const dir of metaDirs) {
    localeFilesByDir.set(
      dir,
      (await readdir(dir)).filter((name) => LOCALE_META_PATTERN.test(name)),
    )
  }
  // Every sidebar folder needs the locales used anywhere else, so a deleted
  // file or a new folder without translations is reported too.
  const expectedFiles = [...new Set([...localeFilesByDir.values()].flat())].sort()

  for (const dir of metaDirs) {
    const english = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'))
    if (!Array.isArray(english.pages)) {
      continue
    }

    const present = new Set(localeFilesByDir.get(dir))

    for (const name of expectedFiles) {
      const filePath = path.join(dir, name)
      const locale = present.has(name)
        ? JSON.parse(await readFile(filePath, 'utf8'))
        : { ...english, pages: undefined }
      const pages = syncLocalePages(english.pages, locale.pages)

      if (present.has(name) && JSON.stringify(pages) === JSON.stringify(locale.pages)) {
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
    '  --check           Report translated sidebars that are missing or whose pages differ from English (default)',
    '  --write           Rewrite translated sidebars to follow the English pages, creating missing ones from English',
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
