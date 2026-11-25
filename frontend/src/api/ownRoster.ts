import client from './client'
import type { HomeroomDto, SubjectInfoDto } from '@/types/home'

export interface OwnRoster {
  rosterId: number
  schoolId: number
  displayName: string
  authEmail: string
  status: 'UNLINKED' | 'PENDING' | 'LINKED'
  employmentStatus: string | null
  schoolUserId: number | null
  term: {
    termId: number
    subjects: SubjectInfoDto[]
    homeroomClass: HomeroomDto | null
  } | null
}

// FE18 invalidates this school prefix when an administrator confirms a roster import.
export function ownRosterKey(schoolId: number) {
  return ['school-roster', schoolId, 'me'] as const
}

export async function readOwnRoster(
  schoolId: number,
  termId: number | null,
  signal: AbortSignal,
) {
  const { data } = await client.get<OwnRoster>(
    `/api/schools/${schoolId}/roster/me`,
    {
      params: termId === null ? undefined : { termId },
      signal,
    },
  )
  if (
    data?.schoolId !== schoolId ||
    (data.term?.termId ?? null) !== termId ||
    !Number.isSafeInteger(data.rosterId) ||
    !data.displayName ||
    !data.authEmail ||
    (termId !== null && !Array.isArray(data.term?.subjects))
  ) {
    throw new Error('선택한 학교·학기의 명부 응답을 확인할 수 없습니다.')
  }
  return data
}
