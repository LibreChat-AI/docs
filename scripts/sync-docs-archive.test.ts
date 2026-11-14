import { describe, expect, it } from 'vitest'
import { planArchiveSync, type Release } from './sync-docs-archive'

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

  it('never archives releases older than the newest snapshot', () => {
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
})
