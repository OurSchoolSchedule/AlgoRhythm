import { useQuery } from '@tanstack/react-query'
import { getStoreStaffSummary } from '@/api'
import { queryKeys } from './queryKeys.js'

export function useStoreStaffSummary(options = {}) {
  return useQuery({
    queryKey: queryKeys.store.staffSummary(),
    queryFn: getStoreStaffSummary,
    ...options,
  })
}
