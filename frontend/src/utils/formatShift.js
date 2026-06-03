/** WorkShift datetime → 화면 표시 */
export function formatShiftDatetime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShiftRange(start, end) {
  const s = formatShiftDatetime(start)
  const e = end ? new Date(end) : null
  const endTime =
    e && !Number.isNaN(e.getTime())
      ? e.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : ''
  return endTime ? `${s} ~ ${endTime}` : s
}
