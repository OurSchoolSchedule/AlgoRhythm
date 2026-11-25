import client from './client'

export type SchoolOption = {
  officeCode: string | null
  standardSchoolCode: string | null
  officeName: string | null
  schoolName: string | null
  schoolKind: string | null
  address: string | null
  selectable: boolean
}

export type SchoolSearch = {
  q: string
  officeCode?: string
  schoolKind?: string
  page: number
}

export type SchoolLink = {
  schoolId: number
  version: number
  status: 'LINKED' | 'NOT_LINKED'
  school: SchoolOption | null
  linkedAt: string | null
}

export function canSelect(
  option: SchoolOption | null,
): option is SchoolOption & {
  officeCode: string
  standardSchoolCode: string
} {
  return Boolean(
    option?.selectable &&
    option.officeCode?.trim() &&
    option.standardSchoolCode?.trim(),
  )
}

export async function searchSchools(params: SchoolSearch, signal: AbortSignal) {
  const { data } = await client.get<{
    items: SchoolOption[]
    page: number
    size: number
    totalCount: number
    hasNext: boolean
  }>('/api/neis/schools/search', { params, signal })
  return data
}

function checkedLink(data: SchoolLink, schoolId: number) {
  if (
    data?.schoolId !== schoolId ||
    !Number.isSafeInteger(data.version) ||
    data.version < 0 ||
    !(data.status === 'LINKED' || data.status === 'NOT_LINKED')
  ) {
    throw new Error('현재 학교의 연결 정보를 확인하지 못했습니다.')
  }
  return data
}

export async function getSchoolLink(schoolId: number, signal: AbortSignal) {
  const { data } = await client.get<SchoolLink>(
    `/api/neis/schools/${schoolId}/link`,
    { signal },
  )
  return checkedLink(data, schoolId)
}

export async function patchSchoolLink(
  schoolId: number,
  option: SchoolOption,
  expectedVersion: number,
) {
  if (!canSelect(option)) throw new Error('학교 코드를 확인해 주세요.')
  const { data } = await client.patch<SchoolLink>(
    `/api/neis/schools/${schoolId}/link`,
    {
      officeCode: option.officeCode,
      standardSchoolCode: option.standardSchoolCode,
      expectedVersion,
    },
  )
  return checkedLink(data, schoolId)
}
