// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import client from '@/api/client.js'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage.js'
import type { AcceptedGeneration, GenerationJob } from '@/types/generationJob'
import { useCandidatePublication } from './useCandidatePublication'
import { useGenerationJob } from './useGenerationJob'
import { queryKeys } from './queryKeys.js'

const term = { schoolId: 540001, termId: 547001, academicYear: 2026, semester: 2 }
const admin = { schoolId: term.schoolId, position: 'ADMIN', employmentStatus: 'HIRED' }
const userId = 541000
const base = '/api/v2/terms/547001'
const jobId = '7eb15cc6-193f-4519-9704-50035ae28371'
const accepted: AcceptedGeneration = {
  jobId,
  state: 'QUEUED',
  statusUrl: base + '/generations/' + jobId,
  expectedPublishRev: 0,
}
const firstId = 'a'.repeat(64)
const candidateId = '0'.repeat(63) + 'b'
const effectiveFrom = '2026-11-23'
const selection = { candidateId, effectiveFrom }
const request = { jobId, ...selection, expectedPublishRev: 0 }
const receipt = { versionId: 83, publishRev: 1, weeklyLessons: 672 }
const ready: GenerationJob = {
  jobId,
  state: 'READY',
  expectedPublishRev: 0,
  result: {
    jobId,
    expectedPublishRev: 0,
    validatedLoadId: '375d0754-c375-42c6-b1f0-f630a9693e37',
    status: 'READY',
    stopReason: 'SEARCH_EXHAUSTED',
    detail: null,
    elapsedMs: 3,
    candidates: [firstId, candidateId].map((id) => ({
      candidateId: id,
      score: { wantsMet: 0, wantsTotal: 0, avoidsMet: 0, avoidsTotal: 0, teachersWithNoWantMet: 0 },
      placements: [],
    })),
  },
}
const lesson = {
  id: 81,
  rev: 1,
  termId: term.termId,
  versionId: 83,
  date: effectiveFrom,
  originDate: effectiveFrom,
  originId: 12,
  classId: 543001,
  subjectId: 544001,
  planned: { teacherId: 542001, periodId: 1 },
  actual: { teacherId: 542002, periodId: 1 },
}
const oldAdapter = client.defaults.adapter
let cache: QueryClient
let posts: InternalAxiosRequestConfig[]
let gets: InternalAxiosRequestConfig[]
let postStatus: number
let respondPost: (cfg: InternalAxiosRequestConfig) => unknown
let readJob: () => unknown
let readLessons: () => unknown

const identity = () => ({ userId, generation: getSessionVersion() })
const scope = () => ({
  ...identity(),
  schoolId: term.schoolId,
  position: 'ADMIN',
  employment: 'HIRED',
})
const statusKey = () => queryKeys.schedule.generationJob(term.termId, jobId, scope())
const dayKey = (date: string, id = term.termId) => [
  ...queryKeys.home.dated(id, date, 'school', undefined, null),
  scope(),
]
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
}
function mount() {
  return renderHook((value) => useCandidatePublication(value, jobId), {
    initialProps: term,
    wrapper,
  })
}
function rejectHttp(status: number, data: unknown, config: InternalAxiosRequestConfig): never {
  throw new AxiosError('HTTP ' + status, undefined, config, undefined, {
    status,
    statusText: '',
    headers: {},
    data,
    config,
  })
}

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  setTokens({ userId, accessToken: 'admin-test' })
  cache.setQueryData(queryKeys.home.active(identity()), admin)
  cache.setQueryData(queryKeys.schedule.generationAccepted(term.termId, scope()), accepted)
  cache.setQueryData(statusKey(), ready)
  posts = []
  gets = []
  postStatus = 201
  respondPost = () => receipt
  readJob = () => ready
  readLessons = () => [lesson]
  client.defaults.adapter = async (config) => {
    let data: unknown
    if (config.method === 'post' && config.url === base + '/publications') {
      posts.push(config)
      data = await respondPost(config)
    } else {
      gets.push(config)
      if (config.url === base + '/lessons') data = await readLessons()
      else if (config.url === accepted.statusUrl) data = await readJob()
      else throw new Error('Unexpected request ' + config.url)
    }
    return {
      status: config.method === 'post' ? postStatus : 200,
      statusText: '',
      headers: {},
      config,
      data,
    }
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  client.defaults.adapter = oldAdapter
  clearTokens()
})

