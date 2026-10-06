import { describe, expect, it } from 'vitest'
import { buildTodayRows, resolveHomeFocus } from './homeFocus.js'

function cell(period, start, end, extra = {}) {
  return {
    period,
    class: '2-3',
    subject: '국어',
    teacher: '김민지',
    startTime: start,
    endTime: end,
    ...extra,
  }
}

function timetable(todayKey, todayByPeriod) {
  return {
    todayKey,
    todayClassCount: Object.keys(todayByPeriod).length,
    periods: [1, 2, 3, 4, 5, 6, 7],
    todayByPeriod,
    byDay: {
      월: todayKey === '월' ? todayByPeriod : { 1: cell(1, '08:40', '09:25') },
      화: {},
      수: {},
      목: {},
      금: {},
    },
  }
}

describe('resolveHomeFocus', () => {
  it('shows the class in progress', () => {
    const focus = resolveHomeFocus(
      timetable('월', { 3: cell(3, '10:10', '10:55') }),
      new Date(2026, 9, 5, 10, 20),
    )
    expect(focus.label).toBe('지금')
    expect(focus.headline).toBe('3교시 · 10:10–10:55')
    expect(focus.detail).toBe('2-3반 국어')
  })

  it('shows the next class between periods', () => {
    const focus = resolveHomeFocus(
      timetable('월', {
        3: cell(3, '10:10', '10:55'),
        4: cell(4, '11:05', '11:50'),
      }),
      new Date(2026, 9, 5, 11, 0),
    )
    expect(focus.label).toBe('다음 수업')
    expect(focus.headline).toBe('4교시 · 11:05')
  })

  it('shows the next school day when today has no class', () => {
    const focus = resolveHomeFocus(timetable(null, {}), new Date(2026, 9, 4, 9, 0))
    expect(focus.label).toBe('다음 수업일')
    expect(focus.headline).toBe('10/5(월) 1교시 · 08:40')
  })
})

describe('buildTodayRows', () => {
  it('skips period rows when the day has no class', () => {
    expect(buildTodayRows(timetable(null, {}), new Date(2026, 9, 4, 9, 0))).toEqual([])
  })

  it('marks a gap as an empty period and inserts lunch', () => {
    const rows = buildTodayRows(
      timetable('월', {
        3: cell(3, '10:10', '10:55'),
        5: cell(5, '13:20', '14:05'),
      }),
      new Date(2026, 9, 5, 10, 20),
    )
    expect(rows.map((row) => row.kind === 'lunch' ? 'lunch' : row.period)).toEqual([3, 4, 'lunch', 5])
    expect(rows.find((row) => row.period === 4).cell).toBeNull()
    expect(rows.find((row) => row.period === 3).isNow).toBe(true)
    expect(rows.find((row) => row.kind === 'lunch').label).toBe('12:20–13:10 점심시간')
  })
})
