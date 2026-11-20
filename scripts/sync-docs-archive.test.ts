import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_ARCHIVED_SNAPSHOTS,
  commitAt,
  fetchReleases,
  planArchiveSync,
  type Release,
} from './sync-docs-archive'

const execFile = promisify(execFileCallback)
const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

const release = (tag: string): Release => ({ tag, publishedAt: '2026-10-01T00:00:00Z' })
const tags = (releases: Release[]) => releases.map((entry) => entry.tag)

describe('planArchiveSync', () => {
  it('archives a new release candidate and keeps the existing ones', () => {
    const plan = planArchiveSync(
      [release('v0.8.9-rc2'), release('v0.8.9-rc1'), release('v0.8.8')],
      ['v0.8.8', 'v0.8.9-rc1'],
    )
    expect(tags(plan.archive)).toEqual(['v0.8.9-rc2'])
    expect(plan.remove).toEqual([])
  })

  it('archives a final release and removes its candidates', () => {
    const plan = planArchiveSync(
      [release('v0.8.9'), release('v0.8.9-rc2'), release('v0.8.9-rc1')],
      ['v0.8.8', 'v0.8.9-rc1', 'v0.8.9-rc2'],
    )
    expect(tags(plan.archive)).toEqual(['v0.8.9'])
    expect(plan.remove).toEqual(['v0.8.9-rc1', 'v0.8.9-rc2'])
  })

  it('skips candidates that were superseded between runs', () => {
    const plan = planArchiveSync(
      [release('v0.9.0-rc1'), release('v0.8.9'), release('v0.8.9-rc1')],
      ['v0.8.8'],
    )
    expect(tags(plan.archive)).toEqual(['v0.8.9', 'v0.9.0-rc1'])
    expect(plan.remove).toEqual([])
  })

  it('never archives releases older than the newest archived release', () => {
    const plan = planArchiveSync(
      [release('v0.8.9-rc1'), release('v0.8.7-rc1'), release('v0.8.6')],
      ['v0.8.8', 'v0.8.9-rc1'],
    )
    expect(plan).toEqual({ archive: [], remove: [] })
  })

  it('ignores tags and directories outside the release shape', () => {
    const plan = planArchiveSync(
      [release('v0.9.0-beta'), release('chart-1.2.3'), release('v0.9.0-rc')],
      ['v0.8.8', 'README.md'],
    )
    expect(plan).toEqual({ archive: [], remove: [] })
  })

  it('compares versions numerically', () => {
    const plan = planArchiveSync([release('v0.10.0-rc1')], ['v0.9.12'])
    expect(tags(plan.archive)).toEqual(['v0.10.0-rc1'])
  })

  it('archives a final release below a newer archived candidate', () => {
    const plan = planArchiveSync(
      [release('v0.9.0-rc1'), release('v0.8.9'), release('v0.8.9-rc1')],
      ['v0.8.8', 'v0.8.9-rc1', 'v0.9.0-rc1'],
    )
    expect(tags(plan.archive)).toEqual(['v0.8.9'])
    expect(plan.remove).toEqual(['v0.8.9-rc1'])
  })

  it('lets hand-made series snapshots hold nothing back and never removes them', () => {
    const plan = planArchiveSync(
      [release('v0.8.9-rc1'), release('v0.8.8')],
      ['v0.7.x', 'v0.8.8', 'v0.8.x'],
    )
    expect(tags(plan.archive)).toEqual(['v0.8.9-rc1'])
    expect(plan.remove).toEqual([])
  })

  it('refuses to sync without a final release snapshot to start from', () => {
    expect(() => planArchiveSync([release('v0.8.9')], [])).toThrow(/no final release snapshot/)
    expect(() => planArchiveSync([release('v0.8.9')], ['v0.7.x', 'v0.8.9-rc1'])).toThrow(
      /no final release snapshot/,
    )
  })

  it('stops before the archive outgrows what the build can bundle', () => {
    const finals = Array.from({ length: MAX_ARCHIVED_SNAPSHOTS }, (_, minor) => `v0.${minor}.0`)
    expect(() => planArchiveSync([release('v1.0.0')], finals)).toThrow(/retire the oldest/)

    const withCandidate = [...finals.slice(1), 'v1.0.0-rc1']
    expect(tags(planArchiveSync([release('v1.0.0')], withCandidate).archive)).toEqual(['v1.0.0'])
  })
})

describe('fetchReleases', () => {
  it('follows pagination to the last page and skips drafts', async () => {
    const pages = [
      Array.from({ length: 100 }, (_, index) => ({
        tag_name: `v0.${index}.0`,
        draft: false,
        published_at: '2026-01-01T00:00:00Z',
      })),
      [
        { tag_name: 'v0.8.9-rc1', draft: false, published_at: '2026-10-26T21:55:28Z' },
        { tag_name: 'v0.9.0', draft: true, published_at: null },
      ],
    ]
    const fetch = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'))
      return new Response(JSON.stringify(pages[page - 1] ?? []), { status: 200 })
    })
    vi.stubGlobal('fetch', fetch)

    const releases = await fetchReleases('LibreChat-AI/LibreChat')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(releases).toHaveLength(101)
    expect(releases.at(-1)).toEqual({ tag: 'v0.8.9-rc1', publishedAt: '2026-10-26T21:55:28Z' })
  })
})

describe('commitAt', () => {
  async function git(cwd: string, args: string[], date: string): Promise<string> {
    const { stdout } = await execFile('git', args, {
      cwd,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Archive Sync Test',
        GIT_AUTHOR_EMAIL: 'archive-sync@example.test',
        GIT_COMMITTER_NAME: 'Archive Sync Test',
        GIT_COMMITTER_EMAIL: 'archive-sync@example.test',
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
    })
    return stdout.trim()
  }

  it('ignores commits of a branch merged into main after the release', async () => {
    const repository = await mkdtemp(path.join(os.tmpdir(), 'docs-archive-commit-at-'))
    temporaryDirectories.push(repository)
    const commit = async (file: string, date: string) => {
      await writeFile(path.join(repository, file), date)
      await git(repository, ['add', file], date)
      await git(repository, ['commit', '-q', '-m', file], date)
      return git(repository, ['rev-parse', 'HEAD'], date)
    }

    await git(repository, ['init', '-q', '-b', 'main'], '2026-10-26T10:00:00Z')
    const onMain = await commit('main.mdx', '2026-10-26T10:00:00Z')
    await git(repository, ['checkout', '-q', '-b', 'feature'], '2026-10-26T11:00:00Z')
    await commit('feature.mdx', '2026-10-26T11:00:00Z')
    await git(repository, ['checkout', '-q', 'main'], '2026-10-27T09:00:00Z')
    await git(
      repository,
      ['merge', '-q', '--no-ff', '-m', 'merge', 'feature'],
      '2026-10-27T09:00:00Z',
    )

    expect(await commitAt('2026-10-26T21:55:28Z', repository)).toBe(onMain)
    await expect(commitAt('2026-10-25T00:00:00Z', repository)).rejects.toThrow(
      /no commit on HEAD before 2026-10-25T00:00:00Z/,
    )
  })
})
