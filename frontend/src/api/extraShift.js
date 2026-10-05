// 보결(Substitute) API. 함수 이름은 기존 훅과 맞춘다.
import client from './client.js'

/**
 * 보결 요청 생성 (POST /api/substitutes/requests). ADMIN.
 * @param {import('@/types/extraShift.js').SubstituteCreateRequest} payload
 * @returns {Promise<import('@/types/extraShift.js').SubstituteRequestDetail>}
 */
export async function createExtraShiftRequest(payload) {
  const { data } = await client.post('/api/substitutes/requests', payload)
  return data
}

/**
 * 보결 요청 목록 (GET /api/substitutes/requests?status=).
 * @param {'OPEN'|'FILLED'|'CANCELLED'|'EXPIRED'} [status]
 * @returns {Promise<import('@/types/extraShift.js').SubstituteRequestDetail[]>}
 */
export async function getSubstituteRequests(status) {
  const { data } = await client.get('/api/substitutes/requests', {
    params: status ? { status } : undefined,
  })
  return Array.isArray(data) ? data : []
}

/**
 * 교사 응답 (PATCH /api/substitutes/requests/{requestId}/response).
 * action: ACCEPT | REJECT
 * @param {number} requestId
 * @param {import('@/types/extraShift.js').SubstituteRespondRequest} payload
 * @returns {Promise<import('@/types/extraShift.js').SubstituteResponseDetail>}
 */
export async function respondExtraShift(requestId, payload) {
  const { data } = await client.patch(
    `/api/substitutes/requests/${requestId}/response`,
    { action: payload.action },
  )
  return data
}

/**
 * 관리자 승인/거절 (PATCH /api/substitutes/responses/{responseId}/approval).
 * action: APPROVE | REJECT. requestId가 아닌 알림의 substituteResponseId를 쓴다.
 * @param {number} responseId
 * @param {import('@/types/extraShift.js').SubstituteApprovalRequest} payload
 * @returns {Promise<import('@/types/extraShift.js').SubstituteApprovalDetail>}
 */
export async function approveExtraShift(responseId, payload) {
  const { data } = await client.patch(
    `/api/substitutes/responses/${responseId}/approval`,
    { action: payload.action },
  )
  return data
}
