import client from './client.js'
import type { SubjectResponse } from '@/types/schoolCatalog'

export interface DirectoryTeacher {
  rosterId: number | null
  schoolUserId: number | null
  displayName: string
  subjectIds: number[]
  grades: number[]
}

export interface TeachingDirectory {
  schoolId: number
  termId: number
  loadId: number | null
  subjects: SubjectResponse[]
  teachers: DirectoryTeacher[]
}

export async function getTeachingDirectory(
  termId: number,
  signal: AbortSignal,
) {
  const { data } = await client.get<TeachingDirectory>(
    `/api/v2/terms/${termId}/teaching-directory`,
    { signal },
  )
  return data
}
