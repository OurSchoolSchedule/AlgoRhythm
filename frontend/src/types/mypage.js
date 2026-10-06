/**
 * 마이페이지(MyPage) 타입. swagger 학교 필드 기준.
 */

/**
 * 활성 학교 (GET /api/mypage/active-school).
 * @typedef {Object} ActiveStoreResponse
 * @property {number} schoolId
 * @property {string} schoolCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {import('./common.js').Position} position
 * @property {import('./common.js').EmploymentStatus} employmentStatus
 */

/**
 * @typedef {Object} OwnerProfileResponse
 * @property {number} userId
 * @property {string} username
 * @property {string} email
 * @property {string} [profileImageUrl]
 * @property {string} position
 * @property {string} employmentStatus
 */

/**
 * @typedef {Object} OwnerProfileUpdateRequest
 * @property {string} [username]
 * @property {string} [email]
 */

/**
 * @typedef {Object} StaffCurrentSchool
 * @property {number} schoolId
 * @property {string} name
 * @property {string} schoolCode
 */

/**
 * @typedef {Object} StaffProfileResponse
 * @property {number} userId
 * @property {string} username
 * @property {string} email
 * @property {string} [profileImageUrl]
 * @property {string} position
 * @property {string} employmentStatus
 * @property {StaffCurrentSchool} [currentSchool]
 */

/**
 * @typedef {Object} StaffProfileUpdateRequest
 * @property {string} [username]
 * @property {string} [email]
 */

/**
 * @typedef {Object} OwnerStoreResponse
 * @property {number} schoolId
 * @property {string} schoolCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 */

/**
 * @typedef {Object} OwnerStoreUpdateRequest
 * @property {string} [name]
 * @property {string} [address]
 * @property {string} [phoneNumber]
 */

/**
 * @typedef {Object} StoreSimpleResponse
 * @property {number} schoolId
 * @property {string} schoolCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {import('./common.js').Position} [position]
 * @property {import('./common.js').EmploymentStatus} [employmentStatus]
 * @property {string} [hireDate]
 */

/**
 * @typedef {Object} OwnerCreateStoreRequest
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} [hireDate]
 */

/**
 * @typedef {Object} StaffJoinStoreRequest
 * @property {string} schoolCode
 * @property {string} [hireDate]
 */

export {}
