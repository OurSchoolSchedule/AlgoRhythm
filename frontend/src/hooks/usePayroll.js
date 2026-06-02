import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getStorePayrollSummary,
  getStorePayrollTotal,
  getStaffPayrollDetail,
  getEmployeePayrollDetail,
  getStoreStaffWages,
  updateStaffWage,
  getMyPayrolls,
  getMyPayrollsTotal,
  getMinimumWage,
  getCurrentMinimumWage,
  createMinimumWage,
} from '@/api'
import { queryKeys } from './queryKeys.js'

// ===== OWNER: 매장 급여 =====

export function useStorePayrollSummary(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.storeSummary(params),
    queryFn: () => getStorePayrollSummary(params),
    ...options,
  })
}

export function useStorePayrollTotal(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.storeTotal(params),
    queryFn: () => getStorePayrollTotal(params),
    ...options,
  })
}

export function useStaffPayrollDetail(userStoreId, params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.staffDetail(userStoreId, params),
    queryFn: () => getStaffPayrollDetail(userStoreId, params),
    enabled: userStoreId != null,
    ...options,
  })
}

export function useEmployeePayrollDetail(userStoreId, params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.employeeDetail(userStoreId, params),
    queryFn: () => getEmployeePayrollDetail(userStoreId, params),
    enabled: userStoreId != null,
    ...options,
  })
}

// ===== OWNER: 시급 =====

export function useStoreStaffWages(options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.storeWages(),
    queryFn: getStoreStaffWages,
    ...options,
  })
}

export function useUpdateStaffWage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userStoreId, payload }) =>
      updateStaffWage(userStoreId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.storeWages() })
    },
  })
}

// ===== STAFF: 내 급여 =====

export function useMyPayrolls(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.me(params),
    queryFn: () => getMyPayrolls(params),
    ...options,
  })
}

export function useMyPayrollsTotal(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.meTotal(params),
    queryFn: () => getMyPayrollsTotal(params),
    ...options,
  })
}

// ===== 최저임금 =====

export function useMinimumWage(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.minimumWage(params),
    queryFn: () => getMinimumWage(params),
    ...options,
  })
}

export function useCurrentMinimumWage(options = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.currentMinimumWage(),
    queryFn: getCurrentMinimumWage,
    ...options,
  })
}

export function useCreateMinimumWage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createMinimumWage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'minimum-wage'] })
    },
  })
}
