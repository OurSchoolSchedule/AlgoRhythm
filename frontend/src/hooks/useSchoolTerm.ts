import { useQueryClient } from '@tanstack/react-query'
import { getSessionVersion } from '@/api/tokenStorage.js'
import type { ActiveSchoolDto } from '@/types/home'
import type { HomeTerm } from '@/types/datedLesson'
import { queryKeys } from './queryKeys.js'
import { useHomeSession } from './useHomeSession'

export type SchoolTerm = Pick<HomeTerm, 'schoolId' | 'termId'>

export function useSchoolTerm(term: SchoolTerm | null) {
  const session = useHomeSession()
  const cache = useQueryClient()
  const allowed =
    term !== null &&
    session.access.queries.datedLessons &&
    session.scope.schoolId === term.schoolId &&
    Number.isSafeInteger(term.termId) &&
    term.termId > 0

  function assertAccess() {
    const active = cache.getQueryState<ActiveSchoolDto>(queryKeys.home.active(session.identity))
    if (
      !allowed ||
      active?.status !== 'success' ||
      active.data?.schoolId !== term.schoolId ||
      active.data.position !== session.scope.position ||
      active.data.employmentStatus !== 'HIRED' ||
      getSessionVersion() !== session.identity.generation ||
      cache.isMutating({ mutationKey: queryKeys.home.switchSchool(session.identity) })
    ) {
      throw new Error('활성 학교 또는 로그인 계정이 변경되었습니다.')
    }
  }
  return { session, termId: allowed ? term.termId : null, assertAccess }
}
