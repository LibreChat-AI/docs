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

  it('translates each section by the pages it shares', () => {
    expect(
      syncLocalePages(
        ['---Services---', 's', '---Infrastructure---', 'i'],
        ['---Infrastruktur---', 'i', '---Dienste---', 's'],
      ),
    ).toEqual(['---Dienste---', 's', '---Infrastruktur---', 'i'])
  })

  it('keeps the English separator for a section without shared pages', () => {
    expect(syncLocalePages(['---One---', 'a', '---Two---', 'b'], ['---Eins---', 'a', 'b'])).toEqual(
      ['---Eins---', 'a', '---Two---', 'b'],
    )
    expect(syncLocalePages(['---New---', 'n', '---Old---', 'o'], ['---Alt---', 'o'])).toEqual([
      '---New---',
      'n',
      '---Alt---',
      'o',
    ])
  })

  it('gives a split section the heading of the part that kept most pages', () => {
    expect(
      syncLocalePages(['---New---', 'a', '---Core---', 'b', 'c'], ['---Kern---', 'a', 'b', 'c']),
    ).toEqual(['---New---', 'a', '---Kern---', 'b', 'c'])
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

  it('reports and creates a translated sidebar missing from one folder', async () => {
    const docsDir = await fixture()
    await mkdir(path.join(docsDir, 'guides'))
    await writeFile(
      path.join(docsDir, 'guides', 'meta.json'),
      JSON.stringify({ title: 'Guides', pages: ['intro'] }),
    )
    const missing = path.join(docsDir, 'guides', 'meta.de.json')
    expect((await syncLocaleMeta({ docsDir })).changedFiles).toContain(missing)
    await syncLocaleMeta({ docsDir, write: true })
    expect(JSON.parse(await readFile(missing, 'utf8'))).toEqual({
      title: 'Guides',
      pages: ['intro'],
    })
  })
})
