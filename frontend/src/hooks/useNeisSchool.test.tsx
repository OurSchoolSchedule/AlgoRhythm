// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import client from '@/api/client'
import { canSelect, getSchoolLink } from '@/api/neisSchool'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage'
import fixture from '@/test/fixtures/neis/school-search.json'
import { useHomeSession } from './useHomeSession'
import { neisKeys, useChangeSchoolLink, useSchoolLink } from './useNeisSchool'
import { queryKeys } from './queryKeys'

const [seoul, daegu, blank] = fixture.items
const home = { schoolId: 101, position: 'ADMIN', employmentStatus: 'HIRED' }
const initial = {
  schoolId: 101,
  school: null,
  status: 'NOT_LINKED',
  version: 0,
  linkedAt: null,
}
const linked = {
  ...initial,
  school: daegu,
  status: 'LINKED',
  version: 1,
  linkedAt: '2026-11-25T12:00:00Z',
}
let cache: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
}
function mount() {
  return renderHook(
    () => {
      const session = useHomeSession()
      return {
        scope: session.scope,
        read: useSchoolLink(session),
        write: useChangeSchoolLink(session),
      }
    },
    { wrapper },
  )
}
beforeEach(() => {
  setTokens({ userId: 11, accessToken: 'fixture' })
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  cache.setQueryData(
    queryKeys.home.active({ userId: 11, generation: getSessionVersion() }),
    home,
  )
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  vi.restoreAllMocks()
})

it('keeps identically named schools distinct and rejects null or whitespace codes', () => {
  expect(seoul.schoolName).toBe(daegu.schoolName)
  expect(canSelect(seoul) && canSelect(daegu)).toBe(true)
  expect(canSelect(blank)).toBe(false)
  expect(canSelect({ ...seoul, officeCode: '  ' })).toBe(false)
  expect(canSelect({ ...seoul, standardSchoolCode: '  ' })).toBe(false)
  expect(canSelect({ ...daegu, selectable: false })).toBe(false)
})

it('checks the internal school ID in a link response', async () => {
  vi.spyOn(client, 'get').mockResolvedValue({
    data: { ...linked, schoolId: 202 },
  })
  await expect(
    getSchoolLink(101, new AbortController().signal),
  ).rejects.toThrow(/현재 학교/)
})

it('updates the exact link and invalidates meals only for the changed school', async () => {
  vi.spyOn(client, 'get').mockImplementation(async (url) => ({
    data: url.endsWith('/active-school') ? home : initial,
  }))
  const patch = vi.spyOn(client, 'patch').mockResolvedValue({ data: linked })
  const { result } = mount()
  await waitFor(() => expect(result.current.read.data?.version).toBe(0))
  const scope = result.current.scope
  const keys = [
    [...neisKeys.meals(101), 0, 'today', scope],
    [...neisKeys.meals(202), 0, 'today', { ...scope, schoolId: 202 }],
    ['timetable', 'school', scope],
  ]
  keys.forEach((key) => cache.setQueryData(key, []))
  await act(() =>
    result.current.write.mutateAsync({ option: daegu, version: 0 }),
  )
  expect(patch).toHaveBeenCalledWith('/api/neis/schools/101/link', {
    officeCode: 'D10',
    standardSchoolCode: '7240073',
    expectedVersion: 0,
  })
  expect(cache.getQueryData([...neisKeys.link(101), scope])).toEqual(linked)
  expect(keys.map((key) => cache.getQueryState(key)?.isInvalidated)).toEqual([
    true,
    false,
    false,
  ])
})

it('does not patch when the server reports a different active school', async () => {
  vi.spyOn(client, 'get').mockImplementation(async (url) => ({
    data: url.endsWith('/active-school') ? { ...home, schoolId: 202 } : initial,
  }))
  const patch = vi.spyOn(client, 'patch')
  const { result } = mount()
  await waitFor(() => expect(result.current.read.isSuccess).toBe(true))
  await act(async () => {
    await expect(
      result.current.write.mutateAsync({ option: daegu, version: 0 }),
    ).rejects.toThrow(/활성 학교/)
  })
  expect(patch).not.toHaveBeenCalled()
})
