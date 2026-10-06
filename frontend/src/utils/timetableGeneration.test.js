import { describe, expect, it } from 'vitest'
import { buildSlotRequirements, termFromStartDate } from './timetableGeneration.js'

describe('termFromStartDate', () => {
  it('3월 시작은 1학기, 9월 시작은 2학기다', () => {
    expect(termFromStartDate('2026-03-02')).toEqual({ academicYear: 2026, semester: 1 })
    expect(termFromStartDate('2026-09-01')).toEqual({ academicYear: 2026, semester: 2 })
  })
})

describe('buildSlotRequirements', () => {
  it('학급·과목·교시가 없으면 빈 배열이다', () => {
    expect(buildSlotRequirements([], [{ id: 1 }], [{ periodNumber: 1 }])).toEqual([])
    expect(buildSlotRequirements([{ id: 1 }], [], [{ periodNumber: 1 }])).toEqual([])
    expect(buildSlotRequirements([{ id: 1 }], [{ id: 2 }], [])).toEqual([])
  })

  it('평일 교시마다 과목을 순환해 요구를 만든다', () => {
    const slots = buildSlotRequirements(
      [{ id: 10 }],
      [{ id: 1 }, { id: 2 }],
      [{ periodNumber: 2 }, { periodNumber: 1 }],
    )
    expect(slots).toHaveLength(10)
    expect(slots[0]).toEqual({
      schoolClassId: 10,
      dayOfWeek: 'MON',
      periodNumber: 1,
      subjectId: 1,
    })
    expect(slots[1].subjectId).toBe(2)
    expect(slots[1].periodNumber).toBe(2)
  })
})
