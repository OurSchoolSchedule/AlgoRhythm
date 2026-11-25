import { useHomeSession, useScopedRead } from './useHomeSession'
import { useTermChoice } from './useTermChoice'
import { getStoreStaffSummary } from '@/api'
import { queryKeys } from './queryKeys.js'

export function useStoreStaffSummary(options = {}) {
  const session = useHomeSession()
  const { choice } = useTermChoice(session)
  return useScopedRead(session, [...queryKeys.store.staffSummary(), choice.termId, choice.academicYear],
    session.access.queries.members, signal => getStoreStaffSummary(choice.termId, signal, choice.academicYear), options)
}
