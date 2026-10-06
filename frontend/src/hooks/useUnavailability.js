import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMyUnavailabilities,
  deleteMyUnavailability,
  getMyUnavailabilities,
  getSchoolUnavailabilities,
  replaceMyUnavailabilities,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useMyUnavailabilities(options = {}) {
  return useQuery({
    queryKey: queryKeys.unavailability.me(),
    queryFn: getMyUnavailabilities,
    ...options,
  })
}

export function useSchoolUnavailabilities(options = {}) {
  return useQuery({
    queryKey: queryKeys.unavailability.school(),
    queryFn: getSchoolUnavailabilities,
    ...options,
  })
}

export function useSaveUnavailabilities() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ replace, unavailabilities }) => (
      replace
        ? replaceMyUnavailabilities(unavailabilities)
        : createMyUnavailabilities(unavailabilities)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.me() })
    },
  })
}

export function useDeleteUnavailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (availabilityId) => deleteMyUnavailability(availabilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.school() })
    },
  })
}
