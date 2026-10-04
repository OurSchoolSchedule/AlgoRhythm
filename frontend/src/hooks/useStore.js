import { useQuery } from '@tanstack/react-query'
import { getStoreStaff, getStoreStaffSummary } from '@/api'
import { queryKeys } from './queryKeys.js'

export function useStoreStaff(options = {}) {
  return useQuery({
    queryKey: queryKeys.store.staff(),
    queryFn: getStoreStaff,
    ...options,
  })
}

export function useStoreStaffSummary(options = {}) {
  return useQuery({
    queryKey: queryKeys.store.staffSummary(),
    queryFn: getStoreStaffSummary,
    ...options,
  })
}
