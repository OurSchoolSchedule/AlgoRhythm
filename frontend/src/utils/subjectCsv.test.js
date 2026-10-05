import { describe, expect, it } from 'vitest'
import { subjectNamesFromCsv } from './subjectCsv.js'

describe('subjectNamesFromCsv', () => {
  it('reads a 과목명 column', () => {
    const parsed = subjectNamesFromCsv('교사명,과목명\n김민지,국어\n이철수,수학\n')
    expect(parsed.names).toEqual(['국어', '수학'])
  })

  it('reads a single column as names', () => {
    const parsed = subjectNamesFromCsv('국어\n영어\n')
    expect(parsed.names).toEqual(['국어', '영어'])
  })

  it('rejects a teacher sheet without a subject column', () => {
    const parsed = subjectNamesFromCsv('교사명,사번\n김민지,1\n')
    expect(parsed.names).toEqual([])
    expect(parsed.error).toContain('과목명')
  })
})
