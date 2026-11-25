// 마이페이지(MyPage) API
import client from './client.js'

// ===== 활성 학교 =====

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('@/types/mypage.js').ActiveSchoolResponse>}
 */
export async function getActiveStore(options = {}) {
  const { data } = await client.get('/api/mypage/active-school', { signal: options.signal })
  return data
}

/**
 * 활성 학교 전환.
 * @param {number} schoolId
 * @returns {Promise<import('@/types/mypage.js').ActiveSchoolResponse>}
 */
export async function updateActiveStore(schoolId) {
  const { data } = await client.patch(`/api/mypage/active-school/${schoolId}`)
  return data
}

// ===== 관리자 =====

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('@/types/mypage.js').OwnerProfileResponse>}
 */
export async function getOwnerProfile(options = {}) {
  const { data } = await client.get('/api/mypage/admin/profile', { signal: options.signal })
  return data
}

/**
 * @param {import('@/types/mypage.js').OwnerProfileUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').OwnerProfileResponse>}
 */
export async function updateOwnerProfile(payload) {
  const { data } = await client.put('/api/mypage/admin/profile', payload)
  return data
}

/** @returns {Promise<import('@/types/mypage.js').AdminSchoolResponse>} */
export async function getOwnerStore() {
  const { data } = await client.get('/api/mypage/admin/school')
  return data
}

/**
 * @param {import('@/types/mypage.js').AdminSchoolUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').AdminSchoolResponse>}
 */
export async function updateOwnerStore(payload) {
  const { data } = await client.put('/api/mypage/admin/school', payload)
  return data
}

/** @returns {Promise<import('@/types/mypage.js').SchoolSimpleResponse[]>} */
export async function getOwnerStores() {
  const { data } = await client.get('/api/mypage/admin/schools')
  return data
}

/**
 * @param {import('@/types/mypage.js').AdminCreateSchoolRequest} payload
 * @returns {Promise<import('@/types/mypage.js').SchoolSimpleResponse>}
 */
export async function createOwnerStore(payload) {
  const { data } = await client.post('/api/mypage/admin/schools', payload)
  return data
}

/** @param {number} schoolId */
export async function deleteOwnerStore(schoolId) {
  await client.delete(`/api/mypage/admin/schools/${schoolId}`)
}

// ===== 교사 =====

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('@/types/mypage.js').StaffProfileResponse>}
 */
export async function getStaffProfile(options = {}) {
  const { data } = await client.get('/api/mypage/teacher/profile', { signal: options.signal })
  return data
}

/**
 * @param {import('@/types/mypage.js').StaffProfileUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').StaffProfileResponse>}
 */
export async function updateStaffProfile(payload) {
  const { data } = await client.put('/api/mypage/teacher/profile', payload)
  return data
}

/** @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('@/types/mypage.js').SchoolSimpleResponse[]>} */
export async function getStaffStores({ signal } = {}) {
  const { data } = await client.get('/api/mypage/teacher/schools', { signal })
  return data
}

/**
 * 학교 가입.
 * @param {import('@/types/mypage.js').TeacherJoinSchoolRequest} payload
 * @returns {Promise<import('@/types/mypage.js').SchoolSimpleResponse>}
 */
export async function joinStaffStore(payload) {
  const { data } = await client.post('/api/mypage/teacher/schools', payload)
  return data
}

/** @param {number} schoolId */
export async function leaveStaffStore(schoolId) {
  await client.delete(`/api/mypage/teacher/schools/${schoolId}`)
}
