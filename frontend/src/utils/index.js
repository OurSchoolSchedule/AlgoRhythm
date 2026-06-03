export function formatDate(date) {
  return new Intl.DateTimeFormat('ko-KR').format(date)
}
