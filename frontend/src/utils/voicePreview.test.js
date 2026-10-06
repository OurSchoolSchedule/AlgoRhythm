import { describe, expect, it } from 'vitest'
import { canConfirmVoicePreview, previewLines } from './voicePreview.js'

describe('voice preview', () => {
  it('keeps only primitive preview fields', () => {
    expect(previewLines({
      note: '출장',
      periodNumber: 3,
      nested: { a: 1 },
      empty: '',
    })).toEqual([
      { key: 'note', value: '출장' },
      { key: 'periodNumber', value: '3' },
    ])
  })

  it('confirms only a named intent with a draft token', () => {
    expect(canConfirmVoicePreview({ draftToken: 't', intentType: 'SUBSTITUTE_CREATE' })).toBe(true)
    expect(canConfirmVoicePreview({ draftToken: 't', intentType: 'UNKNOWN' })).toBe(false)
    expect(canConfirmVoicePreview({ intentType: 'AVAILABILITY_ADD' })).toBe(false)
  })
})
