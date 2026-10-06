import { useMemo } from 'react'
import { useActiveStore } from './useMypage.js'
import { useMyTimetable, useSchoolTimetableList } from './useTimetable.js'
import { buildSchoolTimetable } from '@/utils/schoolTimetable.js'

/**
 * 홈·시간표 페이지 공통 시간표.
 * - 교사(TEACHER): GET /api/timetable/me
 * - 관리자(ADMIN): GET /api/timetable
 * @param {Date} [referenceDate]
 */
export function useSchoolTimetable(referenceDate = new Date()) {
  const { data: activeSchool, isLoading: activeSchoolLoading } = useActiveStore()
  const isAdmin = activeSchool?.position === 'ADMIN'

  const myQuery = useMyTimetable({ enabled: !activeSchoolLoading && !isAdmin })
  const schoolQuery = useSchoolTimetableList({ enabled: !activeSchoolLoading && isAdmin })
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
