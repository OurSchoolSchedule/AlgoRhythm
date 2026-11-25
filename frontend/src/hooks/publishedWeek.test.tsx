// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { expect, it } from 'vitest'
import client from '@/api/client.js'
import { clearTokens, setTokens } from '@/api/tokenStorage.js'
import { useHomeSession } from './useHomeSession'
import { useWeekRead } from './homeReads'
import { publicationTimetables } from './publicationCache'

it('shares a school week across its dates, isolates terms and refreshes the published homeroom', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const term = { termId: 547001, schoolId: 540001, academicYear: 2026, semester: 2 }
  const requests: string[] = []
  const adapter = client.defaults.adapter
  client.defaults.adapter = async (config) => {
    const active = config.url === '/api/mypage/active-school'
    if (!active) requests.push(client.getUri(config))
    const rows = [11, 12].map((schoolClassId) => ({
      schoolId: term.schoolId, schoolClassId, id: null, weeklyLessonId: requests.length,
    }))
    return { config, status: 200, statusText: 'OK', headers: {}, data: active
      ? { schoolId: term.schoolId, position: 'TEACHER', employmentStatus: 'HIRED' }
      : rows }
  }
  setTokens({ accessToken: 'test', userId: 541004 })
  const { result, rerender, unmount } = renderHook(({ date, termId, mine }) => {
    const session = useHomeSession()
    const query = useWeekRead(session, mine ? 'mine' : 'homeroom', 2026, 2, termId,
      mine ? undefined : 11, { date })
    return { query, scope: session.scope }
  }, {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>,
    initialProps: { date: '2026-11-23', termId: term.termId, mine: false },
  })
  try {
    await waitFor(() => expect(result.current.query.data?.map(r => r.schoolClassId)).toEqual([11]))
    const first = new URL(requests[0], 'http://localhost')
    expect(first.pathname).toBe('/api/timetable/year/2026/semester/2')
    expect(Object.fromEntries(first.searchParams)).toEqual({ weekOf: '2026-11-23', termId: '547001' })
    rerender({ date: '2026-11-29', termId: term.termId, mine: false })
    expect(result.current.query.data?.[0].weeklyLessonId).toBe(1)
    expect(requests).toHaveLength(1)
    await act(() => cache.invalidateQueries({
      predicate: publicationTimetables(term, result.current.scope, '2026-11-25'),
    }))
    await waitFor(() => expect(result.current.query.data?.[0].weeklyLessonId).toBe(2))
    rerender({ date: '2026-12-02', termId: term.termId, mine: false })
    await waitFor(() => expect(result.current.query.data?.[0].weeklyLessonId).toBe(3))
    expect(requests[2]).toContain('weekOf=2026-11-30')
    rerender({ date: '2026-12-02', termId: 547002, mine: true })
    await waitFor(() => expect(result.current.query.data?.[0].weeklyLessonId).toBe(4))
    expect(requests[3]).toContain('/api/timetable/me/year/2026/semester/2')
    expect(requests[3]).toContain('termId=547002')
  } finally {
    unmount()
    cache.clear()
    clearTokens()
    client.defaults.adapter = adapter
  }
})
