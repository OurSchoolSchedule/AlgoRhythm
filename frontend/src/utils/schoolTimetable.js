import {
  TIMETABLE_DAYS,
  TIMETABLE_PERIODS,
  SCHOOL_PERIOD_SLOTS,
} from '@/constants/schoolTimetable.js'

const JS_DAY_TO_KEY = {
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
}

function parseClockToMinutes(clock) {
  const [h, m] = clock.split(':').map(Number)
  return h * 60 + m
}

function dateToMinutes(d) {
  return d.getHours() * 60 + d.getMinutes()
}

/** @param {Date} [date] */
export function getKoreanWeekdayKey(date = new Date()) {
  return JS_DAY_TO_KEY[date.getDay()] ?? null
}

/** @param {Date} [date] */
export function getPeriodFromDatetime(date) {
  if (!date || Number.isNaN(date.getTime())) return null
  const minutes = dateToMinutes(date)

  for (const slot of SCHOOL_PERIOD_SLOTS) {
    const start = parseClockToMinutes(slot.start)
    const end = parseClockToMinutes(slot.end)
    if (minutes >= start && minutes < end) return slot.period
  }

  let closest = null
  let minDiff = Infinity
  for (const slot of SCHOOL_PERIOD_SLOTS) {
    const start = parseClockToMinutes(slot.start)
    const diff = Math.abs(minutes - start)
    if (diff < minDiff) {
      minDiff = diff
      closest = slot.period
    }
  }
  return minDiff <= 30 ? closest : null
}

function formatTimeOnly(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * @param {import('@/types/workShift.js').MyWorkShiftDto} shift
 * @returns {import('@/utils/schoolTimetable.js').TimetableCell | null}
 */
export function shiftToTimetableCell(shift) {
  const start = new Date(shift.startDatetime)
  const end = new Date(shift.endDatetime)
  if (Number.isNaN(start.getTime())) return null

  const dayKey = getKoreanWeekdayKey(start)
  const period = getPeriodFromDatetime(start)
  if (!dayKey || !period) return null

  const startLabel = formatTimeOnly(shift.startDatetime)
  const endLabel = formatTimeOnly(shift.endDatetime)
  const timeLabel =
    endLabel && endLabel !== startLabel ? `${startLabel} ~ ${endLabel}` : startLabel

  return {
    id: shift.id,
    dayKey,
    period,
    class: shift.storeName || '수업',
    subject: timeLabel,
    startDatetime: shift.startDatetime,
    endDatetime: shift.endDatetime,
    shiftStatus: shift.shiftStatus,
  }
}

function emptyDayMap() {
  return Object.fromEntries(
    TIMETABLE_DAYS.map((day) => [
      day,
      Object.fromEntries(TIMETABLE_PERIODS.map((p) => [p, null])),
    ]),
  )
}

/**
 * @typedef {Object} TimetableCell
 * @property {number} id
 * @property {string} dayKey
 * @property {number} period
 * @property {string} class
 * @property {string} subject
 * @property {string} startDatetime
 * @property {string} endDatetime
 * @property {string} [shiftStatus]
 */

/**
 * @param {import('@/types/workShift.js').MyWorkShiftDto[]} shifts
 * @param {Date} [referenceDate]
 */
export function buildSchoolTimetable(shifts, referenceDate = new Date()) {
  const byDay = emptyDayMap()
  const cells = []

  for (const shift of shifts) {
    const cell = shiftToTimetableCell(shift)
    if (!cell) continue
    cells.push(cell)
    const existing = byDay[cell.dayKey][cell.period]
    if (!existing) {
      byDay[cell.dayKey][cell.period] = cell
    } else {
      byDay[cell.dayKey][cell.period] = {
        ...existing,
        subject: `${existing.subject}, ${cell.subject}`,
      }
    }
  }

  const todayKey = getKoreanWeekdayKey(referenceDate)
  const todayByPeriod = todayKey ? byDay[todayKey] : null
  const todayClassCount = todayByPeriod
    ? TIMETABLE_PERIODS.filter((p) => todayByPeriod[p]).length
    : 0
  const weekClassCount = cells.length
  const currentPeriod = getPeriodFromDatetime(referenceDate)
  const currentClass =
    todayKey && currentPeriod ? byDay[todayKey][currentPeriod] : null

  return {
    byDay,
    cells,
    todayKey,
    todayByPeriod,
    todayClassCount,
    weekClassCount,
    currentPeriod,
    currentClass,
  }
}
