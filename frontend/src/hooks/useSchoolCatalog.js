import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSchoolClass,
  deleteSchoolClass,
  getSchoolClasses,
  getSubjects,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useSubjects(options = {}) {
  return useQuery({
    queryKey: queryKeys.schoolCatalog.subjects(),
    queryFn: getSubjects,
    ...options,
  })
}

/** @param {number} [academicYear] */
export function useSchoolClasses(academicYear, options = {}) {
  return useQuery({
    queryKey: queryKeys.schoolCatalog.classes(academicYear),
    queryFn: () => getSchoolClasses(academicYear),
    ...options,
  })
}

export function useCreateSchoolClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createSchoolClass(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', 'classes'] })
    },
  })
}

export function useDeleteSchoolClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (classId) => deleteSchoolClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', 'classes'] })
    },
  })
}
