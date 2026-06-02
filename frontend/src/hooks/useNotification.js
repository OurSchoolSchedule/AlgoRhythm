import { useQuery } from '@tanstack/react-query'
import { getNotifications } from '@/api'
import { queryKeys } from './queryKeys.js'

export function useNotifications(options = {}) {
  return useQuery({
    queryKey: queryKeys.notification.list(),
    queryFn: getNotifications,
    ...options,
  })
}
