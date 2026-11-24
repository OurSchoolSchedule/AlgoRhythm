import { getHomeNotices } from '@/api/home'
import { normalizeNotification } from '@/utils/normalizeNotification.js'
import { queryKeys } from './queryKeys.js'
import { useHomeSession, useScopedRead } from './useHomeSession'

const normalizeList = rows => rows.map(normalizeNotification)

export function useNotifications(options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.notification.list(), session.access.queries.notifications,
    getHomeNotices, { select: normalizeList, ...options })
}
