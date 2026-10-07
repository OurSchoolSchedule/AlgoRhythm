import { describe, expect, it } from 'vitest'
import { hashSubjectKey, resolveSubjectColor } from './subjectColor.js'

describe('resolveSubjectColor', () => {
  it('maps known subjects to fixed keys', () => {
    expect(resolveSubjectColor({ name: '국어' }).key).toBe('rose')
    expect(resolveSubjectColor({ name: '수학' }).key).toBe('sky')
    expect(resolveSubjectColor({ name: '영어' }).key).toBe('violet')
    expect(resolveSubjectColor({ name: '사회' }).key).toBe('yellow')
    expect(resolveSubjectColor({ name: '과학' }).key).toBe('lime')
    expect(resolveSubjectColor({ name: '체육' }).key).toBe('cyan')
    expect(resolveSubjectColor({ name: '음악' }).key).toBe('sand')
    expect(resolveSubjectColor({ name: '미술' }).key).toBe('sand')
    expect(resolveSubjectColor({ name: '기술가정' }).key).toBe('sand')
  })

  it('returns CSS variables for bg/text/dot', () => {
    const color = resolveSubjectColor({ name: '국어' })
    expect(color.bg).toBe('var(--color-subject-rose-bg)')
    expect(color.text).toBe('var(--color-subject-rose-text)')
    expect(color.dot).toBe('var(--color-subject-rose-dot)')
  })

  it('keeps the same color for the same unknown subject id', () => {
    const a = resolveSubjectColor({ id: 42, name: '한문' })
    const b = resolveSubjectColor({ id: 42, name: '한문' })
    expect(a.key).toBe(b.key)
    expect(a.bg).toBe(b.bg)
  })

  it('hashes stably without id', () => {
    expect(hashSubjectKey('도덕')).toBe(hashSubjectKey('도덕'))
    expect(resolveSubjectColor({ name: '도덕' }).key).toBe(hashSubjectKey('도덕'))
  })
})
