// 매장(Store) API
import client from './client.js'
import { directoryHomerooms } from '@/utils/directoryHomerooms'

/**
 * 구성원 목록 (GET /api/school/members)과 활성 학교 이름 (GET /api/school/me).
 * 담당 과목, 담임 학급, 주간 시수를 포함한다.
 * @returns {Promise<import('@/types/store.js').AllStaffSummaryResponseDto>}
 */
export async function getStoreStaffSummary(termId = null, signal, academicYear = null) {
  const [membersResult, schoolResult] = await Promise.all([
    client.get('/api/school/members', { params: termId ? { termId } : undefined, signal }),
    client.get('/api/school/me', { signal }),
  ])
  const members = Array.isArray(membersResult.data) ? membersResult.data : []
  const schoolName = schoolResult.data?.name ?? ''
  return {
    schoolName,
    storeName: schoolName,
    totalStaffCount: members.length,
    staffList: members.map((member) => {
      const schoolUserId = member.schoolUserId
      return {
        schoolUserId,
        userStoreId: schoolUserId,
        userId: member.userId,
        username: member.displayName ?? member.username,
        role: member.position,
        employmentStatus: member.employmentStatus,
        subjects: member.rosterSubjects ?? member.subjects ?? [],
        homeroomClasses: directoryHomerooms(member, academicYear, termId),
        weeklyLessonCount: member.weeklyLessonCount ?? null,
      }
    }),
  }
}
