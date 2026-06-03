// 매장(Store) API
import client from './client.js'

/**
 * 활성 매장 직원 목록 조회 (GET /api/store/staff).
 * @returns {Promise<import('@/types/store.js').StoreStaffResponse[]>}
 */
export async function getStoreStaff() {
  const { data } = await client.get('/api/store/staff')
  return data
}

/**
 * 직원 관리 요약 조회 (GET /api/store/staff/summary). OWNER 전용.
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 * @returns {Promise<import('@/types/store.js').AllStaffSummaryResponseDto>}
 */
export async function getStoreStaffSummary(params = {}) {
  const { data } = await client.get('/api/store/staff/summary', { params })
  return data
}
