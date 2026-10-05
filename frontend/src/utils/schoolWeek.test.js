import { describe, expect, it } from 'vitest'
import {
  formatWeekCaption,
  formatWeekMonthLabel,
  formatWeekTitle,
  holidayOn,
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
})
