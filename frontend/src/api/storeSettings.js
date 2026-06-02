// 매장 설정(Store Settings) API
import client from './client.js'

/**
 * 현재 활성 매장 설정 조회 (GET /api/store-settings).
 * @returns {Promise<import('@/types/storeSettings.js').StoreSettingDto>}
 */
export async function getStoreSetting() {
  const { data } = await client.get('/api/store-settings')
  return data
}

/**
 * 매장 설정 수정 (PATCH /api/store-settings). OWNER 전용.
 * @param {import('@/types/storeSettings.js').StoreSettingDto} payload
 * @returns {Promise<import('@/types/storeSettings.js').StoreSettingDto>}
 */
export async function updateStoreSetting(payload) {
  const { data } = await client.patch('/api/store-settings', payload)
  return data
}

/**
 * 임시 설정 저장 (POST /api/store-settings/temporary). Redis key 반환.
 * @param {import('@/types/storeSettings.js').StoreSettingDto} payload
 * @returns {Promise<import('@/types/storeSettings.js').TemporarySettingKeyResponse>}
 */
export async function saveTemporarySetting(payload) {
  const { data } = await client.post('/api/store-settings/temporary', payload)
  return data
}

/**
 * 임시 설정 조회 (GET /api/store-settings/temporary?key=).
 * @param {string} key
 * @returns {Promise<import('@/types/storeSettings.js').StoreSettingDto>}
 */
export async function getTemporarySetting(key) {
  const { data } = await client.get('/api/store-settings/temporary', {
    params: { key },
  })
  return data
}

/**
 * 임시 설정을 기본 설정으로 적용 (POST /api/store-settings/temporary/apply?key=).
 * @param {string} key
 * @returns {Promise<import('@/types/storeSettings.js').StoreSettingDto>}
 */
export async function applyTemporarySetting(key) {
  const { data } = await client.post(
    '/api/store-settings/temporary/apply',
    null,
    { params: { key } },
  )
  return data
}

/**
 * 임시 설정 삭제 (DELETE /api/store-settings/temporary?key=).
 * @param {string} key
 */
export async function deleteTemporarySetting(key) {
  await client.delete('/api/store-settings/temporary', { params: { key } })
}
