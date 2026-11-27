import { isAxiosError } from 'axios'
import type { UseQueryResult } from '@tanstack/react-query'
import type { HomeRead } from '@/types/home'
import { failedHomeRead } from './homeContract'

// An inaccessible or removed target must also disappear after a background refresh.
export function homeQueryState<T>(query: UseQueryResult<T>, enabled: boolean) {
  const status = isAxiosError(query.error) ? query.error.response?.status : undefined
  if (!enabled) return { state: 'disabled', refreshing: false } as const
  if (
    query.isError &&
    (query.data === undefined || status === 401 || status === 403 || status === 404)
  ) {
    return { ...failedHomeRead(status, query.error), refreshing: false }
  }
  if (query.data === undefined) return { state: 'loading', refreshing: false } as const
  return {
    state:
      Array.isArray(query.data) && query.data.length === 0
        ? ('empty' as const)
        : ('ready' as const),
    data: query.data,
    refreshing: query.isFetching,
    refreshError: query.error,
  }
}

export function fieldRead<T>(query: UseQueryResult<T>, enabled: boolean): HomeRead<T> {
  const read = homeQueryState(query, enabled)
  if (read.state === 'ready' || read.state === 'empty') return { state: 'success', data: read.data }
  if (read.state === 'error' || read.state === 'forbidden') return read
  return { state: 'pending' }
}
