// 출퇴근(Attendance) API
import client from './client.js'

/**
 * 오늘 출퇴근 상태 조회 (GET /api/attendance/today).
 * @returns {Promise<import('@/types/attendance.js').AttendanceTodayResponse>}
 */
export async function getTodayAttendance() {
  const { data } = await client.get('/api/attendance/today')
  return data
}

/**
 * 출근 체크 (POST /api/attendance/check-in).
 * @returns {Promise<import('@/types/attendance.js').AttendanceCheckInResponse>}
 */
export async function checkIn() {
  const { data } = await client.post('/api/attendance/check-in')
  return data
}

/**
 * 퇴근 체크 (POST /api/attendance/check-out).
 * @returns {Promise<import('@/types/attendance.js').AttendanceCheckOutResponse>}
 */
export async function checkOut() {
  const { data } = await client.post('/api/attendance/check-out')
  return data
}
