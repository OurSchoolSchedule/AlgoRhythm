// 마이페이지(MyPage) API
import client from './client.js'

// ===== 활성 매장 =====

/** @returns {Promise<import('@/types/mypage.js').ActiveStoreResponse>} */
export async function getActiveStore() {
  const { data } = await client.get('/api/mypage/active-school')
  return data
}

/**
 * 활성 매장 전환.
 * @param {number} schoolId
 * @returns {Promise<import('@/types/mypage.js').ActiveStoreResponse>}
 */
export async function updateActiveStore(schoolId) {
  const { data } = await client.patch(`/api/mypage/active-school/${schoolId}`)
  return data
}

// ===== 사장(Owner) =====

/** @returns {Promise<import('@/types/mypage.js').OwnerProfileResponse>} */
export async function getOwnerProfile() {
  const { data } = await client.get('/api/mypage/admin/profile')
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

/** @returns {Promise<import('@/types/mypage.js').OwnerStoreResponse>} */
export async function getOwnerStore() {
  const { data } = await client.get('/api/mypage/admin/school')
  return data
}

/**
 * @param {import('@/types/mypage.js').OwnerStoreUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').OwnerStoreResponse>}
 */
export async function updateOwnerStore(payload) {
  const { data } = await client.put('/api/mypage/admin/school', payload)
  return data
}

/** @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse[]>} */
export async function getOwnerStores() {
  const { data } = await client.get('/api/mypage/admin/schools')
  return data
}

/**
 * @param {import('@/types/mypage.js').OwnerCreateStoreRequest} payload
 * @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse>}
 */
export async function createOwnerStore(payload) {
  const { data } = await client.post('/api/mypage/admin/schools', payload)
  return data
}

/** @param {number} schoolId */
export async function deleteOwnerStore(schoolId) {
  await client.delete(`/api/mypage/admin/schools/${schoolId}`)
}

// ===== 알바(Staff) =====

/** @returns {Promise<import('@/types/mypage.js').StaffProfileResponse>} */
export async function getStaffProfile() {
  const { data } = await client.get('/api/mypage/teacher/profile')
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

/** @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse[]>} */
export async function getStaffStores() {
  const { data } = await client.get('/api/mypage/teacher/schools')
  return data
}

/**
 * 매장 참여(가입).
 * @param {import('@/types/mypage.js').StaffJoinStoreRequest} payload
 * @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse>}
 */
export async function joinStaffStore(payload) {
  const { data } = await client.post('/api/mypage/teacher/schools', payload)
  return data
}

/** @param {number} schoolId */
export async function leaveStaffStore(schoolId) {
  await client.delete(`/api/mypage/teacher/schools/${schoolId}`)
}
