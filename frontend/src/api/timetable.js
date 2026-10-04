import client from './client.js'

/**
 * 내 시간표 (GET /api/timetable/me).
 * @returns {Promise<import('@/types/timetable.js').TimetableDto[]>}
 */
export async function getMyTimetable() {
  const { data } = await client.get('/api/timetable/me')
  return Array.isArray(data) ? data : []
}

/**
 * 학교 시간표 (GET /api/timetable).
 * @returns {Promise<import('@/types/timetable.js').TimetableDto[]>}
 */
export async function getSchoolTimetable() {
  const { data } = await client.get('/api/timetable')
  return Array.isArray(data) ? data : []
}
