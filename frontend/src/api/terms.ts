import client from './client.js'

export interface NewTerm {
  academicYear: number
  semester: number
  startDate: string
  endDate: string
}
export async function registerTerm(input: NewTerm, signal: AbortSignal) {
  const { status, data } = await client.post<{ termId: number }>('/api/v2/terms', input, { signal })
  if (status !== 201 || !Number.isSafeInteger(data?.termId) || data.termId <= 0)
    throw new Error('등록된 학기 ID를 확인할 수 없습니다.')
  return data.termId
}
