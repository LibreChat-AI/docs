import { test, expect } from '@playwright/test'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'

/**
 * `pnpm docs:archive:sync` end to end: the real script runs in a throwaway git
 * repository against a local stand-in for the GitHub releases API, the way the
 * Sync docs archive workflow runs it on main. No page is involved, so these
 * tests ignore the web server the suite starts.
 */

const ROOT = path.resolve(__dirname, '..')
const TSX = path.join(ROOT, 'node_modules', '.bin', 'tsx')
const SCRIPT = path.join(ROOT, 'scripts', 'sync-docs-archive.ts')
const REPOSITORY = 'LibreChat-AI/LibreChat'

const BEFORE_RELEASE = '2026-10-26T12:00:00Z'
const RELEASED_AT = '2026-10-26T21:55:28Z'
const AFTER_RELEASE = '2026-10-27T09:00:00Z'
const OLDER_RELEASE = '2026-10-01T02:49:17Z'

const RELEASE_DAY_DOCS = 'Release-day docs. See [setup](/docs/setup).\n'
const LATER_DOCS = 'Docs written after the release.\n'

interface Release {
  tag: string
  publishedAt?: string
}

interface SyncRun {
  code: number
  stdout: string
  stderr: string
  outputs: Record<string, string>
}

test.describe.configure({ mode: 'parallel' })

const cleanup: Array<() => Promise<void>> = []

test.afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dispose) => dispose()))
})

function command(
  file: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(file, args, { ...options, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
      resolve({ code, stdout, stderr })
    })
  })
}

async function git(cwd: string, args: string[], date?: string): Promise<string> {
  const result = await command('git', args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Archive Sync Test',
      GIT_AUTHOR_EMAIL: 'archive-sync@example.test',
      GIT_COMMITTER_NAME: 'Archive Sync Test',
      GIT_COMMITTER_EMAIL: 'archive-sync@example.test',
      ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
    },
  })
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout
}

/**
 * A docs repository whose history has release-day docs, then docs written
 * after the release, with the given versions already archived.
 */
async function docsRepository(archived: string[]): Promise<string> {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'docs-archive-sync-'))
  cleanup.push(() => rm(repository, { recursive: true, force: true }))

  await git(repository, ['init', '-q', '-b', 'main'])
  await mkdir(path.join(repository, 'content', 'docs'), { recursive: true })
  await writeFile(path.join(repository, 'content', 'docs', 'index.mdx'), RELEASE_DAY_DOCS)
  await writeFile(path.join(repository, 'content', 'docs', 'index.de.mdx'), 'Ubersetzt.\n')
  await mkdir(path.join(repository, 'content', 'docs-archive'), { recursive: true })
  await writeFile(path.join(repository, 'content', 'docs-archive', 'README.md'), '# Archive\n')
  for (const version of archived) {
    const directory = path.join(repository, 'content', 'docs-archive', version)
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'index.mdx'), `Frozen ${version} docs.\n`)
  }
  await git(repository, ['add', '-A'])
  await git(repository, ['commit', '-q', '-m', 'release-day docs'], BEFORE_RELEASE)

  await writeFile(path.join(repository, 'content', 'docs', 'index.mdx'), LATER_DOCS)
  await git(repository, ['commit', '-q', '-am', 'docs after the release'], AFTER_RELEASE)

  return repository
}

/** A stand-in for `GET /repos/{owner}/{repo}/releases`, newest first like GitHub's. */
async function releasesApi(releases: Release[], status = 200): Promise<string> {
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname !== `/repos/${REPOSITORY}/releases`) {
      response.writeHead(404).end()
      return
    }
    if (status !== 200) {
      response.writeHead(status, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ message: 'Server Error' }))
      return
    }
    const page = Number(url.searchParams.get('page') ?? '1')
    const body =
      page === 1
        ? releases.map((release) => ({
            tag_name: release.tag,
            draft: false,
            published_at: release.publishedAt ?? OLDER_RELEASE,
          }))
        : []
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

/** Run the sync the way the workflow does, collecting what it wrote to GITHUB_OUTPUT. */
async function sync(repository: string, apiUrl: string): Promise<SyncRun> {
  const outputFile = path.join(repository, '..', `${path.basename(repository)}.github-output`)
  await writeFile(outputFile, '')
  cleanup.push(() => rm(outputFile, { force: true }))

  const result = await command(TSX, [SCRIPT], {
    cwd: repository,
    env: {
      ...process.env,
      GITHUB_API_URL: apiUrl,
      GITHUB_OUTPUT: outputFile,
      GITHUB_TOKEN: '',
      LIBRECHAT_REPOSITORY: REPOSITORY,
    },
  })

  const outputs: Record<string, string> = {}
  const pattern = /^(\w+)<<(EOF_\w+)\n([\s\S]*?)\n\2$/gm
  for (const match of (await readFile(outputFile, 'utf8')).matchAll(pattern)) {
    outputs[match[1]] = match[3]
  }
  return { ...result, outputs }
}

