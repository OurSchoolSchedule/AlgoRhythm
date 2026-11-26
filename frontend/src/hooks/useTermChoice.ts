import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTerms, termsKey, type RegisteredTerm } from '@/api/terms'
import { getSchoolSwitchStamp } from '@/api/tokenStorage.js'
import { schoolDate } from '@/utils/homeContract'
import { useScopedRead, type HomeSession } from './useHomeSession'

export function useTermChoice(session: HomeSession, enabled = true) {
  const cache = useQueryClient()
  const allowed = enabled && session.access.queries.datedLessons
  const list = useScopedRead(session, termsKey, allowed, listTerms, { retry: false })
  const today = schoolDate(new Date())
  const [year, month] = today.split('-').map(Number)
  const calendar = {
    academicYear: month < 3 ? year - 1 : year,
    semester: month >= 3 && month <= 7 ? 1 : 2,
  }
  const storageKey = `school-home-term/${session.userId}/${session.scope.schoolId}/${calendar.academicYear}/${calendar.semester}`
  const selectedKey = ['selected-school-term', storageKey, session.scope]
  const { data: selectedId } = useQuery<number | null>({
    queryKey: selectedKey,
    queryFn: skipToken,
    initialData: () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
        return saved && (saved.switchStamp ?? null) === getSchoolSwitchStamp() ? saved.termId : null
      } catch {
        return null
      }
    },
  })

  const terms = allowed && list.isSuccess ? list.data : []
  // The API orders by descending startDate, then descending termId.
  const selected =
    terms.find((t) => t.termId === selectedId) ??
    terms.find((t) => t.startDate <= today && today <= t.endDate) ??
    terms[0]
  const term =
    selected && session.school
      ? {
          schoolId: session.school.schoolId,
          termId: selected.termId,
          academicYear: selected.academicYear,
          semester: selected.semester,
        }
      : null
  const choice = term ?? { ...calendar, termId: null }
  // Existing schools may have a legacy weekly timetable before registering their first v2 term.
  const weeklyTerm =
    term ??
    (session.school && list.isSuccess ? { ...calendar, schoolId: session.school.schoolId } : null)

  function saveChoice(next: RegisteredTerm) {
    cache.setQueryData(selectedKey, next.termId)
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ termId: next.termId, switchStamp: getSchoolSwitchStamp() }),
      )
    } catch {
      // In-memory selection still works when storage is disabled.
    }
  }
  return { choice, term, weeklyTerm, terms, list, saveChoice }
}

export type TermChoice = ReturnType<typeof useTermChoice>
