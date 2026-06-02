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

/**
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 */
export function useStoreStaffSummary(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.store.staffSummary(params),
    queryFn: () => getStoreStaffSummary(params),
    ...options,
  })
}
