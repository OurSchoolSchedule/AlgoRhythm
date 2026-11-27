import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSchoolSwitchStamp } from '@/api/tokenStorage.js'
import { isCalendarDate } from '@/utils/termExcludedDates'
import type { HomeTerm } from '@/types/datedLesson'
import type { HomeSession } from './useHomeSession'

export function isInTerm(date: string, term: HomeTerm | null) {
  return (
    isCalendarDate(date) &&
    (!term?.startDate || date >= term.startDate) &&
    (!term?.endDate || date <= term.endDate)
  )
}

export function firstSchoolDate(term: HomeTerm | null, today: string) {
  if (!term?.startDate || !term.endDate || isInTerm(today, term)) return today
  const day = new Date(term.startDate + 'T12:00:00Z')
  for (let iso = term.startDate; iso <= term.endDate; iso = day.toISOString().slice(0, 10)) {
    if (day.getUTCDay() > 0 && day.getUTCDay() < 6 && !term.excludedDates?.includes(iso)) return iso
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return term.startDate
}

export function useTimetableDate(session: HomeSession, term: HomeTerm | null) {
  const cache = useQueryClient()
  const key = `school-view-date/${session.userId}/${session.scope.schoolId}/${term?.termId ?? 'legacy'}`
  const queryKey = ['school-view-date', key, session.scope]
  const stamp = getSchoolSwitchStamp() ?? null
  const { data } = useQuery<string | null>({
    queryKey,
    queryFn: skipToken,
    initialData: () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null')
        return saved?.stamp === stamp && isInTerm(saved.date, term) ? saved.date : null
      } catch {
        return null
      }
    },
  })
  function setDate(value?: string) {
    const date = value && isCalendarDate(value) ? value : null
    cache.setQueryData(queryKey, date)
    try {
      sessionStorage.setItem(key, JSON.stringify({ date, stamp }))
    } catch {
      // Keep the date in memory when browser storage is unavailable.
    }
  }
  return { date: data ?? undefined, setDate }
}
