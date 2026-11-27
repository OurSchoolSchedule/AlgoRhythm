export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const day = new Date(value + 'T00:00:00Z')
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value
}

export function excludedDatesError(start: string, end: string, dates: readonly string[]) {
  if (!dates.length) return
  if (!isCalendarDate(start) || !isCalendarDate(end) || start > end)
    return '학기 시작일과 종료일을 먼저 확인하세요.'
  for (const date of dates) {
    if (!isCalendarDate(date)) return '유효한 수업 제외일을 선택하세요.'
    if (date < start || date > end) return `학기 기간에 포함되지 않는 제외일입니다. (${date})`
  }
  if (new Set(dates).size !== dates.length) return '이미 추가한 수업 제외일입니다.'
}
