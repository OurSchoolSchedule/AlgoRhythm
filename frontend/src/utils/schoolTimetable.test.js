import { describe, it, expect } from 'vitest'
import {
  getKoreanWeekdayKey,
  getPeriodFromDatetime,
  shiftToTimetableCell,
  buildSchoolTimetable,
} from './schoolTimetable.js'

// 로컬 시간 기준으로 Date를 생성해 CI 타임존 영향을 줄인다.
// 2026-01-05 = 월요일
const MON = (h, m = 0) => new Date(2026, 0, 5, h, m)
const SUN = (h, m = 0) => new Date(2026, 0, 4, h, m)

describe('getKoreanWeekdayKey', () => {
  it('월요일을 "월"로 매핑한다', () => {
    expect(getKoreanWeekdayKey(MON(9))).toBe('월')
  })

  it('주말(일요일)은 시간표에 없으므로 null을 반환한다', () => {
    expect(getKoreanWeekdayKey(SUN(9))).toBeNull()
  })
})

describe('getPeriodFromDatetime', () => {
  it('교시 시간대 안의 시각을 해당 교시로 매핑한다', () => {
    expect(getPeriodFromDatetime(MON(9, 0))).toBe(1) // 08:30~09:20
    expect(getPeriodFromDatetime(MON(13, 30))).toBe(5) // 13:20~14:10
  })

  it('어떤 교시와도 30분 넘게 떨어진 시각은 null을 반환한다', () => {
    expect(getPeriodFromDatetime(MON(6, 0))).toBeNull()
  })

  it('유효하지 않은 Date는 null을 반환한다', () => {
    expect(getPeriodFromDatetime(new Date('invalid'))).toBeNull()
  })
})

describe('shiftToTimetableCell', () => {
  it('근무 시프트를 요일/교시 셀로 변환한다', () => {
    const cell = shiftToTimetableCell({
      id: 1,
      startDatetime: '2026-01-05T09:00:00',
      endDatetime: '2026-01-05T09:20:00',
      storeName: 'A고등학교',
      shiftStatus: 'CONFIRMED',
    })

    expect(cell).toMatchObject({
      id: 1,
      dayKey: '월',
      period: 1,
      class: 'A고등학교',
      shiftStatus: 'CONFIRMED',
    })
    expect(cell.subject).toContain('~')
  })

  it('시작 시각이 유효하지 않으면 null을 반환한다', () => {
    const cell = shiftToTimetableCell({
      id: 2,
      startDatetime: 'invalid',
      endDatetime: 'invalid',
    })
    expect(cell).toBeNull()
  })
})

describe('buildSchoolTimetable', () => {
  it('여러 시프트를 주간 시간표로 집계한다', () => {
    const result = buildSchoolTimetable(
      [
        { id: 1, startDatetime: '2026-01-05T09:00:00', endDatetime: '2026-01-05T09:20:00', storeName: 'A' },
        { id: 2, startDatetime: '2026-01-06T13:30:00', endDatetime: '2026-01-06T14:00:00', storeName: 'B' },
      ],
      MON(10),
    )

    expect(result.weekClassCount).toBe(2)
    expect(result.byDay['월'][1]).not.toBeNull()
    expect(result.byDay['화'][5]).not.toBeNull()
    expect(result.todayKey).toBe('월')
  })

  it('같은 요일/교시의 시프트는 subject를 병합한다', () => {
    const result = buildSchoolTimetable([
      { id: 1, startDatetime: '2026-01-05T09:00:00', endDatetime: '2026-01-05T09:20:00', storeName: 'A' },
      { id: 2, startDatetime: '2026-01-05T09:05:00', endDatetime: '2026-01-05T09:20:00', storeName: 'B' },
    ])

    expect(result.byDay['월'][1].subject).toContain(',')
  })
})
