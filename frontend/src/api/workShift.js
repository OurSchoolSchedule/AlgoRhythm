// 근무표(Work Shift) API
import client from './client.js'

/**
 * 전체 시프트 조회 (GET /api/schedules).
 * @returns {Promise<import('@/types/workShift.js').WorkShiftListResponse>}
 */
export async function getWorkShifts() {
  const { data } = await client.get('/api/schedules')
  return data
}

/**
 * 매장 주간 근무표 조회 (GET /api/schedules/store/week). OWNER.
 * @param {{ start: string, end: string }} params "YYYY-MM-DD"
 * @returns {Promise<import('@/types/workShift.js').WorkShiftDto[]>}
 */
export async function getStoreWeekShifts({ start, end }) {
  const { data } = await client.get('/api/schedules/store/week', {
    params: { start, end },
  })
  return data
}

/**
 * 내 주간 근무표 조회 (GET /api/schedules/me/week).
 * @param {{ start: string, end: string }} params "YYYY-MM-DD"
 * @returns {Promise<import('@/types/workShift.js').MyWorkShiftDto[]>}
 */
export async function getMyWeekShifts({ start, end }) {
  const { data } = await client.get('/api/schedules/me/week', {
    params: { start, end },
  })
  return data
}

/**
 * 시프트 생성 (POST /api/schedules/workshifts). OWNER.
 * @param {import('@/types/workShift.js').WorkShiftCreateDto} payload
 * @returns {Promise<import('@/types/workShift.js').WorkShiftDto>}
 */
export async function createWorkShift(payload) {
  const { data } = await client.post('/api/schedules/workshifts', payload)
  return data
}

/**
 * 시프트 수정 (PATCH /api/schedules/workshifts/{shiftId}). OWNER.
 * @param {number} shiftId
 * @param {import('@/types/workShift.js').WorkShiftUpdateDto} payload
 * @returns {Promise<import('@/types/workShift.js').WorkShiftDto>}
 */
export async function updateWorkShift(shiftId, payload) {
  const { data } = await client.patch(
    `/api/schedules/workshifts/${shiftId}`,
    payload,
  )
  return data
}

/**
 * 시프트 삭제 (DELETE /api/schedules/workshifts/{shiftId}). OWNER.
 * @param {number} shiftId
 */
export async function deleteWorkShift(shiftId) {
  await client.delete(`/api/schedules/workshifts/${shiftId}`)
}
