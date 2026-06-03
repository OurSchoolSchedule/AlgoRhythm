// 추가 근무(Extra Shift) API
import client from './client.js'

/**
 * 추가 인력 요청 생성 (POST /api/extra-shift/requests). OWNER.
 * @param {import('@/types/extraShift.js').ExtrashiftCreateDto} payload
 * @returns {Promise<import('@/types/extraShift.js').ExtrashiftRequestDetailDto>}
 */
export async function createExtraShiftRequest(payload) {
  const { data } = await client.post('/api/extra-shift/requests', payload)
  return data
}

/**
 * 알바 1차 응답 (PATCH /api/extra-shift/requests/{requestId}/respond).
 * @param {number} requestId
 * @param {import('@/types/extraShift.js').ExtrashiftRespondDto} payload
 * @returns {Promise<import('@/types/extraShift.js').ExtrashiftResponseDetailDto>}
 */
export async function respondExtraShift(requestId, payload) {
  const { data } = await client.patch(
    `/api/extra-shift/requests/${requestId}/respond`,
    payload,
  )
  return data
}

/**
 * 사장 최종 승인/거절 (PATCH /api/extra-shift/requests/{requestId}/manager-approval). OWNER.
 * @param {number} requestId
 * @param {import('@/types/extraShift.js').ExtrashiftManagerApprovalDto} payload
 * @returns {Promise<import('@/types/extraShift.js').ExtrashiftManagerApprovalDetailDto>}
 */
export async function approveExtraShift(requestId, payload) {
  const { data } = await client.patch(
    `/api/extra-shift/requests/${requestId}/manager-approval`,
    payload,
  )
  return data
}
