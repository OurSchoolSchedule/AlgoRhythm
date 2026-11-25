import { useSyncExternalStore } from 'react'
import {
  skipToken,
  useIsMutating,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  getAccessToken,
  getSessionVersion,
  getUserId,
  subscribeSession,
} from '@/api/tokenStorage.js'
import { getActiveStore } from '@/api/mypage.js'
import { homeAccess } from '@/utils/homeAccess'
import { queryKeys } from './queryKeys.js'

export function useHomeSession(options: { enabled?: boolean } = {}) {
  const generation = useSyncExternalStore(subscribeSession, getSessionVersion)
  const id = Number(getUserId())
  const userId = getAccessToken() && Number.isSafeInteger(id) && id > 0 ? id : null
  const identity = { userId, generation }
  const switching = useIsMutating({ mutationKey: queryKeys.home.switchSchool(identity) }) > 0
  const active = useQuery({
    queryKey: queryKeys.home.active(identity),
    queryFn: userId !== null && !switching ? ({ signal }) => getActiveStore({ signal }) : skipToken,
    enabled: options.enabled !== false && userId !== null && !switching,
    retry: false,
    // A pending teacher legitimately has no active school. Retry on an explicit status refresh.
    retryOnMount: false,
  })
  const school = userId !== null && !switching && !active.isError ? (active.data ?? null) : null
  const access = homeAccess(userId !== null, school)
  return {
    userId,
    identity,
    school,
    access,
    switching,
    active,
    scope: {
      ...identity,
      schoolId: school?.schoolId ?? null,
      position: school?.position ?? null,
      employment: school?.employmentStatus ?? null,
    },
  }
}

export type HomeSession = ReturnType<typeof useHomeSession>
export type ReadOptions<T, R> = Omit<
  UseQueryOptions<T, Error, R>,
  'queryKey' | 'queryFn' | 'enabled'
> & {
  enabled?: boolean
}

// Append the authenticated scope so the existing mutation invalidation prefixes keep working.
export function useScopedRead<T, R = T>(
  session: HomeSession,
  prefix: QueryKey,
  allowed: boolean,
  read: (signal: AbortSignal) => Promise<T>,
  options: ReadOptions<T, R> = {},
) {
  return useQuery<T, Error, R>({
    ...options,
    queryKey: [...prefix, session.scope],
    queryFn: allowed ? ({ signal }) => read(signal) : skipToken,
    enabled: allowed && options.enabled !== false,
    placeholderData: undefined,
  })
}
