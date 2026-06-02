// 대타(Shift Swap) API
import client from './client.js'

/**
 * 대타 요청 생성 (POST /api/shift-swap/requests).
 * @param {import('@/types/shiftSwap.js').ShiftSwapRequestCreateDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').ShiftSwapResponseDto[]>}
 */
export async function createShiftSwapRequest(payload) {
  const { data } = await client.post('/api/shift-swap/requests', payload)
  return data
}

/**
 * 수신자 1차 응답 (PATCH /api/shift-swap/requests/{requestId}/respond).
 * @param {number} requestId
 * @param {import('@/types/shiftSwap.js').ShiftSwapRespondDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').ShiftSwapResponseDto>}
 */
export async function respondShiftSwap(requestId, payload) {
  const { data } = await client.patch(
    `/api/shift-swap/requests/${requestId}/respond`,
    payload,
  )
  return data
}

/**
 * 사장 최종 승인/거절 (PATCH /api/shift-swap/requests/{requestId}/manager-approval).
 * @param {number} requestId
 * @param {import('@/types/shiftSwap.js').ShiftSwapManagerApprovalDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').ShiftSwapResponseDto>}
 */
export async function approveShiftSwap(requestId, payload) {
  const { data } = await client.patch(
    `/api/shift-swap/requests/${requestId}/manager-approval`,
    payload,
  )
  return data
}
