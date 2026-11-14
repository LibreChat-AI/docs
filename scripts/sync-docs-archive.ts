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
 * Every final release newer than the newest archived one, and every release
 * candidate whose final release is not out yet, is archived from the docs
 * commit that was on the branch when it was published. Candidate snapshots
 * stay until their final release is archived, then they are removed: every
 * snapshot is bundled into the build, and keeping each candidate forever
 * pushes the bundle past what webpack can emit.
 */

const execFile = promisify(execFileCallback)
const PREFIX = '[docs-archive-sync]'
const RELEASE_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:-rc\d+)?$/
const DEFAULT_REPOSITORY = 'LibreChat-AI/LibreChat'
const RELEASES_PER_PAGE = 100
const MAX_RELEASE_PAGES = 20

/**
 * webpack fails to emit the bundle with 17 archived versions (see the Docs
 * Versions section of README.md), so a sync that would reach that many stops
 * instead of opening a PR that cannot build.
 */
export const MAX_ARCHIVED_SNAPSHOTS = 16

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
const isRelease = (id: string) => RELEASE_TAG_PATTERN.test(id) && !isCandidate(id)
const seriesOf = (id: string) => id.split('-rc')[0]
const isNewer = (left: string, right: string) => compareDocsVersionsDescending(left, right) < 0

/**
 * Decide which releases to snapshot and which candidate snapshots to drop.
 *
 * Final releases are compared with the newest archived final release, so a
 * candidate of a newer version never holds back the final release of an older
 * one. A candidate counts as released once a final release of its version, or
 * of any newer version, is archived or about to be; released candidates are
 * neither archived nor kept. Hand-made series snapshots (`v0.7.x`) take no
 * part in either decision.
 */
export function planArchiveSync(
  releases: readonly Release[],
  archived: readonly string[],
): ArchivePlan {
  const existing = archived.filter((id) => DOCS_VERSION_ID_PATTERN.test(id))
  const latestRelease = existing.filter(isRelease).sort(compareDocsVersionsDescending)[0]
  if (!latestRelease) {
    throw new Error(
      `${PREFIX} content/docs-archive has no final release snapshot to sync from; archive the current release by hand with pnpm docs:archive`,
    )
  }

  const published = releases.filter(
    (release) => RELEASE_TAG_PATTERN.test(release.tag) && !existing.includes(release.tag),
  )
  const finals = published.filter(
    (release) => !isCandidate(release.tag) && isNewer(release.tag, latestRelease),
  )

  const releaseIds = [...existing.filter(isRelease), ...finals.map((release) => release.tag)]
  const isReleased = (candidate: string) =>
    releaseIds.some((release) => !isNewer(seriesOf(candidate), release))

  const candidates = published.filter(
    (release) => isCandidate(release.tag) && !isReleased(release.tag),
  )
  const archive = [...finals, ...candidates].sort((left, right) =>
    compareDocsVersionsDescending(right.tag, left.tag),
  )
  const remove = existing.filter((id) => isCandidate(id) && isReleased(id)).sort()

  const total = existing.length + archive.length - remove.length
  if (total > MAX_ARCHIVED_SNAPSHOTS) {
    throw new Error(
      `${PREFIX} archiving ${archive.map((release) => release.tag).join(', ')} would leave ${total} snapshots, above the ${MAX_ARCHIVED_SNAPSHOTS} the build can bundle; retire the oldest snapshots first`,
    )
  }

  return { archive, remove }
}

/** Every published (non-draft) release, following pagination to the last page. */
async function fetchReleases(repository: string, token?: string): Promise<Release[]> {
  const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com'
  const releases: Release[] = []

  for (let page = 1; page <= MAX_RELEASE_PAGES; page += 1) {
    const response = await fetch(
      `${apiUrl}/repos/${repository}/releases?per_page=${RELEASES_PER_PAGE}&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'docs-archive-sync',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    )
    if (!response.ok) {
      throw new Error(`${PREFIX} GitHub releases request failed: ${response.status}`)
    }
    const body = (await response.json()) as Array<{
      tag_name: string
      draft: boolean
      published_at: string | null
    }>
    for (const release of body) {
      if (!release.draft && release.published_at) {
        releases.push({ tag: release.tag_name, publishedAt: release.published_at })
      }
    }
    if (body.length < RELEASES_PER_PAGE) return releases
  }

  throw new Error(`${PREFIX} more than ${MAX_RELEASE_PAGES} pages of releases; refusing to guess`)
}

/**
 * The last commit on `ref`'s own history at or before `timestamp`, so a
 * snapshot matches what the branch held on release day. `--first-parent`
 * keeps commits of branches merged later out of the running.
 */
export async function commitAt(timestamp: string, cwd: string, ref = 'HEAD'): Promise<string> {
  const { stdout } = await execFile(
    'git',
    ['rev-list', '-1', '--first-parent', `--before=${timestamp}`, ref],
    { cwd },
  )
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
    if (!result.filesWritten) {
      throw new Error(`${PREFIX} ${result.version}: no docs at ${result.ref}, nothing to archive`)
    }
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
