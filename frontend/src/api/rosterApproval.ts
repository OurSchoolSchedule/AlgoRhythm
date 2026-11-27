import client from './client'
import type { OwnRoster } from './ownRoster'

export interface MatchOptions {
  applicantName: string
  verifiedEmail: string | null
  subjectHint: string | null
  requestedAt: string | null
  termId: number | null
  requiresSelection: boolean
  candidates: {
    teacherSchoolUserId: number
    displayName: string
    subjects: string[]
    weeklyPeriods: number
    linked: boolean
  }[]
}

const path = (schoolId: number) => `/api/schools/${schoolId}/roster`

export async function listApprovalEntries(schoolId: number, signal: AbortSignal) {
  const { data } = await client.get<OwnRoster[]>(path(schoolId), { signal })
  return data.filter((entry) => entry.schoolId === schoolId)
}

export async function getMatchOptions(
  schoolId: number,
  rosterId: number,
  termId: number | null,
  signal: AbortSignal,
) {
  const { data } = await client.get<MatchOptions>(`${path(schoolId)}/${rosterId}/match-options`, {
    params: termId == null ? undefined : { termId },
    signal,
  })
  if (
    typeof data?.requiresSelection !== 'boolean' ||
    !Array.isArray(data.candidates) ||
    (termId !== null && data.termId !== termId)
  ) {
    throw new Error('선택한 학기의 명부 후보를 확인하지 못했습니다.')
  }
  return data
}

export async function approveApplicant(
  schoolId: number,
  rosterId: number,
  teacherSchoolUserId: number | null,
  signal: AbortSignal,
) {
  const { data } = await client.post<OwnRoster>(
    `${path(schoolId)}/${rosterId}/approve`,
    teacherSchoolUserId === null ? {} : { teacherSchoolUserId },
    { signal },
  )
  if (
    data.schoolId !== schoolId ||
    data.rosterId !== rosterId ||
    data.status !== 'LINKED' ||
    data.employmentStatus !== 'HIRED'
  ) {
    throw new Error('승인 결과를 확인하지 못했습니다. 신청 목록을 새로고침해 주세요.')
  }
}

export async function rejectApplicant(
  schoolId: number,
  rosterId: number,
  requestedAt: string | null,
  signal: AbortSignal,
) {
  const response = await client.post(`${path(schoolId)}/${rosterId}/reject`, { requestedAt }, { signal })
  if (response.status !== 204) throw new Error('거절 결과를 확인하지 못했습니다. 신청 목록을 새로고침해 주세요.')
}
