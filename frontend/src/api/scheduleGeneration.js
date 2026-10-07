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
 * swagger 응답은 additionalProperties:{} 뿐이라 필드를 강제하지 않는다.
 * 런타임에 allSubmitted / unsubmittedUserIds 가 오면 그대로 쓰고, 없으면 null.
 * @returns {Promise<import('@/types/scheduleGeneration.js').TeachersWithoutAvailabilityResponse>}
 */
export async function getTeachersWithoutAvailability() {
  const { data } = await client.get(
    '/api/timetable-generation/teachers/without-availability',
  )
  const unsubmittedUserIds = Array.isArray(data?.unsubmittedUserIds)
    ? data.unsubmittedUserIds.map(Number).filter((id) => Number.isFinite(id))
    : null
  const allSubmitted = typeof data?.allSubmitted === 'boolean'
    ? data.allSubmitted
    : null
  return { allSubmitted, unsubmittedUserIds }
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
