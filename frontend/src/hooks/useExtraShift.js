import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createExtraShiftRequest,
  getSubstituteRequests,
  respondExtraShift,
  approveExtraShift,
} from '@/api'
import { queryKeys } from './queryKeys.js'

function useInvalidateAfterExtraShift() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notification.list() })
    queryClient.invalidateQueries({ queryKey: ['substitute'] })
  }
}

/** @param {'OPEN'|'FILLED'|'CANCELLED'|'EXPIRED'} [status] */
export function useSubstituteRequests(status = 'OPEN', options = {}) {
  return useQuery({
    queryKey: queryKeys.substitute.requests(status),
    queryFn: () => getSubstituteRequests(status),
    ...options,
  })
}

export function useCreateExtraShiftRequest() {
  const invalidate = useInvalidateAfterExtraShift()
  return useMutation({
    mutationFn: (payload) => createExtraShiftRequest(payload),
    onSuccess: invalidate,
  })
}

export function useRespondExtraShift() {
  const invalidate = useInvalidateAfterExtraShift()
  return useMutation({
    mutationFn: ({ requestId, payload }) =>
      respondExtraShift(requestId, payload),
    onSuccess: invalidate,
  })
}

export function useApproveExtraShift() {
  const invalidate = useInvalidateAfterExtraShift()
  return useMutation({
    mutationFn: ({ responseId, payload }) =>
      approveExtraShift(responseId, payload),
    onSuccess: invalidate,
  })
}
