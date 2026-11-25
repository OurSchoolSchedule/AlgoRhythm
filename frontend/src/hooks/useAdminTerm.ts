import { useSchoolTerm, type SchoolTerm } from './useSchoolTerm'

export type { SchoolTerm } from './useSchoolTerm'

export function useAdminTerm(term: SchoolTerm | null, action: 'generate' | 'publish' = 'generate') {
  const { session, termId, assertAccess } = useSchoolTerm(term)
  const allowed = session.access.actions[action]
  return {
    session,
    termId: allowed ? termId : null,
    assertAccess() {
      assertAccess()
      if (!allowed) throw new Error('활성 학교의 재직 관리자만 수행할 수 있습니다.')
    },
  }
}
