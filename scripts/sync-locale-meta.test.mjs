import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { syncLocaleMeta, syncLocalePages } from './sync-locale-meta.mjs'

describe('syncLocalePages', () => {
  it('adds pages that only exist in the English sidebar', () => {
    expect(syncLocalePages(['---Core---', 'a', 'b', 'c'], ['---Kern---', 'a', 'c'])).toEqual([
      '---Kern---',
      'a',
      'b',
      'c',
    ])
  })

  it('drops pages removed from English and follows the English order', () => {
    expect(syncLocalePages(['c', 'a'], ['a', 'old', 'c'])).toEqual(['c', 'a'])
  })

  it('keeps English separators when the section count changed', () => {
    expect(syncLocalePages(['---One---', 'a', '---Two---', 'b'], ['---Eins---', 'a', 'b'])).toEqual(
      ['---One---', 'a', '---Two---', 'b'],
    )
  })

  it('reuses translated link labels by URL', () => {
    expect(
      syncLocalePages(
        ['a', '[Security Policy](https://x/SECURITY.md)', '[New](https://x/new)'],
        ['[Sicherheitsrichtlinie](https://x/SECURITY.md)', 'a'],
      ),
    ).toEqual(['a', '[Sicherheitsrichtlinie](https://x/SECURITY.md)', '[New](https://x/new)'])
  })
})

describe('syncLocaleMeta', () => {
  async function fixture() {
    const docsDir = await mkdtemp(path.join(tmpdir(), 'locale-meta-'))
    await mkdir(path.join(docsDir, 'features'))
    await writeFile(
      path.join(docsDir, 'features', 'meta.json'),
      JSON.stringify({ title: 'Features', pages: ['agents', 'skills'] }),
    )
    await writeFile(
      path.join(docsDir, 'features', 'meta.de.json'),
      JSON.stringify({ title: 'Funktionen', icon: 'Star', pages: ['agents'] }),
    )
    return docsDir
  }

  it('reports stale translated sidebars without writing in check mode', async () => {
    const docsDir = await fixture()
    const result = await syncLocaleMeta({ docsDir })
    expect(result.changedFiles).toEqual([path.join(docsDir, 'features', 'meta.de.json')])
    const unchanged = JSON.parse(await readFile(result.changedFiles[0], 'utf8'))
    expect(unchanged.pages).toEqual(['agents'])
  })

  it('rewrites only the pages list in write mode', async () => {
    const docsDir = await fixture()
    await syncLocaleMeta({ docsDir, write: true })
    const updated = JSON.parse(
      await readFile(path.join(docsDir, 'features', 'meta.de.json'), 'utf8'),
    )
    expect(updated).toEqual({ title: 'Funktionen', icon: 'Star', pages: ['agents', 'skills'] })
    expect((await syncLocaleMeta({ docsDir })).changedFiles).toEqual([])
  })
})
