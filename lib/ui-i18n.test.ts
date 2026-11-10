import { describe, expect, it } from 'vitest'
import { i18n } from '@/lib/i18n'
import { getUI } from '@/lib/ui-i18n'

describe('localized Node.js installation prerequisites', () => {
  const expected = getUI('en').quickStartHub.methods.npm.prereqs[0]

  for (const locale of i18n.languages) {
    it(`${locale} uses the current English runtime recommendation`, () => {
      expect(getUI(locale).quickStartHub.methods.npm.prereqs[0]).toBe(expected)
    })
  }
})
