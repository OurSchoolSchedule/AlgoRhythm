/**
 * 매장(Store) 타입.
 */

/**
 * @typedef {Object} StoreStaffResponse
 * @property {number} userStoreId
 * @property {string} username
 */

/**
 * @typedef {Object} StaffSummaryDto
 * @property {number} userStoreId
 * @property {string} username
 * @property {string} profileImageUrl
 * @property {string} role
 * @property {import('./common.js').EmploymentStatus} employmentStatus
 * @property {number} monthlyPay 이번 달 총 급여
 * @property {string} email
 * @property {string} [tel]
 * @property {string} bankName
 * @property {string} accountNumber
 * @property {number} lateCount
 * @property {number} absenceCount
 * @property {number} totalShiftCount
 */

/**
 * @typedef {Object} AllStaffSummaryResponseDto
 * @property {number} storeId
 * @property {string} storeName
 * @property {number} year
 * @property {number} month
 * @property {number} totalStaffCount
 * @property {StaffSummaryDto[]} staffList
 */

export {}
