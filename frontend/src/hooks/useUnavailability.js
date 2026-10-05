import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMyUnavailabilities,
  getMyUnavailabilities,
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
