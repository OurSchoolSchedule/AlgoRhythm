import client from '@/api/client'
import { useAdminTerm, type SchoolTerm } from './useAdminTerm'
import { useScopedRead } from './useHomeSession'

export type ClassTeacher = { schoolUserId: number | null; displayName: string }
export type ClassAssignment = {
  classId: number
  academicYear: number
  grade: number
  classNumber: number
  homeroomTeacher: ClassTeacher | null
  deputyTeacher: ClassTeacher | null
}

export const schoolClassRolesKey = (schoolId: number | null) => ['term-class-roles', schoolId]

export function useClassRoles(scope: SchoolTerm | null) {
  const { session, termId, assertAccess } = useAdminTerm(scope)
  const key = [...schoolClassRolesKey(session.scope.schoolId), termId]
  const url = `/api/v2/terms/${termId}/homerooms`
  const roles = useScopedRead(
    session,
    key,
    termId !== null,
    async (signal) => (await client.get<ClassAssignment[]>(url, { signal })).data,
    { retry: false },
  )
  return { roles, key, url, session, assertAccess }
}
