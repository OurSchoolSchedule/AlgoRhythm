// 마이페이지(MyPage) API
import client from './client.js'

// ===== 활성 매장 =====

/** @returns {Promise<import('@/types/mypage.js').ActiveStoreResponse>} */
export async function getActiveStore() {
  const { data } = await client.get('/api/mypage/active-store')
  return data
}

/**
 * 활성 매장 전환.
 * @param {number} storeId
 * @returns {Promise<import('@/types/mypage.js').ActiveStoreResponse>}
 */
export async function updateActiveStore(storeId) {
  const { data } = await client.patch(`/api/mypage/active-store/${storeId}`)
  return data
}

// ===== 사장(Owner) =====

/** @returns {Promise<import('@/types/mypage.js').OwnerProfileResponse>} */
export async function getOwnerProfile() {
  const { data } = await client.get('/api/mypage/owner/profile')
  return data
}

/**
 * @param {import('@/types/mypage.js').OwnerProfileUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').OwnerProfileResponse>}
 */
export async function updateOwnerProfile(payload) {
  const { data } = await client.put('/api/mypage/owner/profile', payload)
  return data
}

/** @returns {Promise<import('@/types/mypage.js').OwnerStoreResponse>} */
export async function getOwnerStore() {
  const { data } = await client.get('/api/mypage/owner/store')
  return data
}

/**
 * @param {import('@/types/mypage.js').OwnerStoreUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').OwnerStoreResponse>}
 */
export async function updateOwnerStore(payload) {
  const { data } = await client.put('/api/mypage/owner/store', payload)
  return data
}

/** @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse[]>} */
export async function getOwnerStores() {
  const { data } = await client.get('/api/mypage/owner/stores')
  return data
}

/**
 * @param {import('@/types/mypage.js').OwnerCreateStoreRequest} payload
 * @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse>}
 */
export async function createOwnerStore(payload) {
  const { data } = await client.post('/api/mypage/owner/stores', payload)
  return data
}

/** @param {number} storeId */
export async function deleteOwnerStore(storeId) {
  await client.delete(`/api/mypage/owner/stores/${storeId}`)
}

// ===== 알바(Staff) =====

/** @returns {Promise<import('@/types/mypage.js').StaffProfileResponse>} */
export async function getStaffProfile() {
  const { data } = await client.get('/api/mypage/staff/profile')
  return data
}

/**
 * @param {import('@/types/mypage.js').StaffProfileUpdateRequest} payload
 * @returns {Promise<import('@/types/mypage.js').StaffProfileResponse>}
 */
export async function updateStaffProfile(payload) {
  const { data } = await client.put('/api/mypage/staff/profile', payload)
  return data
}

/** @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse[]>} */
export async function getStaffStores() {
  const { data } = await client.get('/api/mypage/staff/stores')
  return data
}

/**
 * 매장 참여(가입).
 * @param {import('@/types/mypage.js').StaffJoinStoreRequest} payload
 * @returns {Promise<import('@/types/mypage.js').StoreSimpleResponse>}
 */
export async function joinStaffStore(payload) {
  const { data } = await client.post('/api/mypage/staff/stores', payload)
  return data
}

/** @param {number} storeId */
export async function leaveStaffStore(storeId) {
  await client.delete(`/api/mypage/staff/stores/${storeId}`)
}
