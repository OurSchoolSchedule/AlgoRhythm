/**
 * 출퇴근(Attendance) 타입.
 */

/** @typedef {string} AttendanceStatus 백엔드 AttendanceStatus enum 문자열 */

/**
 * @typedef {Object} AttendanceTodayResponse
 * @property {string} workDate "YYYY-MM-DD"
 * @property {AttendanceStatus} status
 * @property {boolean} isCheckedIn
 * @property {boolean} isCheckedOut
 * @property {string|null} checkInTime
 * @property {string|null} checkOutTime
 * @property {string|null} workStartTime
 * @property {string|null} workEndTime
 */

/**
 * @typedef {Object} AttendanceCheckInResponse
 * @property {string} message
 * @property {string} workDate
 * @property {AttendanceStatus} status
 * @property {string} checkInTime
 * @property {string} workStartTime
 * @property {string} workEndTime
 */

/**
 * @typedef {Object} AttendanceCheckOutResponse
 * @property {string} message
 * @property {string} workDate
 * @property {AttendanceStatus} status
 * @property {string} checkOutTime
 * @property {string} workStartTime
 * @property {string} workEndTime
 */

export {}
