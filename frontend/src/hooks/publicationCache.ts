import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { getGenerationStatus } from '@/api/generationJobs'
import { getDatedLessons } from '@/api/home'
import type { HomeTerm } from '@/types/datedLesson'
import type { AcceptedGeneration } from '@/types/generationJob'
import type { PublicationRefresh } from '@/types/publication'
import { queryKeys } from './queryKeys.js'
import type { HomeSession } from './useHomeSession'

type Scope = HomeSession['scope']

function includesPublishedLessons(key: QueryKey, term: HomeTerm, scope: Scope, from: string) {
  const owner = key.at(-1) as Partial<Scope> | null
  if (
    owner?.schoolId !== term.schoolId ||
    owner.userId !== scope.userId ||
    owner.generation !== scope.generation
  )
    return false
  if (key[0] === 'dated-lessons') {
    return key[1] === term.termId && typeof key[2] === 'string' && key[2] >= from
  }
  if (key[0] !== 'timetable' || (key[1] !== 'me' && key[1] !== 'school')) return false

  // useWeekRead appends [termId, view, classId, scope] to the weekly endpoint's key.
  const termId = key.at(-4)
  if (termId != null) return termId === term.termId
  const [year, semester] = key.slice(2, -4)
  return year === undefined || (year === term.academicYear && semester === term.semester)
}

export function publicationTimetables(term: HomeTerm, scope: Scope, effectiveFrom: string) {
  return ({ queryKey }: { queryKey: QueryKey }) =>
    includesPublishedLessons(queryKey, term, scope, effectiveFrom)
}

export async function refreshPublication(
  cache: QueryClient,
  term: HomeTerm,
  scope: Scope,
  effectiveFrom: string,
  conflictJob: AcceptedGeneration | null,
  signal: AbortSignal,
  assertAccess: () => void,
): Promise<PublicationRefresh> {
  const dateKey = [
    ...queryKeys.home.dated(term.termId, effectiveFrom, 'school', undefined, null),
    scope,
  ]
  const dateHash = hashKey(dateKey)
  const jobKey = queryKeys.schedule.generationJob(term.termId, conflictJob?.jobId, scope)
  const jobHash = conflictJob && hashKey(jobKey)
  const affected = publicationTimetables(term, scope, effectiveFrom)
  const targets = {
    predicate: (q: { queryKey: QueryKey; queryHash: string }) =>
      affected(q) || q.queryHash === jobHash,
  }

  // A read started before the POST can still hold the previous version.
  await cache.cancelQueries(targets)
  await cache.invalidateQueries({ ...targets, refetchType: 'none' })
  signal.throwIfAborted()
  assertAccess()

  const cancelReads = () => {
    void cache.cancelQueries(targets)
  }
  signal.addEventListener('abort', cancelReads, { once: true })
  const [timetables, lessons, job] = await Promise.allSettled([
    cache.refetchQueries(
      { type: 'active', predicate: (q) => affected(q) && q.queryHash !== dateHash },
      { throwOnError: true },
    ),
    cache.fetchQuery({
      queryKey: dateKey,
      queryFn: ({ signal: readSignal }) => {
        assertAccess()
        return getDatedLessons(term.termId, effectiveFrom, readSignal)
      },
      staleTime: 0,
      networkMode: 'always',
      retry: false,
    }),
    conflictJob
      ? cache.fetchQuery({
          queryKey: jobKey,
          queryFn: ({ signal: readSignal }) => {
            assertAccess()
            return getGenerationStatus(term.termId, conflictJob, readSignal)
          },
          staleTime: 0,
          networkMode: 'always',
          retry: false,
        })
      : undefined,
  ])
  signal.removeEventListener('abort', cancelReads)
  const refresh: PublicationRefresh = { failures: [] }
  if (timetables.status === 'rejected')
    refresh.failures.push({ source: 'timetables', error: timetables.reason })
  if (lessons.status === 'fulfilled') refresh.lessons = lessons.value
  else refresh.failures.push({ source: 'lessons', error: lessons.reason })
  if (job.status === 'fulfilled') refresh.job = job.value
  else refresh.failures.push({ source: 'job', error: job.reason })
  return refresh
}
