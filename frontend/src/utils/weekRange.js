import { toISODate } from './index.js'

/** 월~금 주간 범위 (학교 주간 시간표용) */
export function getSchoolWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMon)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { start: toISODate(monday), end: toISODate(friday) }
}
