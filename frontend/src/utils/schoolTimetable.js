import {
  TIMETABLE_DAYS,
  TIMETABLE_PERIODS,
  SCHOOL_PERIOD_SLOTS,
} from '@/constants/schoolTimetable.js'

const API_DAY_TO_KEY = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
}

const JS_DAY_TO_KEY = {
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
}

function parseClockToMinutes(clock) {
  if (!clock) return null
  const [h, m] = String(clock).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function dateToMinutes(d) {
  return d.getHours() * 60 + d.getMinutes()
}

/** @param {Date} [date] */
export function getKoreanWeekdayKey(date = new Date()) {
  return JS_DAY_TO_KEY[date.getDay()] ?? null
}

/**
 * @param {Date} date
 * @param {{ period: number, start: string, end: string }[]} slots
 */
export function getPeriodFromSlots(date, slots) {
  if (!date || Number.isNaN(date.getTime())) return null
  const minutes = dateToMinutes(date)
  for (const slot of slots) {
    const start = parseClockToMinutes(slot.start)
    const end = parseClockToMinutes(slot.end)
    if (start == null || end == null) continue
    if (minutes >= start && minutes < end) return slot.period
  }
  return null
}

/** 기본 교시 시각으로 현재 교시를 고른다. */
export function getPeriodFromDatetime(date) {
  return getPeriodFromSlots(date, SCHOOL_PERIOD_SLOTS)
}

function classLabel(entry) {
  if (entry.grade != null && entry.classNumber != null) {
    return `${entry.grade}-${entry.classNumber}`
  }
  return entry.subjectName || '수업'
}

/**
 * @param {import('@/types/timetable.js').TimetableDto} entry
 * @returns {import('@/utils/schoolTimetable.js').TimetableCell | null}
 */
export function entryToTimetableCell(entry) {
  const dayKey = API_DAY_TO_KEY[entry.dayOfWeek]
  const period = entry.periodNumber
  if (!dayKey || !period) return null

  return {
    id: entry.id,
    dayKey,
    period,
    class: classLabel(entry),
    subject: entry.subjectName || '',
    teacher: entry.teacherName || '',
    startTime: entry.periodStartTime || '',
    endTime: entry.periodEndTime || '',
    academicYear: entry.academicYear,
    semester: entry.semester,
    schoolClassId: entry.schoolClassId,
    periodSettingId: entry.periodSettingId,
    subjectId: entry.subjectId,
    teacherId: entry.teacherId,
  }
}

function emptyDayMap(periods) {
  return Object.fromEntries(
    TIMETABLE_DAYS.map((day) => [
      day,
      Object.fromEntries(periods.map((p) => [p, null])),
    ]),
  )
}

function mergeCell(existing, cell) {
  return {
    ...existing,
    class: `${existing.class}, ${cell.class}`,
    subject: [existing.subject, cell.subject].filter(Boolean).join(', '),
    teacher: [existing.teacher, cell.teacher].filter(Boolean).join(', '),
  }
}

/**
 * @typedef {Object} TimetableCell
 * @property {number} id
 * @property {string} dayKey
 * @property {number} period
 * @property {string} class
 * @property {string} subject
 * @property {string} teacher
 * @property {string} startTime
 * @property {string} endTime
 */

/**
 * @param {import('@/types/timetable.js').TimetableDto[]} entries
 * @param {Date} [referenceDate]
 */
export function buildSchoolTimetable(entries, referenceDate = new Date()) {
  const cells = []
  for (const entry of entries) {
    const cell = entryToTimetableCell(entry)
    if (cell) cells.push(cell)
  }

  const maxPeriod = cells.reduce((max, cell) => Math.max(max, cell.period), TIMETABLE_PERIODS.at(-1))
  const periods = Array.from({ length: maxPeriod }, (_, index) => index + 1)
  const byDay = emptyDayMap(periods)

  for (const cell of cells) {
    const existing = byDay[cell.dayKey][cell.period]
    byDay[cell.dayKey][cell.period] = existing ? mergeCell(existing, cell) : cell
  }

  const todayKey = getKoreanWeekdayKey(referenceDate)
  const todayByPeriod = todayKey ? byDay[todayKey] : null
  const todayClassCount = todayByPeriod
    ? periods.filter((p) => todayByPeriod[p]).length
    : 0

  const slots = []
  const seenPeriods = new Set()
  for (const cell of cells) {
    if (seenPeriods.has(cell.period) || !cell.startTime || !cell.endTime) continue
    seenPeriods.add(cell.period)
    slots.push({ period: cell.period, start: cell.startTime, end: cell.endTime })
  }
  const currentPeriod =
    getPeriodFromSlots(referenceDate, slots) ?? getPeriodFromDatetime(referenceDate)
  const currentClass =
    todayKey && currentPeriod ? byDay[todayKey][currentPeriod] : null

  return {
    byDay,
    cells,
    periods,
    todayKey,
    todayByPeriod,
    todayClassCount,
    weekClassCount: cells.length,
    currentPeriod,
    currentClass,
  }
}
