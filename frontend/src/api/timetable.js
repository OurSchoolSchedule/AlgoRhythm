import client from './client.js'

/**
 * 내 시간표 (GET /api/timetable/me).
 * @returns {Promise<import('@/types/timetable.js').TimetableDto[]>}
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function getMyTimetable(options = {}) {
  const { data } = await client.get('/api/timetable/me', { signal: options.signal })
  return Array.isArray(data) ? data : []
}

/**
 * 학교 시간표 (GET /api/timetable).
 * @returns {Promise<import('@/types/timetable.js').TimetableDto[]>}
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function getSchoolTimetable(options = {}) {
  const { data } = await client.get('/api/timetable', { signal: options.signal })
  return Array.isArray(data) ? data : []
}

/**
 * 학년도·학기 학교 시간표 (GET /api/timetable/year/{year}/semester/{semester}).
 * @param {number} year
 * @param {number} semester
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('@/types/timetable.js').TimetableDto[]>}
 */
export async function getSchoolTimetableByTerm(year, semester, options = {}) {
  const { data } = await client.get(`/api/timetable/year/${year}/semester/${semester}`, { signal: options.signal })
  return Array.isArray(data) ? data : []
}

/**
 * 학년도·학기 내 시간표 (GET /api/timetable/me/year/{year}/semester/{semester}).
 * @param {number} year
 * @param {number} semester
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<import('@/types/timetable.js').TimetableDto[]>}
 */
export async function getMyTimetableByTerm(year, semester, options = {}) {
  const { data } = await client.get(`/api/timetable/me/year/${year}/semester/${semester}`, { signal: options.signal })
  return Array.isArray(data) ? data : []
}

/**
 * 시간표 칸 생성 (POST /api/timetable).
 * @param {import('@/types/timetable.js').TimetableCreateDto} payload
 */
export async function createTimetable(payload) {
  const { data } = await client.post('/api/timetable', payload)
  return data
}

/**
 * 시간표 칸 수정 (PATCH /api/timetable/{timetableId}).
 * @param {number} timetableId
 * @param {import('@/types/timetable.js').TimetableCreateDto} payload
 */
export async function updateTimetable(timetableId, payload) {
  const { data } = await client.patch(`/api/timetable/${timetableId}`, payload)
  return data
}

/**
 * 시간표 칸 삭제 (DELETE /api/timetable/{timetableId}).
 * @param {number} timetableId
 */
export async function deleteTimetable(timetableId) {
  await client.delete(`/api/timetable/${timetableId}`)
}
