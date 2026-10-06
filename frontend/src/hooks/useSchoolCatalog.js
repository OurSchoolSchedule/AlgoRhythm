import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSchoolClass,
  createSubject,
  deleteSchoolClass,
  deleteSubject,
  getSchoolClasses,
  getSubjects,
  updateSchoolClass,
  updateSubject,
} from '@/api'
import { queryKeys } from './queryKeys.js'

export function useSubjects(options = {}) {
  return useQuery({
    queryKey: queryKeys.schoolCatalog.subjects(),
    queryFn: getSubjects,
    ...options,
  })
}

function useInvalidateSubjects() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.schoolCatalog.subjects() })
}

export function useCreateSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: (payload) => createSubject(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: ({ subjectId, payload }) => updateSubject(subjectId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: (subjectId) => deleteSubject(subjectId),
    onSuccess: invalidate,
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

export function useUpdateSchoolClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, payload }) => updateSchoolClass(classId, payload),
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
