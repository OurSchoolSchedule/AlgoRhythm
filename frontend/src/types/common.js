/**
 * 공통 타입 정의.
 * 백엔드 GlobalExceptionHandler 공통 에러 포맷 및 도메인 전역 enum 모음.
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {boolean} [success]
 * @property {string} [error] 에러 분류 코드
 * @property {string} [message] 사용자 표시용 메시지
 */

/** @typedef {'OWNER'|'STAFF'} Position */
/** @typedef {'HIRED'|'ON_LEAVE'|'RESIGNED'} EmploymentStatus */
/** @typedef {'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN'} DayOfWeek */

export {}
