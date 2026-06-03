import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createScheduleRequest,
  getSubmissionStatus,
  generateSchedule,
  getCandidateSchedules,
  confirmSchedule,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useCreateScheduleRequest() {
  return useMutation({
    mutationFn: (payload) => createScheduleRequest(payload),
  })
}

/** @param {number} storeId */
export function useSubmissionStatus(storeId, options = {}) {
  return useQuery({
    queryKey: queryKeys.schedule.submissionStatus(storeId),
    queryFn: () => getSubmissionStatus(storeId),
    enabled: storeId != null,
    ...options,
  })
}

export function useGenerateSchedule() {
  return useMutation({
    mutationFn: ({ scheduleRequestId, payload }) =>
      generateSchedule(scheduleRequestId, payload),
  })
}

/** @param {string} key candidateScheduleKey */
export function useCandidateSchedules(key, options = {}) {
  return useQuery({
    queryKey: queryKeys.schedule.candidates(key),
    queryFn: () => getCandidateSchedules(key),
    enabled: Boolean(key),
    ...options,
  })
}

export function useConfirmSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ scheduleRequestId, payload }) =>
      confirmSchedule(scheduleRequestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-shift'] })
    },
  })
}
