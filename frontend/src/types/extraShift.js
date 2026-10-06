/**
 * 보결(Substitute) 타입.
 */

/**
 * 보결 요청 생성 (POST /api/substitutes/requests).
 * @typedef {Object} SubstituteCreateRequest
 * @property {number} timetableId
 * @property {string} substituteDate "YYYY-MM-DD"
 * @property {string} [note]
 */

/**
 * 교사 응답 (PATCH /api/substitutes/requests/{id}/response).
 * @typedef {Object} SubstituteRespondRequest
 * @property {'ACCEPT'|'REJECT'} action
 */

/**
 * 관리자 승인 (PATCH /api/substitutes/responses/{responseId}/approval).
 * @typedef {Object} SubstituteApprovalRequest
 * @property {'APPROVE'|'REJECT'} action
 */

/**
 * @typedef {Object} SubstituteRequestDetail
 * @property {number} id
 * @property {number} schoolId
 * @property {number} timetableId
 * @property {string} dayOfWeek
 * @property {number} periodNumber
 * @property {string} substituteDate
 * @property {string} status OPEN | FILLED | CANCELLED | EXPIRED
 * @property {string} note
 * @property {string} createdAt
 */

/**
 * @typedef {Object} SubstituteResponseDetail
 * @property {number} requestId
 * @property {number} responseId
 * @property {number} candidateSchoolUserId
 * @property {string} teacherName
 * @property {string} teacherAction
 * @property {string} managerApproval
 * @property {string} createdAt
 */

/**
 * @typedef {Object} SubstituteApprovalDetail
 * @property {number} requestId
 * @property {number} responseId
 * @property {string} requestStatus
 * @property {string} teacherAction
 * @property {string} managerApproval
 */

export {}
