import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createExtraShiftRequest,
  respondExtraShift,
  approveExtraShift,
} from '@/api'
import { queryKeys } from './queryKeys.js'

function useInvalidateAfterExtraShift() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notification.list() })
    queryClient.invalidateQueries({ queryKey: ['work-shift'] })
  }
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
    mutationFn: ({ requestId, payload }) =>
      approveExtraShift(requestId, payload),
    onSuccess: invalidate,
  })
}
