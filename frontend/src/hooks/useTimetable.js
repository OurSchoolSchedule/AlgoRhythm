import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTimetable,
  deleteTimetable,
  getMyTimetable,
  getMyTimetableByTerm,
  getSchoolTimetable,
  getSchoolTimetableByTerm,
  updateTimetable,
} from '@/api'
import { queryKeys } from './queryKeys.js'

/**
 * @param {{ academicYear?: number, semester?: number } & import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useMyTimetable(options = {}) {
  const { academicYear, semester, ...queryOptions } = options
  const hasTerm = academicYear != null && semester != null
  return useQuery({
    queryKey: queryKeys.timetable.mine(academicYear, semester),
    queryFn: () => (
      hasTerm
        ? getMyTimetableByTerm(academicYear, semester)
        : getMyTimetable()
    ),
    ...queryOptions,
  })
}

/**
 * @param {{ academicYear?: number, semester?: number } & import('@tanstack/react-query').UseQueryOptions} [options]
 */
export function useSchoolTimetableList(options = {}) {
  const { academicYear, semester, ...queryOptions } = options
  const hasTerm = academicYear != null && semester != null
  return useQuery({
    queryKey: queryKeys.timetable.school(academicYear, semester),
    queryFn: () => (
      hasTerm
        ? getSchoolTimetableByTerm(academicYear, semester)
        : getSchoolTimetable()
    ),
    ...queryOptions,
  })
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
