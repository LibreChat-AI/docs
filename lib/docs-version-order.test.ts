import { describe, expect, it } from 'vitest'
import {
  DOCS_VERSION_ID_PATTERN,
  compareDocsVersionsDescending,
  docsVersionSortKey,
  isUpcomingCandidate,
  latestStableVersion,
} from './docs-version-order'

describe('docs version ids', () => {
  it('accepts release, patch, series and release-candidate ids', () => {
    for (const id of ['v0.8.7', 'v0.8.8-rc2', 'v0.7.x', 'v1.0', 'v0.7.3-rc']) {
      expect(DOCS_VERSION_ID_PATTERN.test(id)).toBe(true)
    }

    for (const id of ['0.8.7', 'v0', 'latest', 'v0.8.7.1', 'v0.8.7-beta1', 'v0.8.7-rcx']) {
      expect(DOCS_VERSION_ID_PATTERN.test(id)).toBe(false)
    }
  })

  it('pads a two-part id so it compares against three-part ids', () => {
    expect(docsVersionSortKey('v1.0')).toEqual([1, 0, 0, Number.POSITIVE_INFINITY])
  })

  it('orders newest first, with releases above their candidates', () => {
    const ordered = [
      'v0.8.3-rc1',
      'v0.8.8',
      'v0.8.8-rc1',
      'v0.8.8-rc2',
      'v0.8.7',
      'v0.9.x',
      'v0.8.x',
      'v0.10.0',
    ].sort(compareDocsVersionsDescending)

    expect(ordered).toEqual([
      'v0.10.0',
      'v0.9.x',
      'v0.8.x',
      'v0.8.8',
      'v0.8.8-rc2',
      'v0.8.8-rc1',
      'v0.8.7',
      'v0.8.3-rc1',
    ])
  })

  it('ranks an unnumbered candidate below a numbered one', () => {
    expect(compareDocsVersionsDescending('v0.7.3-rc1', 'v0.7.3-rc')).toBeLessThan(0)
  })

  it('treats two identical series as equal instead of NaN', () => {
    expect(compareDocsVersionsDescending('v0.8.x', 'v0.8.x')).toBe(0)
  })
})

describe('latestStableVersion', () => {
  it('skips newer release candidates and picks the newest release', () => {
    expect(latestStableVersion(['v0.8.7', 'v0.8.9-rc1', 'v0.8.8', 'v0.8.8-rc4'])).toBe('v0.8.8')
  })

  it('returns undefined when only release candidates exist', () => {
    expect(latestStableVersion(['v0.8.8-rc1', 'v0.8.8-rc2'])).toBeUndefined()
    expect(latestStableVersion([])).toBeUndefined()
  })
})

describe('isUpcomingCandidate', () => {
  it('flags candidates newer than the latest release', () => {
    expect(isUpcomingCandidate('v0.8.9-rc1', 'v0.8.8')).toBe(true)
    expect(isUpcomingCandidate('v0.9.0-rc2', 'v0.8.8')).toBe(true)
    expect(isUpcomingCandidate('v0.8.9-rc1', undefined)).toBe(true)
  })

  it('does not flag releases or candidates the latest release has superseded', () => {
    expect(isUpcomingCandidate('v0.8.8', 'v0.8.8')).toBe(false)
    expect(isUpcomingCandidate('v0.8.7', 'v0.8.8')).toBe(false)
    expect(isUpcomingCandidate('v0.8.8-rc4', 'v0.8.8')).toBe(false)
    expect(isUpcomingCandidate('v0.8.7-rc1', 'v0.8.8')).toBe(false)
  })
})
