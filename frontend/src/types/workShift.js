/**
 * 근무표(Work Shift) 타입.
 */

/**
 * 시프트 생성 요청 (POST /api/schedules/workshifts).
 * @typedef {Object} WorkShiftCreateDto
 * @property {number} userStoreId
 * @property {string} startDatetime "YYYY-MM-DDTHH:mm:ss"
 * @property {string} endDatetime "YYYY-MM-DDTHH:mm:ss"
 */

/**
 * 시프트 수정 요청 (PATCH /api/schedules/workshifts/{shiftId}).
 * @typedef {Object} WorkShiftUpdateDto
 * @property {string} startDatetime
 * @property {string} endDatetime
 */

/**
 * @typedef {Object} WorkShiftDto
 * @property {number} id
 * @property {number} userStoreId
 * @property {number} userId
 * @property {string} username
 * @property {string} startDatetime
 * @property {string} endDatetime
 * @property {string} shiftStatus
 */

/**
 * 내 주간 근무표 항목 (GET /api/schedules/me/week).
 * @typedef {Object} MyWorkShiftDto
 * @property {number} id
 * @property {number} storeId
 * @property {string} storeName
 * @property {string} startDatetime
 * @property {string} endDatetime
 * @property {string} shiftStatus
 */

/**
 * 전체 시프트 조회 응답 (GET /api/schedules).
 * @typedef {Object} WorkShiftListResponse
 * @property {WorkShiftDto[]} work_shifts
 */

export {}
