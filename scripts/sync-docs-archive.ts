import { execFile as execFileCallback } from 'node:child_process'
import { appendFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { compareDocsVersionsDescending, DOCS_VERSION_ID_PATTERN } from '../lib/docs-version-order'
import { archiveDocsVersion } from './archive-docs-version'

/**
 * Keeps content/docs-archive in step with LibreChat's published releases.
 *
 * Every release and release candidate newer than the newest snapshot is
 * archived from the docs commit that was on the branch when it was published.
 * Candidate snapshots stay until their final release is archived, then they
 * are removed: every snapshot is bundled into the build, and keeping each
 * candidate forever pushes the bundle past what webpack can emit.
 */

const execFile = promisify(execFileCallback)
const PREFIX = '[docs-archive-sync]'
const RELEASE_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:-rc\d+)?$/
const DEFAULT_REPOSITORY = 'LibreChat-AI/LibreChat'

export interface Release {
  tag: string
  /** ISO timestamp the release was published at. */
  publishedAt: string
}

export interface ArchivePlan {
  archive: Release[]
  remove: string[]
}

const isCandidate = (id: string) => id.includes('-rc')
const seriesOf = (id: string) => id.split('-rc')[0]
const isNewer = (left: string, right: string) => compareDocsVersionsDescending(left, right) < 0

/**
 * Decide which releases to snapshot and which candidate snapshots to drop.
 *
 * Only releases newer than the newest existing snapshot are considered, so
 * the archive never grows backwards. A candidate is skipped when its final
 * release is already out, and every candidate snapshot whose final release is
 * (or is about to be) archived is removed.
 */
export function planArchiveSync(
  releases: readonly Release[],
  archived: readonly string[],
): ArchivePlan {
  const existing = archived.filter((id) => DOCS_VERSION_ID_PATTERN.test(id))
  const newestArchived = [...existing].sort(compareDocsVersionsDescending)[0]

  const pending = releases
    .filter((release) => RELEASE_TAG_PATTERN.test(release.tag))
    .filter((release) => !existing.includes(release.tag))
    .filter((release) => !newestArchived || isNewer(release.tag, newestArchived))

  const stableIds = [...existing, ...pending.map((release) => release.tag)].filter(
    (id) => !isCandidate(id),
  )
  const isReleased = (candidate: string) =>
    stableIds.some((stable) => !isNewer(seriesOf(candidate), stable))

  const archive = pending
    .filter((release) => !isCandidate(release.tag) || !isReleased(release.tag))
    .sort((left, right) => compareDocsVersionsDescending(right.tag, left.tag))
  const remove = existing.filter((id) => isCandidate(id) && isReleased(id)).sort()

  return { archive, remove }
}

async function fetchReleases(repository: string, token?: string): Promise<Release[]> {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=50`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'docs-archive-sync',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    throw new Error(`${PREFIX} GitHub releases request failed: ${response.status}`)
  }
  const body = (await response.json()) as Array<{
    tag_name: string
    draft: boolean
    published_at: string | null
  }>
  return body.flatMap((release) =>
    !release.draft && release.published_at
      ? [{ tag: release.tag_name, publishedAt: release.published_at }]
      : [],
  )
}

/** The last commit on `ref` at or before `timestamp`, so a snapshot matches its release day. */
export async function commitAt(timestamp: string, cwd: string, ref = 'HEAD'): Promise<string> {
  const { stdout } = await execFile('git', ['rev-list', '-1', `--before=${timestamp}`, ref], {
    cwd,
  })
  const commit = stdout.trim()
  if (!commit) {
    throw new Error(`${PREFIX} no commit on ${ref} before ${timestamp}`)
  }
  return commit
}

async function listArchived(cwd: string): Promise<string[]> {
  const entries = await readdir(path.join(cwd, 'content', 'docs-archive'), { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

function describePlan(
  plan: ArchivePlan,
  refs: Map<string, string>,
): { title: string; body: string } {
  const added = plan.archive.map((release) => release.tag)
  const title = added.length
    ? `🗄️ docs: Archive ${added.join(', ')} Docs Snapshot${added.length > 1 ? 's' : ''}`
    : `🗄️ docs: Remove Superseded Release Candidate Snapshots`
  const lines = ['Automated sync of `content/docs-archive` with LibreChat releases.', '']
  for (const release of plan.archive) {
    lines.push(
      `- Archived \`${release.tag}\` from \`${refs.get(release.tag)}\`, the last docs commit before it was published (${release.publishedAt}).`,
    )
  }
  for (const id of plan.remove) {
    lines.push(`- Removed \`${id}\`: its final release is archived.`)
  }
  return { title, body: lines.join('\n') }
}

async function writeOutputs(outputs: Record<string, string>): Promise<void> {
  const file = process.env.GITHUB_OUTPUT
  if (!file) return
  for (const [key, value] of Object.entries(outputs)) {
    const delimiter = `EOF_${key.toUpperCase()}`
    await appendFile(file, `${key}<<${delimiter}\n${value}\n${delimiter}\n`)
  }
}

export async function main(): Promise<void> {
  const cwd = process.cwd()
  const dryRun = process.argv.includes('--dry-run')
  const repository = process.env.LIBRECHAT_REPOSITORY || DEFAULT_REPOSITORY

  const releases = await fetchReleases(repository, process.env.GITHUB_TOKEN)
  const plan = planArchiveSync(releases, await listArchived(cwd))

  if (!plan.archive.length && !plan.remove.length) {
    console.log(`${PREFIX} archive is up to date`)
    await writeOutputs({ changed: 'false' })
    return
  }

  const refs = new Map<string, string>()
  for (const release of plan.archive) {
    refs.set(release.tag, await commitAt(release.publishedAt, cwd))
  }

  const { title, body } = describePlan(plan, refs)
  console.log(`${PREFIX} ${title}\n${body}`)
  if (dryRun) return

  for (const release of plan.archive) {
    const result = await archiveDocsVersion({
      version: release.tag,
      ref: refs.get(release.tag),
      cwd,
    })
    console.log(`${PREFIX} ${result.version}: ${result.filesWritten} files from ${result.ref}`)
  }
  for (const id of plan.remove) {
    await rm(path.join(cwd, 'content', 'docs-archive', id), { recursive: true, force: true })
  }

  await writeOutputs({ changed: 'true', title, body })
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null

if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : `${PREFIX} ${String(error)}`)
    process.exitCode = 1
  })
}
