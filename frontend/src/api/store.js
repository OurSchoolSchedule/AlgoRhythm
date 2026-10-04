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
 * 교사 목록 (GET /api/school/teachers)과 활성 학교 이름 (GET /api/school/me).
 * 화면이 쓰던 요약 형태로 맞춘다. 지각·결근·시수는 응답에 없다.
 * @returns {Promise<import('@/types/store.js').AllStaffSummaryResponseDto>}
 */
export async function getStoreStaffSummary() {
  const [teachersResult, schoolResult] = await Promise.all([
    client.get('/api/school/teachers'),
    client.get('/api/school/me'),
  ])
  const teachers = Array.isArray(teachersResult.data) ? teachersResult.data : []
  return {
    storeName: schoolResult.data?.name ?? '',
    totalStaffCount: teachers.length,
    staffList: teachers.map((teacher) => ({
      userStoreId: teacher.schoolUserId,
      username: teacher.username,
      role: teacher.position,
      employmentStatus: teacher.employmentStatus,
    })),
  }
}
