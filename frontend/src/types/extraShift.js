/**
 * 추가 근무(Extra Shift) 타입.
 */

/**
 * 추가 인력 요청 생성 (POST /api/extra-shift/requests).
 * @typedef {Object} ExtrashiftCreateDto
 * @property {number} shiftId 기존 work_shift id (요청 시간대)
 * @property {number} headcount 필요 인원 수
 * @property {string} [note]
 */

/**
 * 알바 1차 응답 (PATCH /api/extra-shift/requests/{id}/respond).
 * @typedef {Object} ExtrashiftRespondDto
 * @property {'accept'|'reject'} action
 */

/**
 * 사장 최종 승인 (PATCH /api/extra-shift/requests/{id}/manager-approval).
 * @typedef {Object} ExtrashiftManagerApprovalDto
 * @property {number} responseId 승인/거절 대상 알바 응답 id
 * @property {'approve'|'reject'} action
 */

/**
 * @typedef {Object} ExtrashiftRequestDetailDto
 * @property {number} requestId
 * @property {number} storeId
 * @property {number} ownerUserId
 * @property {number} baseShiftId
 * @property {string} start
 * @property {string} end
 * @property {number} headcountRequested
 * @property {number} headcountFilled
 * @property {string} status
 * @property {string} note
 * @property {number[]} receiverUserIds
 */

/**
 * @typedef {Object} ExtrashiftResponseDetailDto
 * @property {number} requestId
 * @property {number} responseId
 * @property {number} storeId
 * @property {number} ownerUserId
 * @property {number} candidateUserId
 * @property {string} start
 * @property {string} end
 * @property {number} headcountRequested
 * @property {number} headcountFilled
 * @property {string} requestStatus
 * @property {string} workerAction
 * @property {string} managerApproval
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ExtrashiftManagerApprovalDetailDto
 * @property {number} requestId
 * @property {number} responseId
 * @property {number} storeId
 * @property {number} ownerUserId
 * @property {number} candidateUserId
 * @property {string} start
 * @property {string} end
 * @property {number} headcountRequested
 * @property {number} headcountFilled
 * @property {string} requestStatus
 * @property {string} workerAction
 * @property {string} managerApproval
 * @property {boolean} shiftAssigned
 */

export {}
