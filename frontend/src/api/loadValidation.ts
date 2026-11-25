import { isAxiosError, type AxiosProgressEvent } from 'axios'
import client from './client.js'
import type { LoadProblem, LoadUpload, ValidatedLoad } from '@/types/loadValidation'

export class LoadValidationError extends Error {
  readonly status = 422
  readonly name = 'LoadValidationError'
  constructor(
    readonly problem: LoadProblem,
    cause: unknown,
  ) {
    super(problem.message, { cause })
  }
}

interface UploadOptions {
  signal?: AbortSignal
  onUploadProgress?: (event: AxiosProgressEvent) => void
}

export async function validateTeachingLoad(
  termId: number,
  { file, sheet, subjectAliases }: LoadUpload,
  options: UploadOptions = {},
  http = client,
): Promise<ValidatedLoad> {
  const body = new FormData()
  body.append('file', file)
  if (sheet !== undefined) body.append('sheet', sheet)
  if (subjectAliases !== undefined) {
    body.append(
      'subjectAliases',
      new Blob([JSON.stringify(subjectAliases)], { type: 'application/json' }),
    )
  }

  try {
    const { status, data } = await http.post<ValidatedLoad>(
      `/api/v2/terms/${termId}/load-imports/validate`,
      body,
      {
        ...options,
        params: { forGeneration: true },
        // Remove the instance's JSON default. The transport supplies its multipart boundary.
        headers: { 'Content-Type': undefined },
      },
    )
    if (
      status !== 200 ||
      typeof data?.validatedLoadId !== 'string' ||
      !data.validatedLoadId.trim()
    ) {
      throw new Error('시수표 검증 응답에서 편성용 검증 ID를 확인할 수 없습니다.')
    }
    return data
  } catch (error) {
    if (isAxiosError<LoadProblem>(error) && error.response?.status === 422) {
      const problem = error.response.data
      if (
        typeof problem?.code === 'string' &&
        typeof problem.message === 'string' &&
        Array.isArray(problem.fieldErrors)
      ) {
        throw new LoadValidationError(problem, error)
      }
    }
    throw error
  }
}
