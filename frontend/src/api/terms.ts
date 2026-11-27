import client from './client.js'
import { excludedDatesError, isCalendarDate } from '@/utils/termExcludedDates'

export interface NewTerm {
  academicYear: number
  semester: number
  startDate: string
  endDate: string
  excludedDates?: string[]
}

export interface RegisteredTerm extends NewTerm {
  termId: number
}

export type TermDates = Pick<NewTerm, 'startDate' | 'endDate'> & { excludedDates: string[] }

export const termsKey = ['school-terms'] as const
const termsUrl = '/api/v2/terms'

function checkedTerm(term: RegisteredTerm) {
  if (
    !term ||
    !Number.isSafeInteger(term.termId) ||
    term.termId <= 0 ||
    !Number.isInteger(term.academicYear) ||
    ![1, 2].includes(term.semester) ||
    !isCalendarDate(term.startDate) ||
    !isCalendarDate(term.endDate) ||
    term.startDate > term.endDate ||
    (term.excludedDates !== undefined && !Array.isArray(term.excludedDates)) ||
    excludedDatesError(term.startDate, term.endDate, term.excludedDates ?? [])
  )
    throw new Error('학교 학기 정보를 확인할 수 없습니다.')
  return { ...term, excludedDates: term.excludedDates ?? [] }
}

export async function listTerms(signal: AbortSignal): Promise<RegisteredTerm[]> {
  const { data } = await client.get<RegisteredTerm[]>(termsUrl, { signal })
  if (!Array.isArray(data)) throw new Error('학교 학기 목록을 확인할 수 없습니다.')
  return data.map(checkedTerm)
}

export async function registerTerm(input: NewTerm, signal: AbortSignal) {
  const { status, data } = await client.post<{ termId: number }>(termsUrl, input, { signal })
  if (status !== 201 || !Number.isSafeInteger(data?.termId) || data.termId <= 0)
    throw new Error('등록된 학기를 확인할 수 없습니다.')
  return data.termId
}

export async function updateTerm(
  termId: number,
  input: TermDates & { expectedCalendar?: TermDates },
  signal: AbortSignal,
) {
  const { data, status } = await client.patch<RegisteredTerm>(`${termsUrl}/${termId}`, input, {
    signal,
  })
  if (status !== 200 || data?.termId !== termId || !Array.isArray(data.excludedDates))
    throw new Error('변경된 학기 정보를 확인할 수 없습니다.')
  return checkedTerm(data)
}
