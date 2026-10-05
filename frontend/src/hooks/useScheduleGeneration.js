import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createScheduleRequest,
  getTeachersWithoutAvailability,
  generateSchedule,
  getCandidateSchedules,
  confirmSchedule,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useCreateScheduleRequest() {
  return useMutation({
    mutationFn: () => createScheduleRequest(),
  })
}

/** 불가 교시 미제출 교사. 예전 제출 현황 API는 없다. */
export function useTeachersWithoutAvailability(options = {}) {
  return useQuery({
    queryKey: queryKeys.schedule.submissionStatus(),
    queryFn: getTeachersWithoutAvailability,
    ...options,
  })
}

export function useGenerateSchedule() {
  return useMutation({
    mutationFn: ({ scheduleRequestId, payload }) =>
      generateSchedule(scheduleRequestId, payload),
  })
}

/** @param {string} key candidateTimetableKey */
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
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}
