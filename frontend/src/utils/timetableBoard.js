import { TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'

const KEY_TO_API_DAY = {
  월: 'MON',
  화: 'TUE',
  수: 'WED',
  목: 'THU',
  금: 'FRI',
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
 * 옮긴 칸만 PATCH 본문으로 만든다.
 * 도착 교시의 periodSettingId는 같은 교시 번호의 기존 칸에서 가져온다.
 * @param {Record<string, Record<number, object | null>>} originalByDay
 * @param {Record<string, Record<number, object | null>>} movedByDay
 * @returns {{ error: string, patches: { timetableId: number, payload: object }[] }}
 */
export function changedTimetablePatches(originalByDay, movedByDay) {
  const periodSettingByNumber = new Map()
  const originalPlace = new Map()
  for (const day of TIMETABLE_DAYS) {
    for (const [period, cell] of Object.entries(originalByDay?.[day] || {})) {
      if (!cell?.id) continue
      const periodNumber = Number(period)
      originalPlace.set(cell.id, { day, period: periodNumber })
      if (cell.periodSettingId != null) periodSettingByNumber.set(periodNumber, cell.periodSettingId)
    }
  }

  const patches = []
  for (const day of TIMETABLE_DAYS) {
    for (const [period, cell] of Object.entries(movedByDay?.[day] || {})) {
      if (!cell?.id) continue
      const periodNumber = Number(period)
      const before = originalPlace.get(cell.id)
      if (!before || (before.day === day && before.period === periodNumber)) continue
      const dayOfWeek = KEY_TO_API_DAY[day]
      const periodSettingId = periodSettingByNumber.get(periodNumber)
      if (!dayOfWeek || periodSettingId == null) {
        return { error: '옮긴 칸에 저장할 교시 번호가 없습니다.', patches: [] }
      }
      const payload = { periodSettingId, dayOfWeek }
      if (cell.academicYear != null) payload.academicYear = cell.academicYear
      if (cell.semester != null) payload.semester = cell.semester
      if (cell.schoolClassId != null) payload.schoolClassId = cell.schoolClassId
      if (cell.subjectId != null) payload.subjectId = cell.subjectId
      if (cell.teacherId != null) payload.teacherSchoolUserId = cell.teacherId
      patches.push({ timetableId: cell.id, payload })
    }
  }
  return { error: '', patches }
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
