import client from './client.js'

/**
 * 학교 교시 설정 조회 (GET /api/school-setting).
 * @returns {Promise<import('@/types/schoolSetting.js').SchoolSettingResponse>}
 */
export async function getSchoolSetting() {
  const { data } = await client.get('/api/school-setting')
  return data
}

/**
 * 학교 교시 설정 생성 또는 수정 (POST /api/school-setting).
 * @param {import('@/types/schoolSetting.js').SchoolSettingRequest} payload
 * @returns {Promise<import('@/types/schoolSetting.js').SchoolSettingResponse>}
 */
export async function saveSchoolSetting(payload) {
  const { data } = await client.post('/api/school-setting', payload)
  return data
}

/**
 * 교시 목록 (GET /api/school-setting/periods).
 * @returns {Promise<import('@/types/schoolSetting.js').PeriodSettingResponse[]>}
 */
export async function getPeriodSettings() {
  const { data } = await client.get('/api/school-setting/periods')
  return Array.isArray(data) ? data : []
}

/**
 * 교시 추가 (POST /api/school-setting/periods).
 * @param {import('@/types/schoolSetting.js').PeriodSettingRequest} payload
 */
export async function addPeriodSetting(payload) {
  const { data } = await client.post('/api/school-setting/periods', payload)
  return data
}

/**
 * 교시 수정 (PUT /api/school-setting/periods/{periodId}).
 * @param {number} periodId
 * @param {import('@/types/schoolSetting.js').PeriodSettingRequest} payload
 */
export async function updatePeriodSetting(periodId, payload) {
  const { data } = await client.put(`/api/school-setting/periods/${periodId}`, payload)
  return data
}

/**
 * 교시 삭제 (DELETE /api/school-setting/periods/{periodId}).
 * @param {number} periodId
 */
export async function deletePeriodSetting(periodId) {
  await client.delete(`/api/school-setting/periods/${periodId}`)
}
