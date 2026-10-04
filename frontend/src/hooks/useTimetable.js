import { useQuery } from '@tanstack/react-query'
import { getMyTimetable, getSchoolTimetable } from '@/api'
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
