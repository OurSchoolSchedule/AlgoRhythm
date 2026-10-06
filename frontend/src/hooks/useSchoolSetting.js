import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPeriodSetting,
  deletePeriodSetting,
  getPeriodSettings,
  getSchoolSetting,
  saveSchoolSetting,
  updatePeriodSetting,
} from '@/api'
import { queryKeys } from './queryKeys.js'

function isMissingSetting(error) {
  return error?.response?.status === 404
}

export function useSchoolSetting(options = {}) {
  return useQuery({
    queryKey: queryKeys.schoolSetting.detail(),
    queryFn: getSchoolSetting,
    retry: (failureCount, error) => !isMissingSetting(error) && failureCount < 2,
    ...options,
  })
}

export function usePeriodSettings(options = {}) {
  return useQuery({
    queryKey: queryKeys.schoolSetting.periods(),
    queryFn: getPeriodSettings,
    ...options,
  })
}

function useInvalidateSchoolSetting() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.schoolSetting.detail() })
    queryClient.invalidateQueries({ queryKey: queryKeys.schoolSetting.periods() })
  }
}

export function useSaveSchoolSetting() {
  const invalidate = useInvalidateSchoolSetting()
  return useMutation({
    mutationFn: (payload) => saveSchoolSetting(payload),
    onSuccess: invalidate,
  })
}

export function useAddPeriodSetting() {
  const invalidate = useInvalidateSchoolSetting()
  return useMutation({
    mutationFn: (payload) => addPeriodSetting(payload),
    onSuccess: invalidate,
  })
}

export function useUpdatePeriodSetting() {
  const invalidate = useInvalidateSchoolSetting()
  return useMutation({
    mutationFn: ({ periodId, payload }) => updatePeriodSetting(periodId, payload),
    onSuccess: invalidate,
  })
}

export function useDeletePeriodSetting() {
  const invalidate = useInvalidateSchoolSetting()
  return useMutation({
    mutationFn: (periodId) => deletePeriodSetting(periodId),
    onSuccess: invalidate,
  })
}
