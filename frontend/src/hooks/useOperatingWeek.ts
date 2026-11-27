import { getOperatingWeek } from '@/api/operatingWeek'
import type { HomeTerm } from '@/types/datedLesson'
import { useScopedRead, type HomeSession } from './useHomeSession'

export function useOperatingWeek(session: HomeSession, term: HomeTerm | null, monday: string) {
  return useScopedRead(
    session,
    ['operating-week', term?.termId ?? null, monday],
    Boolean(term && session.access.queries.datedLessons),
    (signal) => getOperatingWeek(term!.termId, monday, signal),
  )
}
