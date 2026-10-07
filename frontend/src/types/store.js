/**
 * 학교 구성원 요약 타입.
 * API는 schoolUserId / schoolName 기준. 화면 호환용 별칭을 함께 둔다.
 */

/**
 * @typedef {Object} SchoolStaffResponse
 * @property {number} schoolUserId
 * @property {string} username
 */

/** @typedef {SchoolStaffResponse & { userStoreId: number }} StoreStaffResponse */

/**
 * @typedef {Object} StaffSummaryDto
 * @property {number} schoolUserId
 * @property {number} [userStoreId] schoolUserId 별칭
 * @property {number} [userId]
 * @property {string} username
 * @property {string} [profileImageUrl]
 * @property {string} role
 * @property {import('./common.js').EmploymentStatus} employmentStatus
 * @property {string} [email]
 * @property {{ subjectId: number, subjectName: string }[]} [subjects]
 * @property {{ classId: number, academicYear: number, grade: number, classNumber: number }[]} [homeroomClasses]
 * @property {number|null} [weeklyLessonCount]
 */

/**
 * @typedef {Object} AllStaffSummaryResponseDto
 * @property {string} schoolName
 * @property {string} [storeName] schoolName 별칭
 * @property {number} totalStaffCount
 * @property {StaffSummaryDto[]} staffList
 */

export {}
