// 스케줄 생성(Schedule Generation) API
import client from './client.js'

/**
 * 스케줄 요청 생성 (POST /api/schedules/requests).
 * @param {import('@/types/scheduleGeneration.js').ScheduleRequestDto} payload
 * @returns {Promise<import('@/types/scheduleGeneration.js').ScheduleRequestResponseDto>}
 */
export async function createScheduleRequest(payload) {
  const { data } = await client.post('/api/schedules/requests', payload)
  return data
}

/**
 * 제출 현황 조회 (GET /api/schedules/requests/{storeId}/submission-status).
 * @param {number} storeId
 * @returns {Promise<import('@/types/scheduleGeneration.js').SubmissionStatusResponse>}
 */
export async function getSubmissionStatus(storeId) {
  const { data } = await client.get(
    `/api/schedules/requests/${storeId}/submission-status`,
  )
  return data
}

/**
 * 후보안 생성 (POST /api/schedules/requests/{scheduleRequestId}/generate).
 * @param {number} scheduleRequestId
 * @param {import('@/types/scheduleGeneration.js').ScheduleGenerationRequestDto} payload
 * @returns {Promise<import('@/types/scheduleGeneration.js').ScheduleGenerationResponseDto>}
 */
export async function generateSchedule(scheduleRequestId, payload) {
  const { data } = await client.post(
    `/api/schedules/requests/${scheduleRequestId}/generate`,
    payload,
  )
  return data
}

/**
 * 후보안 조회 (GET /api/schedules/candidates?key=).
 * @param {string} key Redis candidateScheduleKey
 * @returns {Promise<import('@/types/scheduleGeneration.js').CandidateSchedule[]>}
 */
export async function getCandidateSchedules(key) {
  const { data } = await client.get('/api/schedules/candidates', {
    params: { key },
  })
  return data
}

/**
 * 후보안 확정 (POST /api/schedules/requests/{scheduleRequestId}/confirm).
 * @param {number} scheduleRequestId
 * @param {import('@/types/scheduleGeneration.js').ConfirmScheduleRequestDto} payload
 * @returns {Promise<import('@/types/scheduleGeneration.js').ConfirmScheduleResponse>}
 */
export async function confirmSchedule(scheduleRequestId, payload) {
  const { data } = await client.post(
    `/api/schedules/requests/${scheduleRequestId}/confirm`,
    payload,
  )
  return data
}
