import { TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'

const STATUS_KIND = {
  '대타 대기': 'wait',
  대기: 'wait',
  변경됨: 'change',
  변경: 'change',
  충돌: 'conflict',
}

export const STATUS_BADGE = {
  wait: '대기',
  change: '변경',
  conflict: '충돌',
}

/** @param {string} [status] */
export function cellStatusKind(status) {
  return STATUS_KIND[status] || ''
}

/** @param {string} day @param {number} period */
export function cellSlotKey(day, period) {
  return `${day}-${period}`
}

/**
 * @param {Record<string, Record<number, object | null>>} byDay
 * @param {{ from: { day: string, period: number }, to: { day: string, period: number } }[]} moves
 */
export function applyCellMoves(byDay, moves) {
  const next = {}
  for (const day of TIMETABLE_DAYS) {
    next[day] = { ...(byDay[day] || {}) }
  }
  for (const move of moves) {
    const source = next[move.from.day]?.[move.from.period] ?? null
    const target = next[move.to.day]?.[move.to.period] ?? null
    next[move.to.day][move.to.period] = source
      ? { ...source, dayKey: move.to.day, period: move.to.period }
      : null
    next[move.from.day][move.from.period] = target
      ? { ...target, dayKey: move.from.day, period: move.from.period }
      : null
  }
  return next
}

/**
 * @param {Record<string, Record<number, { id?: number, teacher?: string } | null>>} byDay
 * @param {{ day: string, period: number }} from
 * @param {{ day: string, period: number }} to
 * @param {string} [holiday]
 */
export function dropRejection(byDay, from, to, holiday = '') {
  if (from.day === to.day && from.period === to.period) return ''
  if (holiday) return '수업이 없는 날입니다'
  const moving = byDay[from.day]?.[from.period]
  if (!moving) return '옮길 수업이 없습니다'
  const target = byDay[to.day]?.[to.period]
  if (
    target
    && moving.teacher
    && target.teacher
    && moving.teacher === target.teacher
    && target.id !== moving.id
  ) {
    return '이 교시에 같은 교사 수업이 있습니다'
  }
  return ''
}

/**
 * 보이는 교시. 기본은 1~7이고, 그 밖에 수업이 있으면 포함한다.
 * @param {number[]} periods
 * @param {Record<string, Record<number, object | null>>} byDay
 */
export function boardPeriods(periods, byDay) {
  const present = new Set()
  for (const day of TIMETABLE_DAYS) {
    for (const period of periods) {
      if (byDay?.[day]?.[period]) present.add(period)
    }
  }
  const list = periods.filter((period) => period <= 7 || present.has(period))
  return list.length > 0 ? list : [1, 2, 3, 4, 5, 6, 7]
}

/** @param {number[]} periods */
export function periodsWithLunch(periods) {
  const rows = []
  const spansLunch = periods.some((period) => period <= 4) && periods.some((period) => period >= 5)
  let lunchPlaced = false
  for (const period of periods) {
    if (spansLunch && !lunchPlaced && period >= 5) {
      rows.push({ kind: 'lunch', period: 0 })
      lunchPlaced = true
    }
    rows.push({ kind: 'period', period })
  }
  return rows
}
