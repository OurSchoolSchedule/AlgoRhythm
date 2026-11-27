import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMyUnavailabilities,
  deleteMyUnavailability,
  getMyUnavailabilities,
  getSchoolUnavailabilities,
  replaceMyUnavailabilities,
} from '@/api'
import { queryKeys } from './queryKeys.js'
import { useHomeSession, useScopedRead } from './useHomeSession'

export function useMyUnavailabilities(options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.unavailability.me(), session.access.queries.catalog,
    (signal) => getMyUnavailabilities({ signal }), options)
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
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.me() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.school() }),
    ]),
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
