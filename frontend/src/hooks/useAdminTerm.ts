import { useQueryClient } from '@tanstack/react-query'
import { getSessionVersion } from '@/api/tokenStorage.js'
import type { HomeTerm } from '@/types/datedLesson'
import type { ActiveSchoolDto } from '@/types/home'
import { homeAccess } from '@/utils/homeAccess'
import { queryKeys } from './queryKeys.js'
import { useHomeSession } from './useHomeSession'

export type SchoolTerm = Pick<HomeTerm, 'schoolId' | 'termId'>

export function useAdminTerm(term: SchoolTerm | null, action: 'generate' | 'publish' = 'generate') {
  const session = useHomeSession()
  const cache = useQueryClient()
  const allowed =
    term !== null &&
    session.access.actions[action] &&
    session.school?.schoolId === term.schoolId &&
    Number.isSafeInteger(term.termId) &&
    term.termId > 0

  // Mutation execution and polling can occur after the render that enabled the action.
  function assertAccess() {
    const active = cache.getQueryState<ActiveSchoolDto>(queryKeys.home.active(session.identity))
    if (
      !allowed ||
      active?.status !== 'success' ||
      active.data?.schoolId !== term.schoolId ||
      !homeAccess(session.userId !== null, active.data ?? null).actions[action] ||
      session.identity.generation !== getSessionVersion() ||
      cache.isMutating({
        mutationKey: queryKeys.home.switchSchool(session.identity),
      })
    ) {
      throw new Error('활성 학교 또는 로그인 계정이 변경되었습니다.')
    }
  }
  return { session, termId: allowed ? term.termId : null, assertAccess }
}
