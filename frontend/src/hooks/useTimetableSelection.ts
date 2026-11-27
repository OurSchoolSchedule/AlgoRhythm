import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import type { HomeSession } from './useHomeSession'
import type { HomeTerm } from '@/types/datedLesson'
import { useTimetableDate } from './useTimetableDate'

export type BoardView = 'mine' | 'homeroom' | 'class' | 'school' | 'teacher'

export interface BoardSelection {
  date?: string
  view?: BoardView
  grade?: number | null
  classId?: number | null
  homeroomId?: number | null
  teacherId?: number | null
}

// Home and the timetable menu observe the same choice. Account, school and term own their own selection.
export function useTimetableSelection(session: HomeSession, term: HomeTerm | null) {
  const cache = useQueryClient()
  const { date, setDate } = useTimetableDate(session, term)
  const storageKey =
    'school-timetable/' +
    [session.userId, session.scope.schoolId, term?.termId ?? 'legacy'].join('/')
  const key = ['board-selection', storageKey, session.scope]
  const { data = {} } = useQuery<BoardSelection>({
    queryKey: key,
    queryFn: skipToken,
    initialData: () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')
        if (!saved || typeof saved !== 'object') return {}
        return saved
      } catch {
        return {}
      }
    },
  })

  function change(patch: Partial<BoardSelection>) {
    const { date: nextDate, ...target } = patch
    if ('date' in patch) setDate(nextDate)
    if (!Object.keys(target).length) return
    const next = cache.setQueryData<BoardSelection>(key, (old) => ({ ...old, ...target }))
    if (session.scope.schoolId) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // React Query still shares the current selection when browser storage is unavailable.
      }
    }
  }
  return { selection: { ...data, date }, change }
}
