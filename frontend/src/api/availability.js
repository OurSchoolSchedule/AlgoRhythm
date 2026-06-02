// 근무 가능 시간(Availability) API
import client from './client.js'

/**
 * 내 근무 가능 시간 최초 등록 (POST /api/me/availabilities).
 * @param {import('@/types/availability.js').WorkAvailabilityRequestDto} payload
 * @returns {Promise<import('@/types/availability.js').WorkAvailabilityCreateResponseDto>}
 */
export async function createMyAvailability(payload) {
  const { data } = await client.post('/api/me/availabilities', payload)
  return data
}

/**
 * 내 근무 가능 시간 조회 (GET /api/me/availabilities).
 * @returns {Promise<import('@/types/availability.js').WorkAvailabilityGetResponseDto>}
 */
export async function getMyAvailability() {
  const { data } = await client.get('/api/me/availabilities')
  return data
}

/**
 * 내 근무 가능 시간 전체 교체 수정 (PUT /api/me/availabilities).
 * @param {import('@/types/availability.js').WorkAvailabilityRequestDto} payload
 * @returns {Promise<import('@/types/availability.js').WorkAvailabilityPatchResponseDto[]>}
 */
export async function replaceMyAvailability(payload) {
  const { data } = await client.put('/api/me/availabilities', payload)
  return data
}

/**
 * 매장 전체 직원 가능시간 조회 (GET /api/{storeId}/availabilities). OWNER 전용.
 * @param {number} storeId
 * @returns {Promise<import('@/types/availability.js').WorkAvailabilityAllResponseDto[]>}
 */
export async function getStoreAvailabilities(storeId) {
  const { data } = await client.get(`/api/${storeId}/availabilities`)
  return data
}
