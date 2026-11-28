import client from './client.js'
import type { AcceptedGeneration, GenerationJob, GenerationRequest } from '@/types/generationJob'

const generationsUrl = (termId: number) => `/api/v2/terms/${termId}/generations`

function checkStatusUrl(termId: number, job: AcceptedGeneration) {
  if (
    typeof job?.jobId !== 'string' ||
    !/^[a-zA-Z0-9-]+$/.test(job.jobId) ||
    job.statusUrl !== `${generationsUrl(termId)}/${job.jobId}`
  ) {
    throw new Error('편성 작업의 조회 경로가 학기 또는 작업 ID와 일치하지 않습니다.')
  }
}

export function checkGenerationReceipt(termId: number, receipt: AcceptedGeneration) {
  if (
    receipt?.state !== 'QUEUED' ||
    !Number.isSafeInteger(receipt.expectedPublishRev) ||
    receipt.expectedPublishRev < 0
  ) {
    throw new Error('편성 작업 접수 응답을 확인할 수 없습니다.')
  }
  checkStatusUrl(termId, receipt)
}

export async function submitGeneration(
  termId: number,
  request: GenerationRequest,
  signal?: AbortSignal,
  http = client,
): Promise<AcceptedGeneration> {
  const { data, status } = await http.post<AcceptedGeneration>(generationsUrl(termId), request, {
    signal,
  })
  if (status !== 202) {
    throw new Error('편성 작업 접수 응답을 확인할 수 없습니다.')
  }
  checkGenerationReceipt(termId, data)
  return data
}

export async function getGenerationStatus(
  termId: number,
  accepted: AcceptedGeneration,
  signal?: AbortSignal,
  http = client,
): Promise<GenerationJob> {
  checkStatusUrl(termId, accepted)
  const { data, status } = await http.get<GenerationJob>(accepted.statusUrl, {
    signal,
  })
  if (
    status !== 200 ||
    data?.jobId !== accepted.jobId ||
    !Number.isSafeInteger(data.expectedPublishRev) ||
    data.expectedPublishRev < 0
  ) {
    throw new Error('편성 작업 조회 응답을 확인할 수 없습니다.')
  }
  switch (data.state) {
    case 'READY': {
      const candidates = data.result?.candidates
      if (
        data.result?.status !== 'READY' ||
        !Array.isArray(candidates) ||
        candidates.length < 1 ||
        candidates.length > 4 ||
        !candidates.every(
          (candidate) =>
            typeof candidate?.candidateId === 'string' && candidate.candidateId.length > 0,
        )
      ) {
        throw new Error('게시할 수 있는 편성 후보를 확인할 수 없습니다.')
      }
      break
    }
    case 'QUEUED':
    case 'RUNNING':
    case 'INFEASIBLE':
    case 'TIME_LIMIT_NO_SOLUTION':
    case 'FAILED':
      break
    default:
      throw new Error('알 수 없는 편성 작업 상태입니다.')
  }
  return data
}
