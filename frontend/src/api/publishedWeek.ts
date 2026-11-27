import client from './client'
import type { TimetableDto } from '@/types/timetable.js'

export interface PublishedDay {
  date: string
  inTerm: boolean
  published: boolean
  excluded: boolean
  periods?: number[] | null
  gradePeriods?: Record<string, number[]>
  lastPeriod: number | null
  lastPeriodByGrade: Record<string, number>
}

export interface PublishedWeek {
  termId: number
  weekStart: string
  classId: number | null
  teacherId: number | null
  days: PublishedDay[]
  lessons: TimetableDto[]
}

export type PublishedView = 'mine' | 'school' | 'class' | 'teacher'

export async function getPublishedWeek(
  termId: number,
  date: string,
  view: PublishedView,
  classId: number | undefined,
  teacherId: number | undefined,
  signal: AbortSignal,
) {
  const { data } = await client.get<PublishedWeek>(`/api/v2/terms/${termId}/timetable-week`, {
    signal,
    params: { date, view, classId, teacherId },
  })
  if (
    data.termId !== termId ||
    !Array.isArray(data.days) ||
    !Array.isArray(data.lessons) ||
    (view === 'class' && data.classId !== classId) ||
    (view === 'teacher' && data.teacherId !== teacherId)
  )
    throw new Error('선택한 학기와 조회 대상의 시간표를 확인할 수 없습니다.')
  return data
}
