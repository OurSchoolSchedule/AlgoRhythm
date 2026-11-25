import { useQueryClient } from '@tanstack/react-query'
import {
  confirmRoster,
  downloadRosterTemplate,
  previewRoster,
  readRoster,
} from '@/api/rosterImport'
import type { RosterScope } from '@/types/rosterImport'
import { useAdminTerm } from './useAdminTerm'
import { useScopedRead } from './useHomeSession'
import { queryKeys } from './queryKeys'

export const schoolRosterKey = (schoolId: number) => ['school-roster', schoolId] as const

export function useRosterImport(scope: RosterScope) {
  const { session, termId, assertAccess } = useAdminTerm(scope)
  const cache = useQueryClient()
  const directory = useScopedRead(
    session,
    [...schoolRosterKey(scope.schoolId), scope.termId],
    termId !== null,
    (signal) => readRoster(scope, signal),
    { retry: false },
  )
  return {
    directory,
    async template(signal: AbortSignal) {
      assertAccess()
      const file = await downloadRosterTemplate(scope, signal)
      assertAccess()
      return file
    },
    async preview(file: File, signal: AbortSignal) {
      assertAccess()
      const result = await previewRoster(scope, file, signal)
      assertAccess()
      return result
    },
    async confirm(id: string, hash: string, signal: AbortSignal) {
      assertAccess()
      try {
        return await confirmRoster(scope, id, hash, signal)
      } finally {
        // Even a lost response may follow a committed write.
        // Names are school-wide. Other terms and FE19 should also read the updated names.
        await Promise.all([
          cache.invalidateQueries({ queryKey: schoolRosterKey(scope.schoolId) }),
          ...[
            queryKeys.home.directory(),
            queryKeys.store.staffSummary(),
            queryKeys.mypage.staffProfile(),
          ].map((queryKey) =>
            cache.invalidateQueries({
              queryKey,
              predicate: (q) => {
                const last = q.queryKey.at(-1)
                return (
                  !last ||
                  typeof last !== 'object' ||
                  !('schoolId' in last) ||
                  last.schoolId === scope.schoolId
                )
              },
            }),
          ),
        ])
      }
    },
  }
}
