import { TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'

const SOLAR = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
}

/** 음력 명절. 연도별로만 적는다. */
const EXTRA = {
  '2026-02-16': '설날',
  '2026-02-17': '설날',
  '2026-02-18': '설날',
  '2026-09-24': '추석',
  '2026-09-25': '추석',
  '2026-09-26': '추석',
}

function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function padDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function namedHoliday(date) {
  return SOLAR[padDay(date)] || EXTRA[isoDate(date)] || ''
}

/** 토·일 공휴일의 다음 월요일은 대체공휴일이다. */
export function holidayOn(date) {
  const named = namedHoliday(date)
  if (named) return named
  if (date.getDay() !== 1) return ''
  const sunday = new Date(date)
  sunday.setDate(date.getDate() - 1)
  const saturday = new Date(date)
  saturday.setDate(date.getDate() - 2)
  if (namedHoliday(sunday) || namedHoliday(saturday)) return '대체공휴일'
  return ''
}

/** 그 주 월요일 0시. */
export function startOfSchoolWeek(date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

/** @param {Date} date @param {number} delta */
export function shiftSchoolWeek(date, delta) {
  const start = startOfSchoolWeek(date)
  start.setDate(start.getDate() + delta * 7)
  return start
}

export function isSameSchoolWeek(a, b) {
  return startOfSchoolWeek(a).getTime() === startOfSchoolWeek(b).getTime()
}

/** 그 달의 첫 월요일이 1주차. */
export function weekOrdinal(monday) {
  const firstOfMonth = new Date(monday.getFullYear(), monday.getMonth(), 1)
  let firstMonday = startOfSchoolWeek(firstOfMonth)
  if (firstMonday.getMonth() !== monday.getMonth()) {
    firstMonday = new Date(firstMonday)
    firstMonday.setDate(firstMonday.getDate() + 7)
  }
  const diff = Math.round((monday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return diff + 1
}

/** @param {Date} monday */
export function formatWeekTitle(monday) {
  return `${monday.getFullYear()}년 ${monday.getMonth() + 1}월 ${weekOrdinal(monday)}주차`
}

/** @param {Date} monday */
export function formatWeekMonthLabel(monday) {
  return `${monday.getMonth() + 1}월 ${weekOrdinal(monday)}주차`
}

/** @param {Date} monday */
export function formatWeekShort(monday) {
  return formatWeekMonthLabel(monday)
}

function monthDay(date) {
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`
}

/** @param {Date} monday */
export function formatWeekCaption(monday) {
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return `${monthDay(monday)} – ${monthDay(friday)}`
}

/**
 * @param {Date} monday
 * @param {Date} today
 */
export function schoolWeekDays(monday, today) {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return TIMETABLE_DAYS.map((key, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    return {
      key,
      date,
      dayNum: date.getDate(),
      holiday: holidayOn(date),
      isToday: start === todayStart,
      isPast: start < todayStart,
    }
  })
}

/** 월~금이 모두 공휴일이면 그 이름을 돌려준다. */
export function weekBreakLabel(monday) {
  const names = schoolWeekDays(monday, monday).map((day) => day.holiday).filter(Boolean)
  if (names.length < 5) return ''
  return [...new Set(names)].join('·')
}

/** 휴업이 아닌 다음 주 월요일. */
export function nextOpenWeek(monday) {
  let cursor = shiftSchoolWeek(monday, 1)
  for (let step = 0; step < 8; step += 1) {
    if (!weekBreakLabel(cursor)) return cursor
    cursor = shiftSchoolWeek(cursor, 1)
  }
  return cursor
}
