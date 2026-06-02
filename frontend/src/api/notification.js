// 알림(Notification) API
import client from './client.js'

/**
 * 내 알림 목록 조회 (GET /api/notifications).
 * @returns {Promise<import('@/types/notification.js').NotificationResponseDto[]>}
 */
export async function getNotifications() {
  const { data } = await client.get('/api/notifications')
  return data
}
