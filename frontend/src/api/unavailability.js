import client from './client.js'

/**
 * @typedef {Object} TeacherAvailabilityResponseDto
 * @property {number} id
 * @property {number} [schoolUserId]
 * @property {string} dayOfWeek
 * @property {number} periodNumber
 * @property {string} [reason]
 */

/** @returns {Promise<TeacherAvailabilityResponseDto[]>} */
export async function getMyUnavailabilities() {
  const { data } = await client.get('/api/me/unavailabilities')
  if (!Array.isArray(data)) {
    throw new Error('근무 불가 응답 형식이 아닙니다.')
  }
  return data
}

/**
 * 학교 전체 불가 교시 (GET /api/school/unavailabilities). ADMIN.
 * @returns {Promise<TeacherAvailabilityResponseDto[]>}
 */
export async function getSchoolUnavailabilities() {
  const { data } = await client.get('/api/school/unavailabilities')
  if (!Array.isArray(data)) {
    throw new Error('학교 근무 불가 응답 형식이 아닙니다.')
  }
  return data
}

/**
 * @param {{ dayOfWeek: string, periodNumber: number }[]} unavailabilities
 */
export async function createMyUnavailabilities(unavailabilities) {
  const { data } = await client.post('/api/me/unavailabilities', { unavailabilities })
  return data
}

/**
 * @param {{ dayOfWeek: string, periodNumber: number }[]} unavailabilities
 */
export async function replaceMyUnavailabilities(unavailabilities) {
  const { data } = await client.put('/api/me/unavailabilities', { unavailabilities })
  return data
}

/**
 * 불가 교시 단건 삭제 (DELETE /api/me/unavailabilities/{availabilityId}).
 * @param {number} availabilityId
 */
export async function deleteMyUnavailability(availabilityId) {
  await client.delete(`/api/me/unavailabilities/${availabilityId}`)
}
