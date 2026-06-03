import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getWorkShifts,
  getStoreWeekShifts,
  getMyWeekShifts,
  createWorkShift,
  updateWorkShift,
  deleteWorkShift,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useWorkShifts(options = {}) {
  return useQuery({
    queryKey: queryKeys.workShift.all(),
    queryFn: getWorkShifts,
    ...options,
  })
}

/** @param {{ start: string, end: string }} range */
export function useStoreWeekShifts(range, options = {}) {
  return useQuery({
    queryKey: queryKeys.workShift.storeWeek(range),
    queryFn: () => getStoreWeekShifts(range),
    enabled: Boolean(range?.start && range?.end),
    ...options,
  })
}

/** @param {{ start: string, end: string }} range */
export function useMyWeekShifts(range, options = {}) {
  return useQuery({
    queryKey: queryKeys.workShift.myWeek(range),
    queryFn: () => getMyWeekShifts(range),
    enabled: Boolean(range?.start && range?.end),
    ...options,
  })
}

function useInvalidateWorkShifts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['work-shift'] })
}

export function useCreateWorkShift() {
  const invalidate = useInvalidateWorkShifts()
  return useMutation({
    mutationFn: (payload) => createWorkShift(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateWorkShift() {
  const invalidate = useInvalidateWorkShifts()
  return useMutation({
    mutationFn: ({ shiftId, payload }) => updateWorkShift(shiftId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteWorkShift() {
  const invalidate = useInvalidateWorkShifts()
  return useMutation({
    mutationFn: (shiftId) => deleteWorkShift(shiftId),
    onSuccess: invalidate,
  })
}
