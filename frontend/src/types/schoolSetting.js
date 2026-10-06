/**
 * 학교 교시 설정 (GET/POST /api/school-setting).
 * @typedef {Object} SchoolSettingRequest
 * @property {number} periodDuration
 * @property {number} breakDuration
 * @property {string} lunchStartTime
 * @property {string} lunchEndTime
 */

/**
 * @typedef {Object} PeriodSettingResponse
 * @property {number} id
 * @property {number} periodNumber
 * @property {string} startTime
 * @property {string} endTime
 */

/**
 * @typedef {SchoolSettingRequest & { id: number, periods: PeriodSettingResponse[] }} SchoolSettingResponse
 */

/**
 * @typedef {Object} PeriodSettingRequest
 * @property {number} periodNumber
 * @property {string} startTime
 * @property {string} endTime
 */

export {}
