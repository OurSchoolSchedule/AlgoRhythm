import { useMemo } from 'react'
import { useActiveStore } from './useMypage.js'
import { useMyTimetable, useSchoolTimetableList } from './useTimetable.js'
import { buildSchoolTimetable } from '@/utils/schoolTimetable.js'

/**
 * 홈·시간표 페이지 공통 시간표.
 * - 교사(TEACHER): GET /api/timetable/me 또는 year/semester
 * - 관리자(ADMIN): GET /api/timetable 또는 year/semester
 * @param {Date | { referenceDate?: Date, academicYear?: number, semester?: number }} [input]
 */
export function useSchoolTimetable(input = new Date()) {
  const isDate = input instanceof Date
  const academicYear = isDate ? undefined : input?.academicYear
  const semester = isDate ? undefined : input?.semester
  const referenceDate = useMemo(() => {
    if (isDate) return input
    return input?.referenceDate ?? new Date()
  }, [isDate, input])

  const { data: activeSchool, isLoading: activeSchoolLoading } = useActiveStore()
  const isAdmin = activeSchool?.position === 'ADMIN'

  const myQuery = useMyTimetable({
    academicYear,
    semester,
    enabled: !activeSchoolLoading && !isAdmin,
  })
  const schoolQuery = useSchoolTimetableList({
    academicYear,
    semester,
    enabled: !activeSchoolLoading && isAdmin,
  })
  const query = isAdmin ? schoolQuery : myQuery

  const timetable = useMemo(
    () => buildSchoolTimetable(query.data ?? [], referenceDate),
    [query.data, referenceDate],
  )

  return {
    timetable,
    isAdminView: isAdmin,
    isLoading: activeSchoolLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
