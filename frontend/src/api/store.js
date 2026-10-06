// 매장(Store) API
import client from './client.js'

/**
 * 구성원 목록 (GET /api/school/members)과 활성 학교 이름 (GET /api/school/me).
 * 담당 과목, 담임 학급, 주간 시수를 포함한다.
 * @returns {Promise<import('@/types/store.js').AllStaffSummaryResponseDto>}
 */
export async function getStoreStaffSummary() {
  const [membersResult, schoolResult] = await Promise.all([
    client.get('/api/school/members'),
    client.get('/api/school/me'),
  ])
  const members = Array.isArray(membersResult.data) ? membersResult.data : []
  return {
    storeName: schoolResult.data?.name ?? '',
    totalStaffCount: members.length,
    staffList: members.map((member) => ({
      userStoreId: member.schoolUserId,
      userId: member.userId,
      username: member.username,
      role: member.position,
      employmentStatus: member.employmentStatus,
      subjects: Array.isArray(member.subjects) ? member.subjects : [],
      homeroomClasses: Array.isArray(member.homeroomClasses) ? member.homeroomClasses : [],
      weeklyLessonCount: member.weeklyLessonCount ?? null,
    })),
  }
}
