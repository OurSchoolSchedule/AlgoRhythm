import { SCHOOL_PERIOD_SLOTS, TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'
import { getKoreanWeekdayKey } from '@/utils/schoolTimetable.js'

const WEEKDAYS = TIMETABLE_DAYS

/** @param {string} [value] */
export function formatClock(value) {
  if (!value) return ''
  const [hour, minute] = String(value).split(':')
  if (hour == null || minute == null) return ''
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/** @param {string} [classLabel] */
export function formatClassName(classLabel) {
  if (!classLabel) return ''
  return classLabel.endsWith('반') ? classLabel : `${classLabel}반`
}

/**
 * @param {{ class?: string, subject?: string, location?: string } | null | undefined} cell
 */
export function formatHeroDetail(cell) {
  if (!cell) return ''
  const place = [formatClassName(cell.class), cell.subject].filter(Boolean).join(' ')
  return [place, cell.location].filter(Boolean).join(' · ')
}

/**
 * @param {{ class?: string, location?: string } | null | undefined} cell
 */
export function formatRowDetail(cell) {
  if (!cell) return ''
  return [formatClassName(cell.class), cell.location].filter(Boolean).join(' · ')
}

function slotOf(period) {
  return SCHOOL_PERIOD_SLOTS.find((slot) => slot.period === period) ?? null
}

function minutesOf(value) {
  const clock = formatClock(value)
  if (!clock) return null
  const [hour, minute] = clock.split(':').map(Number)
  return hour * 60 + minute
}

/**
 * @param {import('@/utils/schoolTimetable.js').SchoolTimetable | null | undefined} timetable
 * @param {string} dayKey
 */
function firstClass(timetable, dayKey) {
  const day = timetable?.byDay?.[dayKey]
  if (!day) return null
  const period = timetable.periods.find((item) => day[item])
  if (!period) return null
  return { period, cell: day[period] }
}

/**
 * @param {Date} date
 * @param {import('@/utils/schoolTimetable.js').SchoolTimetable} timetable
 */
export function findNextSchoolDay(date, timetable) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const next = new Date(date)
    next.setDate(date.getDate() + offset)
    const dayKey = getKoreanWeekdayKey(next)
    if (!dayKey || !WEEKDAYS.includes(dayKey)) continue
    const found = firstClass(timetable, dayKey)
    if (!found) continue
    return { date: next, dayKey, ...found }
  }
  return null
}

function headline(period, start, end) {
  const range = end ? `${formatClock(start)}–${formatClock(end)}` : formatClock(start)
  return `${period}교시 · ${range}`
}

/**
 * @param {import('@/utils/schoolTimetable.js').SchoolTimetable | null | undefined} timetable
 * @param {Date} now
 */
export function resolveHomeFocus(timetable, now) {
  const todayKey = timetable?.todayKey
  const today = timetable?.todayByPeriod ?? {}
  const classes = (timetable?.periods ?? [])
    .filter((period) => today[period])
    .map((period) => ({ period, cell: today[period] }))

  if (todayKey && classes.length > 0) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const ongoing = classes.find((item) => {
      const start = minutesOf(item.cell.startTime)
      const end = minutesOf(item.cell.endTime)
      return start != null && end != null && nowMinutes >= start && nowMinutes < end
    })
    if (ongoing) {
      return {
        label: '지금',
        headline: headline(ongoing.period, ongoing.cell.startTime, ongoing.cell.endTime),
        detail: formatHeroDetail(ongoing.cell),
      }
    }

    const upcoming = classes.find((item) => {
      const start = minutesOf(item.cell.startTime)
      return start != null && nowMinutes < start
    })
    if (upcoming) {
      return {
        label: '다음 수업',
        headline: `${upcoming.period}교시 · ${formatClock(upcoming.cell.startTime)}`,
        detail: formatHeroDetail(upcoming.cell),
      }
    }
  }

  const next = timetable ? findNextSchoolDay(now, timetable) : null
  if (!next) {
    return { label: '다음 수업일', headline: '예정된 수업이 없습니다', detail: '' }
  }
  const month = next.date.getMonth() + 1
  const day = next.date.getDate()
  const start = next.cell.startTime || slotOf(next.period)?.start || ''
  return {
    label: '다음 수업일',
    headline: `${month}/${day}(${next.dayKey}) ${next.period}교시 · ${formatClock(start)}`,
    detail: formatHeroDetail(next.cell),
  }
}

/**
 * @param {import('@/utils/schoolTimetable.js').SchoolTimetable | null | undefined} timetable
 * @param {Date} now
 */
export function buildTodayRows(timetable, now) {
  if (!timetable?.todayKey || timetable.todayClassCount === 0) return []

  const periods = timetable.periods.filter((period) => timetable.todayByPeriod[period])
  const first = periods[0]
  const last = periods[periods.length - 1]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const rows = []

  for (let period = first; period <= last; period += 1) {
    if (period === 5 && first <= 4 && last >= 5) {
      rows.push({ kind: 'lunch', id: 'lunch', label: '12:20–13:10 점심시간' })
    }
    const cell = timetable.todayByPeriod[period] ?? null
    const slot = slotOf(period)
    const start = cell?.startTime || slot?.start || ''
    const end = cell?.endTime || slot?.end || ''
    const endMinutes = minutesOf(end)
    const startMinutes = minutesOf(start)
    const isNow = Boolean(
      cell
      && startMinutes != null
      && endMinutes != null
      && nowMinutes >= startMinutes
      && nowMinutes < endMinutes,
    )
    const isPast = endMinutes != null && nowMinutes >= endMinutes
    rows.push({
      kind: 'period',
      id: `period-${period}`,
      period,
      periodLabel: `${period}교시`,
      time: formatClock(start),
      cell,
      isNow,
      isPast,
    })
  }

  return rows
}
