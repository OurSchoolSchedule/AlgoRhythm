import { hashKey, type QueryClient, type Query } from '@tanstack/react-query'
import type { HomeSession } from './useHomeSession'
import { queryKeys } from './queryKeys.js'

export function lessonDayKey(termId: number | null, date: string | null) {
  // Same unfiltered school-day query used by home and by publication recovery.
  return queryKeys.home.dated(termId, date, 'school', undefined, null)
}

export async function refreshLessonChanges(
  cache: QueryClient,
  termId: number,
  scope: HomeSession['scope'],
  dates: readonly string[],
  includeLessons: boolean,
  signal: AbortSignal,
  assertAccess: () => void,
) {
  const listHash = hashKey([...queryKeys.home.lessonChanges(termId), scope])
  const dayHashes = new Set(dates.map((date) => hashKey([...lessonDayKey(termId, date), scope])))
  const owner = hashKey([scope])
  const affected = (q: Query) =>
    q.queryHash === listHash ||
    (includeLessons &&
      q.queryKey[0] === 'dated-lessons' &&
      q.queryKey[1] === termId &&
      hashKey([q.queryKey.at(-1)]) === owner)
  await cache.cancelQueries({ predicate: affected })
  await cache.invalidateQueries({ predicate: affected, refetchType: 'none' })
  // If a write was interrupted, keep the old scope stale without starting new reads.
  if (signal.aborted) return null
  assertAccess()
  const stopReads = () => {
    void cache.cancelQueries({ predicate: affected })
  }
  signal.addEventListener('abort', stopReads, { once: true })
  try {
    const reads = cache.getQueryCache().findAll({
      predicate: (q) =>
        affected(q) && (q.isActive() || q.queryHash === listHash || dayHashes.has(q.queryHash)),
    })
    const results = await Promise.allSettled(
      reads.map((q) =>
        cache.refetchQueries({ queryKey: q.queryKey, exact: true }, { throwOnError: true }),
      ),
    )
    return results.find((r) => r.status === 'rejected')?.reason ?? null
  } finally {
    signal.removeEventListener('abort', stopReads)
  }
}
