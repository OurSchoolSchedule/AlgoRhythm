/**
 * 마이페이지(MyPage) 타입. swagger 학교 필드 기준.
 */

/**
 * 활성 학교 (GET /api/mypage/active-school).
 * @typedef {Object} ActiveSchoolResponse
 * @property {number} schoolId
 * @property {string} schoolCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {import('./common.js').Position} position
 * @property {import('./common.js').EmploymentStatus} employmentStatus
 */

/** @typedef {ActiveSchoolResponse} ActiveStoreResponse */

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
 * 관리자 학교 조회 (GET /api/mypage/admin/school).
 * @typedef {Object} AdminSchoolResponse
 * @property {number} schoolId
 * @property {string} schoolCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 */

/** @typedef {AdminSchoolResponse} OwnerStoreResponse */

/**
 * @typedef {Object} AdminSchoolUpdateRequest
 * @property {string} [name]
 * @property {string} [address]
 * @property {string} [phoneNumber]
 */

/** @typedef {AdminSchoolUpdateRequest} OwnerStoreUpdateRequest */

/**
 * @typedef {Object} SchoolSimpleResponse
 * @property {number} schoolId
 * @property {string} schoolCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {import('./common.js').Position} [position]
 * @property {import('./common.js').EmploymentStatus} [employmentStatus]
 * @property {string} [hireDate]
 */

/** @typedef {SchoolSimpleResponse} StoreSimpleResponse */

/**
 * 관리자 학교 생성 (POST /api/mypage/admin/schools).
 * @typedef {Object} AdminCreateSchoolRequest
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} [hireDate]
 */

/** @typedef {AdminCreateSchoolRequest} OwnerCreateStoreRequest */

/**
 * 교사 학교 가입 (POST /api/mypage/teacher/schools/join).
 * @typedef {Object} TeacherJoinSchoolRequest
 * @property {string} schoolCode
 * @property {string} [hireDate]
 */

/** @typedef {TeacherJoinSchoolRequest} StaffJoinStoreRequest */

export {}
