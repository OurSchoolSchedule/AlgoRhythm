/**
 * 마이페이지(MyPage) 타입.
 */

/**
 * @typedef {Object} ActiveStoreResponse
 * @property {number} storeId
 * @property {string} storeCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} businessRegistrationNumber
 * @property {import('./common.js').Position} position
 * @property {import('./common.js').EmploymentStatus} employmentStatus
 */

/**
 * @typedef {Object} OwnerProfileResponse
 * @property {number} userId
 * @property {string} username
 * @property {string} email
 * @property {string} profileImageUrl
 * @property {string} position
 * @property {string} employmentStatus
 * @property {string} businessRegistrationNumber
 */

/**
 * @typedef {Object} OwnerProfileUpdateRequest
 * @property {string} [username]
 * @property {string} [email]
 * @property {string} [businessRegistrationNumber]
 */

/**
 * @typedef {Object} StaffCurrentStore
 * @property {number} storeId
 * @property {string} name
 * @property {string} storeCode
 */

/**
 * @typedef {Object} StaffBankAccount
 * @property {number} bankId
 * @property {string} bankName
 * @property {string} accountNumber
 */

/**
 * @typedef {Object} StaffProfileResponse
 * @property {number} userId
 * @property {string} username
 * @property {string} email
 * @property {string} profileImageUrl
 * @property {string} position
 * @property {string} employmentStatus
 * @property {StaffCurrentStore} currentStore
 * @property {StaffBankAccount} bankAccount
 */

/**
 * @typedef {Object} StaffProfileUpdateRequest
 * @property {string} [username]
 * @property {string} [email]
 * @property {number} [bankId]
 * @property {string} [accountNumber]
 */

/**
 * @typedef {Object} OwnerStoreResponse
 * @property {number} storeId
 * @property {string} storeCode
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
 * @property {number} storeId
 * @property {string} storeCode
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} businessRegistrationNumber
 * @property {import('./common.js').Position} [position]
 * @property {import('./common.js').EmploymentStatus} [employmentStatus]
 * @property {string} [hireDate]
 */

/**
 * @typedef {Object} OwnerCreateStoreRequest
 * @property {string} name
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} businessRegistrationNumber
 * @property {string} [hireDate]
 */

/**
 * @typedef {Object} StaffJoinStoreRequest
 * @property {string} storeCode
 * @property {string} [hireDate]
 */

export {}
