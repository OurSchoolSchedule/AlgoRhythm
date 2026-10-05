import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyTimetable, getSchoolTimetable, updateTimetable } from '@/api'
import { queryKeys } from './queryKeys.js'

export function useMyTimetable(options = {}) {
  return useQuery({
    queryKey: queryKeys.timetable.mine(),
    queryFn: getMyTimetable,
    ...options,
  })
}

export function useSchoolTimetableList(options = {}) {
  return useQuery({
    queryKey: queryKeys.timetable.school(),
    queryFn: getSchoolTimetable,
    ...options,
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
