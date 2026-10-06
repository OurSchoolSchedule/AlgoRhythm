/**
 * 과목·학급 타입.
 */

/**
 * @typedef {Object} SubjectRequest
 * @property {string} name
 */

/**
 * @typedef {Object} SubjectResponse
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} SchoolClassRequest
 * @property {number} academicYear
 * @property {number} grade
 * @property {number} classNumber
 * @property {number|null} [homeroomTeacherSchoolUserId]
 */

/**
 * @typedef {Object} SchoolClassResponse
 * @property {number} id
 * @property {number} academicYear
 * @property {number} grade
 * @property {number} classNumber
 * @property {number|null} homeroomTeacherSchoolUserId
 * @property {string|null} homeroomTeacherName
 */

export {}
