/**
 * 근무 가능 시간(Availability) 타입.
 */

/**
 * @typedef {Object} AvailabilityItemInput
 * @property {import('./common.js').DayOfWeek} dayOfWeek
 * @property {string} startTime "HH:mm:ss"
 * @property {string} endTime "HH:mm:ss"
 */

/**
 * 등록/수정 요청 (POST|PUT /api/me/availabilities).
 * @typedef {Object} WorkAvailabilityRequestDto
 * @property {AvailabilityItemInput[]} availabilities
 */

/**
 * @typedef {Object} WorkAvailabilityCreateResponseDto
 * @property {string} message
 * @property {number} userStoreId
 * @property {number} inserted
 */

/**
 * @typedef {Object} AvailabilityItem
 * @property {number} id
 * @property {import('./common.js').DayOfWeek} dayOfWeek
 * @property {string} startTime
 * @property {string} endTime
 */

/**
 * @typedef {Object} WorkAvailabilityGetResponseDto
 * @property {string} message
 * @property {number} userStoreId
 * @property {AvailabilityItem[]} availabilities
 */

/** @typedef {'INSERTED'|'UPDATED'|'DELETED'} AvailabilityStatus */

/**
 * @typedef {Object} WorkAvailabilityPatchResponseDto
 * @property {number} availabilityId
 * @property {AvailabilityStatus} status
 */

/**
 * 매장 전체 직원 가능시간 (GET /api/{storeId}/availabilities).
 * @typedef {Object} StaffAvailabilityItem
 * @property {import('./common.js').DayOfWeek} dayOfWeek
 * @property {string} startTime
 * @property {string} endTime
 */

/**
 * @typedef {Object} WorkAvailabilityAllResponseDto
 * @property {string} username
 * @property {StaffAvailabilityItem[]} availabilities
 */

export {}
