import { describe, expect, it } from 'vitest'
import {
  formatWeekCaption,
  formatWeekMonthLabel,
  formatWeekTitle,
  holidayOn,
  nextOpenWeek,
  schoolWeekDays,
  startOfSchoolWeek,
  weekBreakLabel,
} from './schoolWeek.js'

describe('school week', () => {
  it('2026-10-05 주를 10월 1주차로 보여준다', () => {
    const monday = startOfSchoolWeek(new Date(2026, 9, 5))
    expect(formatWeekTitle(monday)).toBe('2026년 10월 1주차')
    expect(formatWeekMonthLabel(monday)).toBe('10월 1주차')
    expect(formatWeekCaption(monday)).toBe('10.05 – 10.09')
  })

  it('주말 공휴일 다음 월요일을 대체공휴일로 표시한다', () => {
    expect(holidayOn(new Date(2026, 9, 3))).toBe('개천절')
    expect(holidayOn(new Date(2026, 9, 5))).toBe('대체공휴일')
    expect(holidayOn(new Date(2026, 9, 9))).toBe('한글날')
    expect(holidayOn(new Date(2026, 9, 6))).toBe('')
  })

  it('평일이 모두 공휴일일 때만 휴업 주를 돌려준다', () => {
    expect(weekBreakLabel(new Date(2026, 9, 5))).toBe('')
  })

  it('시험 한 날짜만 제외하고 다음 주 같은 요일과 제외일 없는 학기의 수업을 유지한다', () => {
    const monday = new Date(2026, 3, 20)
    const term = { startDate: '2026-03-03', endDate: '2026-07-20', excludedDates: ['2026-04-21'] }
    const days = schoolWeekDays(monday, monday, [term])
    expect(days.filter((day) => day.excluded).map((day) => day.key)).toEqual(['화'])
    expect(days[1].holiday).toBe('수업 제외일')
    expect(weekBreakLabel(monday, [term])).toBe('')
    expect(schoolWeekDays(new Date(2026, 3, 27), monday, [term])[1].excluded).toBe(false)
    expect(schoolWeekDays(monday, monday, [term, { ...term, excludedDates: [] }])[1].excluded).toBe(false)
  })

  it('전부 제외한 주에는 수업이 있는 다음 주를 찾는다', () => {
    const monday = new Date(2026, 3, 20)
    const term = {
      startDate: '2026-03-03', endDate: '2026-07-20',
      excludedDates: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24'],
    }
    expect(weekBreakLabel(monday, [term])).toBe('수업 제외일')
    expect(nextOpenWeek(new Date(2026, 3, 13), [term])).toEqual(new Date(2026, 3, 27))
  })
})
