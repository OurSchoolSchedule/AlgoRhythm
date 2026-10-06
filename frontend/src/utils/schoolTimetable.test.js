import { describe, it, expect } from 'vitest'
import {
  getKoreanWeekdayKey,
  getPeriodFromDatetime,
  entryToTimetableCell,
  buildSchoolTimetable,
} from './schoolTimetable.js'

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
    expect(getPeriodFromDatetime(MON(9, 0))).toBe(1)
    expect(getPeriodFromDatetime(MON(13, 30))).toBe(5)
  })

  it('어떤 교시와도 겹치지 않는 시각은 null을 반환한다', () => {
    expect(getPeriodFromDatetime(MON(6, 0))).toBeNull()
  })

  it('유효하지 않은 Date는 null을 반환한다', () => {
    expect(getPeriodFromDatetime(new Date('invalid'))).toBeNull()
  })
})

describe('entryToTimetableCell', () => {
  it('시간표 응답을 요일/교시 셀로 변환한다', () => {
    const cell = entryToTimetableCell({
      id: 1,
      dayOfWeek: 'MON',
      periodNumber: 2,
      grade: 2,
      classNumber: 3,
      subjectName: '수학',
      teacherName: '김민지',
      periodStartTime: '09:30:00',
      periodEndTime: '10:20:00',
    })

    expect(cell).toMatchObject({
      id: 1,
      dayKey: '월',
      period: 2,
      class: '2-3',
      subject: '수학',
      teacher: '김민지',
    })
  })

  it('평일 요일이 아니면 null을 반환한다', () => {
    expect(entryToTimetableCell({ id: 2, dayOfWeek: 'SAT', periodNumber: 1 })).toBeNull()
  })
})

describe('buildSchoolTimetable', () => {
  it('여러 수업을 주간 시간표로 집계한다', () => {
    const result = buildSchoolTimetable(
      [
        { id: 1, dayOfWeek: 'MON', periodNumber: 1, grade: 1, classNumber: 1, subjectName: '국어' },
        { id: 2, dayOfWeek: 'TUE', periodNumber: 5, grade: 3, classNumber: 2, subjectName: '영어' },
      ],
      MON(10),
    )

    expect(result.weekClassCount).toBe(2)
    expect(result.byDay['월'][1].subject).toBe('국어')
    expect(result.byDay['화'][5].class).toBe('3-2')
    expect(result.todayKey).toBe('월')
    expect(result.todayClassCount).toBe(1)
  })

  it('같은 요일/교시의 수업은 학급과 과목을 병합한다', () => {
    const result = buildSchoolTimetable([
      { id: 1, dayOfWeek: 'MON', periodNumber: 1, grade: 1, classNumber: 1, subjectName: '국어' },
      { id: 2, dayOfWeek: 'MON', periodNumber: 1, grade: 1, classNumber: 2, subjectName: '수학' },
    ])

    expect(result.byDay['월'][1].class).toContain(',')
    expect(result.byDay['월'][1].subject).toContain('수학')
  })

  it('응답에 있는 교시 시각으로 현재 수업을 고른다', () => {
    const result = buildSchoolTimetable(
      [
        {
          id: 1,
          dayOfWeek: 'MON',
          periodNumber: 3,
          grade: 2,
          classNumber: 1,
          subjectName: '과학',
          periodStartTime: '10:00:00',
          periodEndTime: '10:50:00',
        },
      ],
      MON(10, 10),
    )

    expect(result.currentPeriod).toBe(3)
    expect(result.currentClass.subject).toBe('과학')
  })
})
