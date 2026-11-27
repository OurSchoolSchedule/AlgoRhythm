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

// Confirmed annual observances. Keep the holiday label separate from the school's teaching calendar.
// https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2026 (also 2027)
// https://www.kasa.go.kr/prog/bbsArticle/BBSMSTR_000000000018/view.do?bbsId=BBSMSTR_000000000018&nttId=B000000003234Li6nD2
// https://openminister.mpm.go.kr/mpm/comm/newsPress/newsPressRelease/?boardId=bbs_0000000000000029&cntId=4250&mode=view
const EXTRA = {
  '2026-02-16': '설날', '2026-02-17': '설날', '2026-02-18': '설날',
  '2026-03-02': '대체공휴일', '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일',
  '2026-06-03': '전국동시지방선거', '2026-08-17': '대체공휴일',
  '2026-09-24': '추석', '2026-09-25': '추석', '2026-09-26': '추석', '2026-10-05': '대체공휴일',
  '2027-02-06': '설날', '2027-02-07': '설날', '2027-02-08': '설날', '2027-02-09': '대체공휴일',
  '2027-05-03': '대체공휴일', '2027-05-13': '부처님오신날', '2027-07-19': '대체공휴일', '2027-08-16': '대체공휴일',
  '2027-09-14': '추석', '2027-09-15': '추석', '2027-09-16': '추석',
  '2027-10-04': '대체공휴일', '2027-10-11': '대체공휴일', '2027-12-27': '대체공휴일',
}

function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function padDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function holidayOn(date) {
  const day = padDay(date)
  if (date.getFullYear() >= 2026 && day === '05-01') return '노동절'
  if (date.getFullYear() >= 2026 && day === '07-17') return '제헌절'
  return SOLAR[day] || EXTRA[isoDate(date)] || ''
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
 * @param {import('@/api/terms').RegisteredTerm[]} terms
 */
export function schoolWeekDays(monday, today, terms = []) {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return TIMETABLE_DAYS.map((key, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const iso = isoDate(date)
    const active = terms.filter((term) => term.startDate <= iso && iso <= term.endDate)
    const excluded = active.length > 0 && active.every((term) => term.excludedDates?.includes(iso))
    return {
      key,
      date,
      dayNum: date.getDate(),
      iso,
      outsideTerm: terms.length > 0 && !active.length,
      excluded,
      holiday: excluded ? '수업 제외일' : holidayOn(date),
      isToday: start === todayStart,
      isPast: start < todayStart,
    }
  })
}

/** 월~금이 모두 쉬는 날이면 그 사유를 돌려준다. */
export function weekBreakLabel(monday, terms = []) {
  const days = schoolWeekDays(monday, monday, terms)
  if (days.every((day) => day.outsideTerm)) return '학기 기간 밖'
  return days.every((day) => day.excluded || day.outsideTerm) ? '수업 제외일' : ''
}

/** 휴업이 아닌 다음 주 월요일. */
export function nextOpenWeek(monday, terms = []) {
  let cursor = shiftSchoolWeek(monday, 1)
  while (weekBreakLabel(cursor, terms) === '수업 제외일') {
    cursor = shiftSchoolWeek(cursor, 1)
  }
  return weekBreakLabel(cursor, terms) === '학기 기간 밖' ? null : cursor
}
