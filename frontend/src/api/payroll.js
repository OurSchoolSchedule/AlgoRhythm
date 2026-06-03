// 급여(Payroll) API
import client from './client.js'

// ===== OWNER: 매장 급여 =====

/**
 * 매장 급여 현황 (GET /api/payroll/store/summary).
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 * @returns {Promise<import('@/types/payroll.js').OwnerPayrollSummaryDto>}
 */
export async function getStorePayrollSummary(params = {}) {
  const { data } = await client.get('/api/payroll/store/summary', { params })
  return data
}

/**
 * 매장 전체 인건비 합산 (GET /api/payroll/store/total). OWNER.
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 */
export async function getStorePayrollTotal(params = {}) {
  const { data } = await client.get('/api/payroll/store/total', { params })
  return data
}

/**
 * 특정 직원 급여 상세 (GET /api/payroll/store/staff/{userStoreId}). OWNER.
 * @param {number} userStoreId
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 * @returns {Promise<import('@/types/payroll.js').StaffPayrollResponseDto>}
 */
export async function getStaffPayrollDetail(userStoreId, params = {}) {
  const { data } = await client.get(
    `/api/payroll/store/staff/${userStoreId}`,
    { params },
  )
  return data
}

/**
 * 직원 급여 상세 (EmployeePayrollDto 형식) (GET /api/payroll/store/employee/{userStoreId}). OWNER.
 * @param {number} userStoreId
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 */
export async function getEmployeePayrollDetail(userStoreId, params = {}) {
  const { data } = await client.get(
    `/api/payroll/store/employee/${userStoreId}`,
    { params },
  )
  return data
}

// ===== OWNER: 시급 =====

/**
 * 매장 전체 직원 시급 목록 (GET /api/payroll/store/wages). OWNER.
 * @returns {Promise<import('@/types/payroll.js').StoreStaffWagesResponseDto>}
 */
export async function getStoreStaffWages() {
  const { data } = await client.get('/api/payroll/store/wages')
  return data
}

/**
 * 직원 시급 설정 (PUT /api/payroll/store/staff/{userStoreId}/wage). OWNER.
 * @param {number} userStoreId
 * @param {import('@/types/payroll.js').StaffWageUpdateDto} payload
 */
export async function updateStaffWage(userStoreId, payload) {
  const { data } = await client.put(
    `/api/payroll/store/staff/${userStoreId}/wage`,
    payload,
  )
  return data
}

// ===== STAFF: 내 급여 =====

/**
 * 본인 매장별 급여 (GET /api/payroll/me).
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 * @returns {Promise<import('@/types/payroll.js').StaffMyPayrollResponseDto[]>}
 */
export async function getMyPayrolls(params = {}) {
  const { data } = await client.get('/api/payroll/me', { params })
  return data
}

/**
 * 본인 전 매장 급여 합산 (GET /api/payroll/me/total).
 * @param {import('@/types/payroll.js').PayrollPeriodParams} [params]
 */
export async function getMyPayrollsTotal(params = {}) {
  const { data } = await client.get('/api/payroll/me/total', { params })
  return data
}

// ===== 최저임금 =====

/**
 * 연도별 최저임금 조회 (GET /api/payroll/minimum-wage).
 * @param {{ year?: number }} [params]
 * @returns {Promise<import('@/types/payroll.js').MinimumWage>}
 */
export async function getMinimumWage(params = {}) {
  const { data } = await client.get('/api/payroll/minimum-wage', { params })
  return data
}

/**
 * 현재 적용 최저임금 (GET /api/payroll/minimum-wage/current).
 * @returns {Promise<import('@/types/payroll.js').MinimumWage>}
 */
export async function getCurrentMinimumWage() {
  const { data } = await client.get('/api/payroll/minimum-wage/current')
  return data
}

/**
 * 최저임금 등록/수정 (POST /api/payroll/admin/minimum-wage). ADMIN.
 * @param {import('@/types/payroll.js').MinimumWageUpdateDto} payload
 * @returns {Promise<import('@/types/payroll.js').MinimumWage>}
 */
export async function createMinimumWage(payload) {
  const { data } = await client.post('/api/payroll/admin/minimum-wage', payload)
  return data
}
