// 알림(Notification) API
import { getHomeNotices } from './home'
import { normalizeNotification } from '@/utils/normalizeNotification.js'

/**
 * 내 알림 목록 조회 (GET /api/notifications).
 * @returns {Promise<import('@/types/notification.js').NotificationResponseDto[]>}
 */
export async function getNotifications() {
  return (await getHomeNotices()).map(normalizeNotification)
}
