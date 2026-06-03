import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createShiftSwapRequest,
  respondShiftSwap,
  approveShiftSwap,
} from '@/api'
import { queryKeys } from './queryKeys.js'

function useInvalidateAfterSwap() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notification.list() })
    queryClient.invalidateQueries({ queryKey: ['work-shift'] })
  }
}

export function useCreateShiftSwapRequest() {
  const invalidate = useInvalidateAfterSwap()
  return useMutation({
    mutationFn: (payload) => createShiftSwapRequest(payload),
    onSuccess: invalidate,
  })
}

export function useRespondShiftSwap() {
  const invalidate = useInvalidateAfterSwap()
  return useMutation({
    mutationFn: ({ requestId, payload }) => respondShiftSwap(requestId, payload),
    onSuccess: invalidate,
  })
}

export function useApproveShiftSwap() {
  const invalidate = useInvalidateAfterSwap()
  return useMutation({
    mutationFn: ({ requestId, payload }) => approveShiftSwap(requestId, payload),
    onSuccess: invalidate,
  })
}
