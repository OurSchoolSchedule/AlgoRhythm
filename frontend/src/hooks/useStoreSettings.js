import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getStoreSetting,
  updateStoreSetting,
  saveTemporarySetting,
  getTemporarySetting,
  applyTemporarySetting,
  deleteTemporarySetting,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useStoreSetting(options = {}) {
  return useQuery({
    queryKey: queryKeys.storeSettings.detail(),
    queryFn: getStoreSetting,
    ...options,
  })
}

export function useUpdateStoreSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => updateStoreSetting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.storeSettings.detail(),
      })
    },
  })
}

export function useTemporarySetting(key, options = {}) {
  return useQuery({
    queryKey: queryKeys.storeSettings.temporary(key),
    queryFn: () => getTemporarySetting(key),
    enabled: Boolean(key),
    ...options,
  })
}

export function useSaveTemporarySetting() {
  return useMutation({
    mutationFn: (payload) => saveTemporarySetting(payload),
  })
}

export function useApplyTemporarySetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key) => applyTemporarySetting(key),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.storeSettings.detail(),
      })
    },
  })
}

export function useDeleteTemporarySetting() {
  return useMutation({
    mutationFn: (key) => deleteTemporarySetting(key),
  })
}
