import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { getSessionVersion } from '@/api/tokenStorage.js'
import type { ActiveSchoolDto } from '@/types/home'
import type { HomeTerm } from '@/types/datedLesson'
import { queryKeys } from './queryKeys.js'
import { type HomeSession, useHomeSession } from './useHomeSession'

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
    if (!allowed) throw new Error('활성 학교 또는 로그인 계정이 변경되었습니다.')
    assertHiredSchool(cache, session)
  }
  return { session, termId: allowed ? term.termId : null, assertAccess }
}

export function assertHiredSchool(cache: QueryClient, session: HomeSession) {
  const active = cache.getQueryState<ActiveSchoolDto>(queryKeys.home.active(session.identity))
  if (
    session.scope.schoolId === null ||
    active?.status !== 'success' ||
    active.data?.schoolId !== session.scope.schoolId ||
    active.data.position !== session.scope.position ||
    active.data.employmentStatus !== 'HIRED' ||
    getSessionVersion() !== session.identity.generation ||
    cache.isMutating({ mutationKey: queryKeys.home.switchSchool(session.identity) })
  ) {
    throw new Error('활성 학교 또는 로그인 계정이 변경되었습니다.')
  }
}
