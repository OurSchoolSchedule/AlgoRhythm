// 수업 교환(Timetable Swap) API
import client from './client.js'

/**
 * 내 교환 요청 목록 (GET /api/timetable-swap/requests/me).
 * @returns {Promise<import('@/types/shiftSwap.js').TimetableSwapResponseDto[]>}
 */
export async function getMySwapRequests() {
  const { data } = await client.get('/api/timetable-swap/requests/me')
  return Array.isArray(data) ? data : []
}

/**
 * 수업 교환 요청 생성 (POST /api/timetable-swap/requests).
 * @param {import('@/types/shiftSwap.js').CreateSwapRequestDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').TimetableSwapResponseDto>}
 */
export async function createShiftSwapRequest(payload) {
  const { data } = await client.post('/api/timetable-swap/requests', payload)
  return data
}

/**
 * 수신자 응답 (POST /api/timetable-swap/requests/{id}/respond).
 * @param {number} id TimetableSwapResponseDto.id
 * @param {import('@/types/shiftSwap.js').ShiftSwapRespondDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').TimetableSwapResponseDto>}
 */
export async function respondShiftSwap(id, payload) {
  const { data } = await client.post(
    `/api/timetable-swap/requests/${id}/respond`,
    payload,
  )
  return data
}

/**
 * 관리자 승인/거절 (POST /api/timetable-swap/requests/{id}/approve).
 * @param {number} id TimetableSwapResponseDto.id
 * @param {import('@/types/shiftSwap.js').ShiftSwapManagerApprovalDto} payload
 * @returns {Promise<import('@/types/shiftSwap.js').TimetableSwapResponseDto>}
 */
export async function approveShiftSwap(id, payload) {
  const { data } = await client.post(
    `/api/timetable-swap/requests/${id}/approve`,
    payload,
  )
  return data
}
