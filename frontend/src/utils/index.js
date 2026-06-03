export function formatDate(date) {
  return new Intl.DateTimeFormat('ko-KR').format(date)
}

/**
 * Date 를 "YYYY-MM-DD" 문자열로 변환 (로컬 기준).
 * @param {Date} [date]
 * @returns {string}
 */
export { getSchoolWeekRange } from './weekRange.js'
export { formatShiftDatetime, formatShiftRange } from './formatShift.js'
export {
  getNotificationAction,
  filterActionableNotifications,
} from './notificationActions.js'

export function toISODate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
