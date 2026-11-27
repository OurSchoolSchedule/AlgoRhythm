import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { useHomeSession, useScopedRead } from './useHomeSession'
import { schoolClassRolesKey } from './useClassRoles'
import { queryKeys } from './queryKeys.js'

export function useSubjects(options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.schoolCatalog.subjects(), session.access.queries.catalog,
    signal => getSubjects({ signal }), options)
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
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.schoolCatalog.classes(academicYear), session.access.queries.catalog,
    signal => getSchoolClasses(academicYear, { signal }), options)
}

function useInvalidateClasses() {
  const cache = useQueryClient()
  const session = useHomeSession()
  return () => Promise.all([
    cache.invalidateQueries({ queryKey: ['school', 'classes'] }),
    cache.invalidateQueries({ queryKey: schoolClassRolesKey(session.scope.schoolId) }),
    cache.invalidateQueries({ queryKey: queryKeys.store.staffSummary() }),
    cache.invalidateQueries({ queryKey: queryKeys.home.directory() }),
  ])
}

export function useCreateSchoolClass() {
  const invalidate = useInvalidateClasses()
  return useMutation({
    mutationFn: (payload) => createSchoolClass(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateSchoolClass() {
  const invalidate = useInvalidateClasses()
  return useMutation({
    mutationFn: ({ classId, payload }) => updateSchoolClass(classId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteSchoolClass() {
  const invalidate = useInvalidateClasses()
  return useMutation({
    mutationFn: (classId) => deleteSchoolClass(classId),
    onSuccess: invalidate,
  })
}
