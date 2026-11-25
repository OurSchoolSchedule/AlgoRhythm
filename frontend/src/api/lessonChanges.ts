import client from './client.js'
import type {
  ApprovedChange,
  ChangeApproval,
  ChangeDecision,
  LessonChange,
  NewLessonChange,
} from '@/types/lessonChange'

const changesUrl = (termId: number) => `/api/v2/terms/${termId}/lesson-changes`
const rev = (value: number) => Number.isSafeInteger(value) && value >= 0
const id = (value: number) => Number.isSafeInteger(value) && value > 0

function checkChange(row: LessonChange, termId: number) {
  if (
    row?.termId !== termId ||
    !id(row.id) ||
    !id(row.requester) ||
    !id(row.responder) ||
    !id(row.firstId) ||
    !rev(row.firstRev) ||
    !rev(row.rev) ||
    !['PENDING', 'ACCEPTED', 'REJECTED', 'APPROVED'].includes(row.state) ||
    !(
      (row.kind === 'SUBSTITUTE' && row.secondId === null && row.secondRev === null) ||
      (row.kind === 'SWAP' && id(row.secondId) && rev(row.secondRev))
    )
  )
    throw new Error('날짜 수업 변경 신청 응답을 확인할 수 없습니다.')
  return row
}

export async function getLessonChanges(termId: number, signal?: AbortSignal) {
  const { data, status } = await client.get<LessonChange[]>(changesUrl(termId), { signal })
  if (status !== 200 || !Array.isArray(data))
    throw new Error('수업 변경 신청 목록을 확인할 수 없습니다.')
  return data.map((row) => checkChange(row, termId))
}

export async function createLessonChange(
  termId: number,
  body: NewLessonChange,
  signal?: AbortSignal,
) {
  const { data, status } = await client.post<LessonChange>(changesUrl(termId), body, { signal })
  if (status !== 201 || data?.kind !== body.kind || data.state !== 'PENDING')
    throw new Error('수업 변경 신청 접수 결과를 확인할 수 없습니다.')
  return checkChange(data, termId)
}

export async function respondToLessonChange(
  termId: number,
  changeId: number,
  body: ChangeDecision,
  signal?: AbortSignal,
) {
  const { data, status } = await client.post<LessonChange>(
    `${changesUrl(termId)}/${changeId}/response`,
    body,
    { signal },
  )
  if (
    status !== 200 ||
    data?.id !== changeId ||
    data.state !== (body.accept ? 'ACCEPTED' : 'REJECTED')
  )
    throw new Error('수락·거절 결과를 확인할 수 없습니다.')
  return checkChange(data, termId)
}

export async function approveLessonChange(
  termId: number,
  changeId: number,
  body: ChangeApproval,
  idempotencyKey: string,
  signal?: AbortSignal,
) {
  const { data, status } = await client.post<ApprovedChange>(
    `${changesUrl(termId)}/${changeId}/approval`,
    body,
    {
      signal,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
  )
  if (
    status !== 200 ||
    data?.requestId !== changeId ||
    data.state !== 'APPROVED' ||
    !rev(data.requestRev) ||
    !Array.isArray(data.lessons) ||
    data.lessons.length !== (body.expectedSecondRev === undefined ? 1 : 2) ||
    !data.lessons.every((row) => row.termId === termId && id(row.id) && rev(row.rev))
  ) {
    throw new Error('수업 변경 승인 결과를 확인할 수 없습니다.')
  }
  return data
}
