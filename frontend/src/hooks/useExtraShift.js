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

const SUBSTITUTE_STATUSES = ['OPEN', 'FILLED', 'CANCELLED', 'EXPIRED']

/** 상태별 조회를 합친다. 목록 API는 status를 빼면 OPEN만 준다. */
export function useSubstituteHistory(options = {}) {
  return useQuery({
    queryKey: queryKeys.substitute.requests('history'),
    queryFn: async () => {
      const lists = await Promise.all(SUBSTITUTE_STATUSES.map((status) => getSubstituteRequests(status)))
      const byId = new Map()
      for (const item of lists.flat()) {
        if (item?.id != null) byId.set(item.id, item)
      }
      return [...byId.values()]
    },
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
