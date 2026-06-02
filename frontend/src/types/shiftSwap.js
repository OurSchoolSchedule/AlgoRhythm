/**
 * 대타(Shift Swap) 타입.
 */

/**
 * 대타 요청 생성 (POST /api/shift-swap/requests).
 * @typedef {Object} ShiftSwapRequestCreateDto
 * @property {number} shiftId
 * @property {string} reason
 */

/**
 * 수신자 1차 응답 (PATCH /api/shift-swap/requests/{id}/respond).
 * @typedef {Object} ShiftSwapRespondDto
 * @property {'ACCEPT'|'REJECT'} action
 */

/**
 * 사장 최종 승인 (PATCH /api/shift-swap/requests/{id}/manager-approval).
 * @typedef {Object} ShiftSwapManagerApprovalDto
 * @property {'APPROVE'|'REJECT'} action
 */

/**
 * @typedef {Object} ShiftSwapResponseDto
 * @property {number} requestId
 * @property {number} shiftId
 * @property {number} requesterId
 * @property {number} receiverId
 * @property {string} reason
 * @property {string} status
 * @property {string} managerApprovalStatus
 * @property {string} createdAt
 */

export {}
