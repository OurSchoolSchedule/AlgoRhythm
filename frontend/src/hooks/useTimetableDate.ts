import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSchoolSwitchStamp } from '@/api/tokenStorage.js'
import { isCalendarDate } from '@/utils/termExcludedDates'
import { schoolDate } from '@/utils/homeContract'
import type { HomeTerm } from '@/types/datedLesson'
import type { HomeSession } from './useHomeSession'

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
        return saved?.stamp === stamp && isCalendarDate(saved.date) ? saved.date : null
      } catch {
        return null
      }
    },
  })
  function clamp(date: string) {
    if (term?.startDate && date < term.startDate) return term.startDate
    if (term?.endDate && date > term.endDate) return term.endDate
    return date
  }
  function setDate(value?: string) {
    const date = value && isCalendarDate(value) ? clamp(value) : null
    cache.setQueryData(queryKey, date)
    try {
      sessionStorage.setItem(key, JSON.stringify({ date, stamp }))
    } catch {
      // Keep the date in memory when browser storage is unavailable.
    }
  }
  return { date: clamp(data || schoolDate(new Date())), setDate }
}
