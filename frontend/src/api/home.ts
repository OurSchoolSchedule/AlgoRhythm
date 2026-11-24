import client from './client.js'
import type { HomeMemberDto, HomeNoticeDto } from '@/types/home'
import type { DatedLessonDto } from '@/types/datedLesson'

export interface DirectoryMember extends HomeMemberDto {
  position?: string
  employmentStatus?: string
  username: string | null
}

async function readList<T>(url: string, signal?: AbortSignal, params?: Record<string, string>) {
  const { data } = await client.get<T[]>(url, { signal, params })
  if (!Array.isArray(data)) throw new TypeError('목록 응답 형식을 확인하세요.')
  return data
}

export function getHomeDirectory(admin: boolean, signal: AbortSignal) {
  return readList<DirectoryMember>(admin ? '/api/school/members' : '/api/school/teachers', signal)
}

export function getHomeNotices(signal?: AbortSignal) {
  return readList<HomeNoticeDto>('/api/notifications', signal)
}

export async function getDatedLessons(termId: number, date: string, signal: AbortSignal) {
  const rows = await readList<DatedLessonDto>(`/api/v2/terms/${termId}/lessons`, signal, { date })
  return rows.filter((row) => row.termId === termId && row.date === date)
}
