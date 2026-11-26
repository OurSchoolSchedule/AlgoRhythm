import client from './client.js'

export interface NewTerm {
  academicYear: number
  semester: number
  startDate: string
  endDate: string
}

export interface RegisteredTerm extends NewTerm {
  termId: number
}

export const termsKey = ['school-terms'] as const

export async function listTerms(signal: AbortSignal): Promise<RegisteredTerm[]> {
  const { data } = await client.get<RegisteredTerm[]>('/api/v2/terms', { signal })
  if (
    !Array.isArray(data) ||
    !data.every(
      (term) =>
        term &&
        Number.isSafeInteger(term.termId) &&
        term.termId > 0 &&
        Number.isInteger(term.academicYear) &&
        [1, 2].includes(term.semester) &&
        /^\d{4}-\d{2}-\d{2}$/.test(term.startDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(term.endDate),
    )
  )
    throw new Error('학교 학기 목록을 확인할 수 없습니다.')
  return data
}

export async function registerTerm(input: NewTerm, signal: AbortSignal) {
  const { status, data } = await client.post<{ termId: number }>('/api/v2/terms', input, { signal })
  if (status !== 201 || !Number.isSafeInteger(data?.termId) || data.termId <= 0)
    throw new Error('등록된 학기를 확인할 수 없습니다.')
  return data.termId
}
