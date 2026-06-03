import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMyAvailability,
  getMyAvailability,
  replaceMyAvailability,
  getStoreAvailabilities,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useMyAvailability(options = {}) {
  return useQuery({
    queryKey: queryKeys.availability.me(),
    queryFn: getMyAvailability,
    ...options,
  })
}

export function useCreateMyAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createMyAvailability(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.me() })
    },
  })
}

export function useReplaceMyAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => replaceMyAvailability(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.me() })
    },
  })
}

/** @param {number} storeId */
export function useStoreAvailabilities(storeId, options = {}) {
  return useQuery({
    queryKey: queryKeys.availability.store(storeId),
    queryFn: () => getStoreAvailabilities(storeId),
    enabled: storeId != null,
    ...options,
  })
}
