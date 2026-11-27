import { schoolDate } from '@/utils/homeContract'
import { useMemo } from 'react'
import { useHomeSession } from './useHomeSession'
import { usePeriodSettings } from './useSchoolSetting.js'
import { useWeekRead } from './homeReads'
import { buildSchoolTimetable } from '@/utils/schoolTimetable.js'

/**
 * 홈·시간표 페이지 공통 시간표.
 * - 교사(TEACHER): GET /api/timetable/me 또는 year/semester
 * - 관리자(ADMIN): GET /api/timetable 또는 year/semester
 * @param {Date | { referenceDate?: Date, weekOf?: string, academicYear?: number, semester?: number }} [input]
 */
export function useSchoolTimetable(input = new Date()) {
  const isDate = input instanceof Date
  const academicYear = isDate ? undefined : input?.academicYear
  const semester = isDate ? undefined : input?.semester
  const referenceDate = useMemo(() => {
    if (isDate) return input
    return input?.referenceDate ?? new Date()
  }, [isDate, input])

  const session = useHomeSession()
  const periodSettings = usePeriodSettings()
  const isAdmin = session.access.queries.adminProfile
  const view = isAdmin ? 'school' : session.access.queries.teacherProfile ? 'mine' : 'unavailable'
  const weekOf = (!isDate && input?.weekOf) || schoolDate(referenceDate)
  const query = useWeekRead(session, view, academicYear, semester, undefined, undefined, { date: weekOf })
  const error = session.active.error || query.error
  const timetable = useMemo(
    () => buildSchoolTimetable(query.isError ? [] : query.data ?? [], referenceDate, periodSettings.data),
    [query.data, query.isError, referenceDate, periodSettings.data],
  )

  return {
    timetable,
    isAdminView: isAdmin,
    isLoading: session.switching || session.active.isLoading || query.isLoading,
    isError: Boolean(error),
    error,
    refetch: view === 'unavailable' ? session.active.refetch : query.refetch,
  }
}
