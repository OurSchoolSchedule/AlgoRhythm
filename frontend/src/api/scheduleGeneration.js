// 시간표 생성(Timetable Generation) API
import client from './client.js'

/**
 * 생성 요청 만들기 (POST /api/timetable-generation/requests). ADMIN.
 * @returns {Promise<import('@/types/scheduleGeneration.js').TimetableRequestResponse>}
 */
export async function createScheduleRequest() {
  const { data } = await client.post('/api/timetable-generation/requests')
  return data
}

/**
 * 불가 교시 미제출 교사 (GET /api/timetable-generation/teachers/without-availability).
 * 예전 제출 현황 API는 없다.
 * @returns {Promise<import('@/types/scheduleGeneration.js').TeachersWithoutAvailabilityResponse>}
 */
export async function getTeachersWithoutAvailability() {
  const { data } = await client.get(
    '/api/timetable-generation/teachers/without-availability',
  )
  return {
    allSubmitted: Boolean(data?.allSubmitted),
    unsubmittedUserIds: Array.isArray(data?.unsubmittedUserIds)
      ? data.unsubmittedUserIds
      : [],
  }
}

/** @deprecated getTeachersWithoutAvailability 를 쓴다. storeId는 무시한다. */
export async function getSubmissionStatus() {
  return getTeachersWithoutAvailability()
}

/**
 * AI 생성 (POST /api/timetable-generation/requests/{id}/generate).
 * 응답의 candidateTimetableKey로 후보를 조회한다.
 * @param {number} scheduleRequestId
 * @param {import('@/types/scheduleGeneration.js').TimetableGenerationRequestDto} payload
 * @returns {Promise<import('@/types/scheduleGeneration.js').TimetableGenerationResponse>}
 */
export async function generateSchedule(scheduleRequestId, payload) {
  const { data } = await client.post(
    `/api/timetable-generation/requests/${scheduleRequestId}/generate`,
    payload,
  )
  const candidateTimetableKey =
    data?.candidateTimetableKey ?? data?.candidateKey ?? null
  return { ...data, candidateTimetableKey }
}

/**
 * 후보 시간표 (GET /api/timetable-generation/candidates?key=).
 * @param {string} key candidateTimetableKey
 * @returns {Promise<import('@/types/scheduleGeneration.js').CandidateSchedule[]>}
 */
export async function getCandidateSchedules(key) {
  const { data } = await client.get('/api/timetable-generation/candidates', {
    params: { key },
  })
  return Array.isArray(data) ? data : []
}

/**
 * 후보 확정 (POST /api/timetable-generation/requests/{id}/confirm).
 * @param {number} scheduleRequestId
 * @param {import('@/types/scheduleGeneration.js').ConfirmTimetableRequestDto} payload
 */
export async function confirmSchedule(scheduleRequestId, payload) {
  const { data } = await client.post(
    `/api/timetable-generation/requests/${scheduleRequestId}/confirm`,
    payload,
  )
  return data
}
