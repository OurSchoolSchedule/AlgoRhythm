import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createTimetable,
  deleteTimetable,
  updateTimetable,
} from '@/api'
import { useWeekRead } from './homeReads'
import { useHomeSession } from './useHomeSession'

/**
 * @param {{ academicYear?: number, semester?: number } & import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useMyTimetable(options = {}) {
  const { academicYear, semester, ...queryOptions } = options
  const session = useHomeSession()
  return useWeekRead(session, 'mine', academicYear, semester, undefined, undefined, queryOptions)
}

/**
 * @param {{ academicYear?: number, semester?: number } & import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useSchoolTimetableList(options = {}) {
  const { academicYear, semester, ...queryOptions } = options
  const session = useHomeSession()
  return useWeekRead(session, 'school', academicYear, semester, undefined, undefined, queryOptions)
}

export function useCreateTimetable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createTimetable(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable'] }),
  })
}

export function useUpdateTimetable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patches) => Promise.all(
      patches.map((patch) => updateTimetable(patch.timetableId, patch.payload)),
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable'] }),
  })
}

export function useDeleteTimetable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (timetableId) => deleteTimetable(timetableId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable'] }),
  })
}