describe('후보 게시', () => {
  it('FE5의 두 번째 후보 원본 ID와 접수 rev 0을 정확히 네 필드로 보내고 201 영수증을 보관한다', async () => {
    const { result } = renderHook(
      () => {
        const generation = useGenerationJob(term)
        const publication = useCandidatePublication(term, generation.accepted?.jobId ?? null)
        return { generation, publication }
      },
      { wrapper },
    )
    await act(async () => {
      const id = result.current.generation.candidates[1].candidateId
      const outcome = await result.current.publication.publish({ effectiveFrom, candidateId: id })
      expect(outcome).toMatchObject({
        phase: 'published',
        request,
        receipt,
        refresh: { lessons: [lesson], failures: [] },
      })
    })
    await waitFor(() => expect(result.current.publication.state.phase).toBe('published'))
    expect(posts.map((p) => JSON.parse(p.data))).toEqual([request])
    expect(posts[0].headers.Authorization).toBe('Bearer admin-test')
    expect(gets.map((c) => client.getUri(c))).toEqual([base + '/lessons?date=' + effectiveFrom])
    expect(cache.getQueryData(dayKey(effectiveFrom))).toEqual([lesson])
  })

  it('201은 현재 학교·학기 주간표, 학기 포함 주간표, 적용일 이후 날짜 수업만 갱신한다', async () => {
    const week = [...queryKeys.timetable.school(2026, 2), term.termId, 'school', null, scope()]
    const active = vi.fn(async () => ['new'])
    const affected = [
      [...queryKeys.timetable.school(2026, 2), null, 'school', null, scope()],
      [...queryKeys.timetable.mine(2026, 2), term.termId, 'mine', null, scope()],
      [...queryKeys.timetable.school(2026, 2), term.termId, 'homeroom', 543001, scope()],
      [...queryKeys.timetable.school(null, null), null, 'school', null, scope()],
      [...queryKeys.home.dated(term.termId, effectiveFrom, 'homeroom', 543001, null), scope()],
      dayKey('2026-12-01'),
    ]
    const unchanged = [
      dayKey('2026-11-22'),
      dayKey(effectiveFrom, term.termId + 1),
      [...week.slice(0, -1), { ...scope(), schoolId: 540002 }],
      [...week.slice(0, -1), { ...scope(), userId: 111 }],
      [...week.slice(0, -1), { ...scope(), generation: scope().generation - 1 }],
      [...queryKeys.timetable.school(2026, 2), term.termId + 1, 'school', null, scope()],
      [...queryKeys.timetable.school(2026, 1), null, 'school', null, scope()],
      [...queryKeys.notification.list(), scope()],
    ]
    for (const key of [week, ...affected, ...unchanged, dayKey(effectiveFrom)])
      cache.setQueryData(key, ['old'])
    const observer = new QueryObserver(cache, { queryKey: week, queryFn: active })
    const unsubscribe = observer.subscribe(() => {})
    const { result } = mount()
    try {
      await act(async () => {
        await result.current.publish(selection)
      })
      expect(active).toHaveBeenCalledTimes(1)
      expect(cache.getQueryData(week)).toEqual(['new'])
      for (const key of affected)
        expect(cache.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true)
      for (const key of unchanged)
        expect(cache.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(false)
      expect(cache.getQueryData(dayKey(effectiveFrom))).toEqual([lesson])
    } finally {
      unsubscribe()
    }
  })

  it.each([
    [{ code: 'STALE_PUBLICATION', currentRev: 3 }, 'regenerate'],
    [{ code: 'STALE_INPUT', currentRev: null }, 'revalidate-load'],
    [{ code: 'JOB_NOT_READY' }, 'reselect-candidate'],
    [{ code: 'JOB_ALREADY_PUBLISHED', message: '이미 다른 선택으로 확정' }, 'review-publication'],
    [{ code: 'DATED_CHANGES_EXIST', currentRev: 0 }, 'review-dated-lessons'],
    [{ code: 'UNRECOGNIZED', message: '서버 메시지', activeJobId: null }, 'review-publication'],
  ] as const)(
    '409 %o 이후 최신 작업·날짜를 조회하고 재게시하지 않는다',
    async (problem, recovery) => {
      respondPost = (config) => rejectHttp(409, problem, config)
      const latest = {
        ...ready,
        result: { ...ready.result, candidates: ready.result.candidates.slice(0, 1) },
      }
      readJob = () => latest
      cache.setQueryData(dayKey(effectiveFrom), [])
      const { result, rerender } = mount()
      await act(async () => {
        const outcome = await result.current.publish(selection)
        expect(outcome).toMatchObject({
          phase: 'conflict',
          recovery,
          request,
          refresh: { job: latest, lessons: [lesson], failures: [] },
        })
        if (outcome.phase !== 'conflict') throw new Error('expected conflict')
        expect(outcome.problem).toStrictEqual(problem)
      })
      await waitFor(() => expect(result.current.state.phase).toBe('conflict'))
      expect(cache.getQueryData(statusKey())).toEqual(latest)
      expect(gets.map((c) => client.getUri(c)).sort()).toEqual(
        [accepted.statusUrl, base + '/lessons?date=' + effectiveFrom].sort(),
      )
      rerender(term)
      await expect(result.current.publish(selection)).rejects.toThrow('후보')
      expect(posts.map((p) => JSON.parse(p.data))).toEqual([request])
    },
  )

  it('409 후 재선택은 명시적인 게시로만 이어지고 currentRev를 요청에 덮어쓰지 않는다', async () => {
    respondPost = (cfg) => rejectHttp(409, { code: 'DATED_CHANGES_EXIST', currentRev: 9 }, cfg)
    const { result } = mount()
    await act(async () => {
      await result.current.publish(selection)
    })
    expect(posts).toHaveLength(1)
    respondPost = () => receipt
    await act(async () => {
      await result.current.publish({ candidateId: firstId, effectiveFrom: '2026-12-02' })
    })
    expect(posts.map((p) => JSON.parse(p.data))).toEqual([
      request,
      { ...request, effectiveFrom: '2026-12-02', candidateId: firstId },
    ])
  })

  it.each([201, 409])('게시 HTTP %i와 후속 조회 실패를 구분한다', async (code) => {
    if (code === 409) respondPost = (cfg) => rejectHttp(409, { code: 'STALE_INPUT' }, cfg)
    readLessons = () => {
      throw new Error('날짜 수업 조회 실패')
    }
    const { result } = mount()
    await act(async () => {
      const outcome = await result.current.publish(selection)
      expect(outcome.phase).toBe(code === 201 ? 'published' : 'conflict')
      expect(outcome.refresh.lessons).toBeUndefined()
      expect(outcome.refresh.failures).toMatchObject([{ source: 'lessons' }])
      if (outcome.phase === 'published') expect(outcome.receipt).toEqual(receipt)
      else expect(outcome.refresh.job).toEqual(ready)
    })
    expect(posts).toHaveLength(1)
  })

  it.each([
    ['TEACHER', 'HIRED'],
    ['STUDENT', 'HIRED'],
    ['ADMIN', 'ON_LEAVE'],
  ])('%s/%s 권한에서는 POST 0건', async (position, employmentStatus) => {
    cache.setQueryData(queryKeys.home.active(identity()), { ...admin, position, employmentStatus })
    const { result } = mount()
    await expect(result.current.publish(selection)).rejects.toThrow()
    expect(posts).toHaveLength(0)
  })

  it('잘못된 날짜·후보·교체된 작업·준비 중인 작업은 게시하지 않는다', async () => {
    const { result } = mount()
    const publish = result.current.publish
    await expect(publish({ ...selection, effectiveFrom: '2026-02-30' })).rejects.toThrow('적용일')
    await expect(publish({ ...selection, candidateId: '1' })).rejects.toThrow('후보')
    cache.setQueryData(statusKey(), { ...ready, state: 'RUNNING', result: null })
    await expect(publish(selection)).rejects.toThrow('후보')
    cache.setQueryData(statusKey(), ready)
    cache.setQueryData(queryKeys.schedule.generationAccepted(term.termId, scope()), {
      ...accepted,
      jobId: 'different',
    })
    await expect(publish(selection)).rejects.toThrow('후보')
    expect(posts).toHaveLength(0)
  })

  it('게시 전에 시작한 날짜 조회의 늦은 응답은 새 버전의 수업을 덮어쓰지 않는다', async () => {
    let finish!: (value: unknown) => void
    let oldSignal!: AbortSignal
    const key = dayKey(effectiveFrom)
    const oldRead = cache
      .fetchQuery({
        queryKey: key,
        queryFn: ({ signal }) => {
          oldSignal = signal
          return new Promise((done) => {
            finish = done
          })
        },
      })
      .catch((error) => error)
    const { result } = mount()
    await act(async () => {
      await result.current.publish(selection)
    })
    expect(oldSignal.aborted).toBe(true)
    finish([{ ...lesson, versionId: 82 }])
    await oldRead
    expect(cache.getQueryData(key)).toEqual([lesson])
  })

  it('충돌 복구 중 로그아웃하면 해당 세션의 재조회를 취소하고 충돌 결과를 숨긴다', async () => {
    respondPost = (cfg) => rejectHttp(409, { code: 'STALE_INPUT' }, cfg)
    let finish!: (value: unknown) => void
    readJob = () =>
      new Promise((done) => {
        finish = done
      })
    const { result } = mount()
    let outcome!: Promise<unknown>
    await act(async () => {
      outcome = result.current.publish(selection).catch((error) => error)
    })
    expect(gets).toHaveLength(2)
    act(clearTokens)
    expect(gets.find((req) => req.url === accepted.statusUrl)?.signal?.aborted).toBe(true)
    await act(async () => {
      finish(ready)
      await outcome
    })
    expect(result.current.state).toEqual({ phase: 'idle' })
    expect(posts).toHaveLength(1)
    expect(gets).toHaveLength(2)
  })

  it('서버 403과 잘못된 성공 코드는 게시 성공으로 처리하지 않는다', async () => {
    const { result } = mount()
    respondPost = (cfg) => rejectHttp(403, { error: 'FORBIDDEN' }, cfg)
    await act(async () => {
      await expect(result.current.publish(selection)).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
    postStatus = 200
    respondPost = () => receipt
    await act(async () => {
      await expect(result.current.publish(selection)).rejects.toThrow('영수증')
    })
    expect(gets).toHaveLength(0)
  })

  it('같은 학기의 중복 클릭을 막고 학기 전환 후 늦은 결과는 숨긴다', async () => {
    let finish!: (value: unknown) => void
    respondPost = () =>
      new Promise((done) => {
        finish = done
      })
    const first = mount()
    const second = mount()
    let outcome!: Promise<unknown>
    await act(async () => {
      outcome = first.result.current.publish(selection).catch((e) => e)
      await expect(second.result.current.publish(selection)).rejects.toThrow('처리 중')
    })
    expect(posts).toHaveLength(1)
    const oldPublish = first.result.current.publish
    first.rerender({ ...term, termId: 547002 })
    await expect(oldPublish(selection)).rejects.toThrow()
    expect(posts[0].signal?.aborted).toBe(true)
    await act(async () => {
      finish(receipt)
      await outcome
    })
    expect(first.result.current.state).toEqual({ phase: 'idle' })
    expect(gets).toHaveLength(0)
  })
})