async function archivedVersions(repository: string): Promise<string[]> {
  const entries = await readdir(path.join(repository, 'content', 'docs-archive'), {
    withFileTypes: true,
  })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

async function snapshotIndex(repository: string, version: string): Promise<string> {
  return readFile(path.join(repository, 'content', 'docs-archive', version, 'index.mdx'), 'utf8')
}

test('@scenario:new-release-candidate-is-archived-from-its-release-day a newly published release candidate is archived from the docs main held when it was published', async () => {
  const repository = await docsRepository(['v0.8.8'])
  const api = await releasesApi([
    { tag: 'v0.8.9-rc1', publishedAt: RELEASED_AT },
    { tag: 'v0.8.8' },
    { tag: 'v0.8.8-rc4' },
  ])

  const run = await sync(repository, api)

  expect(run.code, run.stderr).toBe(0)
  expect(await archivedVersions(repository)).toEqual(['v0.8.8', 'v0.8.9-rc1'])
  const snapshot = await snapshotIndex(repository, 'v0.8.9-rc1')
  expect(snapshot).toContain('Release-day docs.')
  expect(snapshot).not.toContain(LATER_DOCS.trim())
  expect(snapshot).toContain('](/v0.8.9-rc1/docs/setup)')
  await expect(
    readFile(
      path.join(repository, 'content', 'docs-archive', 'v0.8.9-rc1', 'index.de.mdx'),
      'utf8',
    ),
  ).rejects.toThrow()

  const releaseDayCommit = (await git(repository, ['rev-parse', 'HEAD~1'])).trim()
  expect(run.outputs.changed).toBe('true')
  expect(run.outputs.title).toContain('v0.8.9-rc1')
  expect(run.outputs.body).toContain(releaseDayCommit)
})

test('@scenario:candidate-snapshots-stay-until-the-final-release a second release candidate is archived next to the first one', async () => {
  const repository = await docsRepository(['v0.8.8', 'v0.8.9-rc1'])
  const api = await releasesApi([
    { tag: 'v0.8.9-rc2', publishedAt: RELEASED_AT },
    { tag: 'v0.8.9-rc1' },
    { tag: 'v0.8.8' },
  ])

  const run = await sync(repository, api)

  expect(run.code, run.stderr).toBe(0)
  expect(await archivedVersions(repository)).toEqual(['v0.8.8', 'v0.8.9-rc1', 'v0.8.9-rc2'])
  expect(await snapshotIndex(repository, 'v0.8.9-rc1')).toBe('Frozen v0.8.9-rc1 docs.\n')
  expect(run.outputs.body).not.toContain('Removed')
})

test('@scenario:final-release-replaces-its-candidate-snapshots the final release is archived and its release candidate snapshots are removed', async () => {
  const repository = await docsRepository(['v0.8.8', 'v0.8.9-rc1', 'v0.8.9-rc2'])
  const api = await releasesApi([
    { tag: 'v0.8.9', publishedAt: RELEASED_AT },
    { tag: 'v0.8.9-rc2' },
    { tag: 'v0.8.9-rc1' },
    { tag: 'v0.8.8' },
  ])

  const run = await sync(repository, api)

  expect(run.code, run.stderr).toBe(0)
  expect(await archivedVersions(repository)).toEqual(['v0.8.8', 'v0.8.9'])
  expect(await snapshotIndex(repository, 'v0.8.9')).toContain('Release-day docs.')
  expect(run.outputs.title).toContain('v0.8.9')
  expect(run.outputs.body).toContain('Removed `v0.8.9-rc1`')
  expect(run.outputs.body).toContain('Removed `v0.8.9-rc2`')
})

test('@scenario:sync-with-nothing-new-changes-nothing a run with no new release leaves the archive untouched and opens no PR', async () => {
  const repository = await docsRepository(['v0.8.8', 'v0.8.9-rc1'])
  const api = await releasesApi([{ tag: 'v0.8.9-rc1' }, { tag: 'v0.8.8' }])

  const run = await sync(repository, api)

  expect(run.code, run.stderr).toBe(0)
  expect(run.stdout).toContain('archive is up to date')
  expect(run.outputs).toEqual({ changed: 'false' })
  expect(await git(repository, ['status', '--porcelain'])).toBe('')
})

test('@scenario:releases-api-failure-changes-nothing a failed releases request fails the run without touching the archive', async () => {
  const repository = await docsRepository(['v0.8.8'])
  const api = await releasesApi([], 502)

  const run = await sync(repository, api)

  expect(run.code).not.toBe(0)
  expect(run.stderr).toContain('GitHub releases request failed: 502')
  expect(run.outputs).toEqual({})
  expect(await git(repository, ['status', '--porcelain'])).toBe('')
})
