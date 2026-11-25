import client from './client.js'
import type { PublicationRequest, PublicationReceipt } from '@/types/publication'

export async function publishCandidate(
  termId: number,
  { jobId, candidateId, effectiveFrom, expectedPublishRev }: PublicationRequest,
  signal?: AbortSignal,
): Promise<PublicationReceipt> {
  const { data, status } = await client.post<PublicationReceipt>(
    `/api/v2/terms/${termId}/publications`,
    { jobId, candidateId, effectiveFrom, expectedPublishRev },
    { signal },
  )
  if (
    status !== 201 ||
    !Number.isSafeInteger(data?.versionId) ||
    data.versionId <= 0 ||
    !Number.isSafeInteger(data.publishRev) ||
    data.publishRev < 0 ||
    !Number.isSafeInteger(data.weeklyLessons) ||
    data.weeklyLessons < 0
  ) {
    throw new Error('시간표 게시 영수증을 확인할 수 없습니다.')
  }
  return data
}
