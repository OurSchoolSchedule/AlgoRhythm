/**
 * 수업 교환(Timetable Swap) 타입.
 */

/**
 * 수업 교환 요청 생성 (POST /api/timetable-swap/requests).
 * @typedef {Object} ShiftSwapRequestCreateDto
 * @property {number} requesterTimetableId
 * @property {string} requesterDate "YYYY-MM-DD"
 * @property {number} receiverTimetableId
 * @property {string} receiverDate "YYYY-MM-DD"
 * @property {string} reason
 */

/**
 * 수신자 응답 (POST /api/timetable-swap/requests/{id}/respond).
 * @typedef {Object} ShiftSwapRespondDto
 * @property {'ACCEPT'|'REJECT'} action
 */

/**
 * 관리자 승인 (POST /api/timetable-swap/requests/{id}/approve).
 * @typedef {Object} ShiftSwapManagerApprovalDto
 * @property {'APPROVE'|'REJECT'} action
 */

/**
 * @typedef {Object} TimetableSwapResponseDto
 * @property {number} id
 * @property {number} [schoolId]
 * @property {number} requesterTimetableId
 * @property {string} requesterDate
 * @property {number} [requesterSchoolUserId]
 * @property {string} [requesterUsername]
 * @property {number} receiverTimetableId
 * @property {string} receiverDate
 * @property {number} [receiverSchoolUserId]
 * @property {string} [receiverUsername]
 * @property {string} reason
 * @property {string} status
 * @property {string} managerApprovalStatus
 * @property {string} createdAt
 */

export {}
