import { useMemo } from 'react'
import { useMyWeekShifts, useStoreWeekShifts } from './useWorkShift.js'
import { useActiveStore } from './useMypage.js'
import { getSchoolWeekRange } from '@/utils/weekRange.js'
import { buildSchoolTimetable } from '@/utils/schoolTimetable.js'
/** @param {import('@/types/workShift.js').WorkShiftDto} shift */
function mapStoreShiftForTimetable(shift) {
  return {
    id: shift.id,
    storeId: null,
    storeName: shift.username || '수업',
    startDatetime: shift.startDatetime,
    endDatetime: shift.endDatetime,
    shiftStatus: shift.shiftStatus,
  }
}

/**
 * 이번 주 시간표 (홈·시간표 페이지 공통).
 * - 교사(STAFF): GET /api/schedules/me/week
 * - 관리자(OWNER): GET /api/schedules/store/week (학교 전체)
 * @param {Date} [referenceDate]
 */
export function useSchoolTimetable(referenceDate = new Date()) {
  const week = useMemo(() => getSchoolWeekRange(referenceDate), [referenceDate.getTime()])
  const { data: activeStore, isLoading: activeStoreLoading } = useActiveStore()
  const isOwner = activeStore?.position === 'OWNER'

  const myQuery = useMyWeekShifts(week, { enabled: !activeStoreLoading && !isOwner })
  const storeQuery = useStoreWeekShifts(week, { enabled: !activeStoreLoading && isOwner })

  const query = isOwner ? storeQuery : myQuery

  const shifts = useMemo(() => {
    const raw = query.data ?? []
    if (!isOwner) return raw
    return raw.map(mapStoreShiftForTimetable)
  }, [query.data, isOwner])

  const timetable = useMemo(
    () => buildSchoolTimetable(shifts, referenceDate),
    [shifts, referenceDate.getTime()],
  )

  return {
    week,
    timetable,
    shifts,
    isOwnerView: isOwner,
    isLoading: activeStoreLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
