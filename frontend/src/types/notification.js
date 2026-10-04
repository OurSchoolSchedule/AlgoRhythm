/**
 * 알림(Notification) 타입.
 */

/**
 * @typedef {Object} NotificationResponseDto
 * @property {number} [id]
 * @property {string} schoolName
 * @property {string} storeName schoolName과 동일. 기존 화면 호환
 * @property {string|null} targetType
 * @property {number|null} targetId
 * @property {string} profileImageUrl
 * @property {string} category SCHEDULE_INPUT | TIMETABLE_SWAP | SUBSTITUTE
 * @property {string} type
 * @property {string} message
 * @property {string} createdAt
 * @property {number|null} timetableSwapRequestId
 * @property {number|null} substituteRequestId
 * @property {string|null} timetableSwapStatus
 * @property {string|null} timetableSwapManagerApprovalStatus
 * @property {string|null} substituteStatus
 * @property {boolean} isRead
 */

export {}
