// 대타(Shift Swap) API
import client from './client.js'

/**
 * 수업 교환 요청 생성 (POST /api/timetable-swap/requests).
 * @param {import('@/types/shiftSwap.js').ShiftSwapRequestCreateDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').ShiftSwapResponseDto>}
 */
export async function createShiftSwapRequest(payload) {
  const { data } = await client.post('/api/timetable-swap/requests', payload)
  return data
}

/**
 * 수신자 응답 (POST /api/timetable-swap/requests/{requestId}/respond).
 * @param {number} requestId
 * @param {import('@/types/shiftSwap.js').ShiftSwapRespondDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').ShiftSwapResponseDto>}
 */
export async function respondShiftSwap(requestId, payload) {
  const { data } = await client.post(
    `/api/timetable-swap/requests/${requestId}/respond`,
    payload,
  )
  return data
}

/**
 * 관리자 승인/거절 (POST /api/timetable-swap/requests/{requestId}/approve).
 * @param {number} requestId
 * @param {import('@/types/shiftSwap.js').ShiftSwapManagerApprovalDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').ShiftSwapResponseDto>}
 */
export async function approveShiftSwap(requestId, payload) {
  const { data } = await client.post(
    `/api/timetable-swap/requests/${requestId}/approve`,
    payload,
  )
  return data
}
