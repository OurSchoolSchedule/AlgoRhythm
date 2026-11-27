import client from './client'

export interface OperatingDay {
  date: string
  status: 'OPEN' | 'OUTSIDE_TERM' | 'EXCLUDED'
  versionId: number | null
  periods: number[] | null
  gradePeriods: Record<string, number[]>
  classGrades: Record<string, number>
}

interface Week {
  weekStart: string
  days: OperatingDay[]
}

export async function getOperatingWeek(termId: number, monday: string, signal: AbortSignal) {
  const { data } = await client.get<Week>(`/api/v2/terms/${termId}/operating-week`, {
    params: { weekOf: monday },
    signal,
  })
  if (data?.weekStart !== monday || !Array.isArray(data.days) || data.days.length !== 5)
    throw new Error('게시된 운영 교시를 확인할 수 없습니다.')
  return data
}

// Before generation snapshots existed, only the school timetable and term dates were recorded.
export function operatingReason(
  day: OperatingDay | undefined,
  classId: number | null,
  period: number,
) {
  if (day?.status === 'OUTSIDE_TERM') return '학기 기간 밖'
  if (day?.status === 'EXCLUDED') return '수업 제외일'
  if (!day?.periods) return ''
  const grade = classId == null ? undefined : day.classGrades[String(classId)]
  const periods = (grade == null ? undefined : day.gradePeriods[String(grade)]) ?? day.periods
  return periods.includes(period) ? '' : '운영 교시 밖'
}
