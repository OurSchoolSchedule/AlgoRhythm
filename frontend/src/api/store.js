// 매장(Store) API
import client from './client.js'

/**
 * 교사 목록 (GET /api/school/teachers)과 활성 학교 이름 (GET /api/school/me).
 * 담당 과목, 담임 학급, 주간 시수를 포함한다. 지각·결근은 응답에 없다.
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
      userId: teacher.userId,
      username: teacher.username,
      role: teacher.position,
      employmentStatus: teacher.employmentStatus,
      subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
      homeroomClasses: Array.isArray(teacher.homeroomClasses) ? teacher.homeroomClasses : [],
      weeklyLessonCount: teacher.weeklyLessonCount ?? null,
    })),
  }
}
