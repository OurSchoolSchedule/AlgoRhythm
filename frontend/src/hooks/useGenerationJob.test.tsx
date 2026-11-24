// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import client from '@/api/client.js'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage.js'
import { getGenerationStatus } from '@/api/generationJobs'
import type { GenerationJob, GenerationRequest } from '@/types/generationJob'
import demoJson from '@/test/fixtures/school42/generate_request.json?raw'
import { queryKeys } from './queryKeys.js'
import { useGenerationJob } from './useGenerationJob'

const term = { schoolId: 540001, termId: 547001 }
const admin = {
  schoolId: term.schoolId,
  position: 'ADMIN',
  employmentStatus: 'HIRED',
}
const base = '/api/v2/terms/547001/generations'
const jobId = '7eb15cc6-193f-4519-9704-50035ae28371'
const accepted = {
  state: 'QUEUED' as const,
  jobId,
  expectedPublishRev: 0,
  statusUrl: `${base}/${jobId}`,
}
const minimal = { validatedLoadId: '375d0754-c375-42c6-b1f0-f630a9693e37' }
const oldAdapter = client.defaults.adapter
let cache: QueryClient
let posts: InternalAxiosRequestConfig[]
let gets: InternalAxiosRequestConfig[]
let postBody: () => unknown
let getBody: (config: InternalAxiosRequestConfig) => unknown
let postStatus: number

const poll = (state: GenerationJob['state']) => ({
  jobId,
  expectedPublishRev: 0,
  state,
  result: null,
})
function ready(count: number) {
  const candidates = Array.from({ length: count }, (_, index) => ({
    candidateId: `00c${index}`,
    score: {
      wantsMet: 1,
      wantsTotal: 2,
      teachersWithNoWantMet: 1,
      avoidsMet: 1,
      avoidsTotal: 1,
    },
    placements: [
      {
        teacherId: '0010',
        classId: '0030',
        subjectId: '0020',
        slot: { day: 'MON', period: 2 },
      },
    ],
  }))
  return {
    ...poll('READY'),
    result: {
      jobId,
      expectedPublishRev: 0,
      validatedLoadId: minimal.validatedLoadId,
      status: 'READY',
      stopReason: 'TIME_LIMIT',
      detail: null,
      elapsedMs: 45,
      candidates,
    },
  }
}
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
}
function mount(initialProps: typeof term | null = term) {
  return renderHook(useGenerationJob, {
    initialProps,
    wrapper,
  })
}
type Handle = ReturnType<typeof mount>['result']

function setSchool(school: typeof admin) {
  cache.setQueryData(
    queryKeys.home.active({ userId: 541000, generation: getSessionVersion() }),
    school,
  )
}
async function tick(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
  // Query notifications from the React commit are scheduled on the next turn.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
}
async function start(result: Handle, request: GenerationRequest = minimal) {
  await act(async () => {
    await result.current.start(request)
  })
  await tick()
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function httpError(status: number, data: unknown, config: InternalAxiosRequestConfig) {
  return new AxiosError('HTTP ' + status, undefined, config, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  setTokens({ accessToken: 'local-test', userId: 541000 })
  setSchool(admin)
  posts = []
  gets = []
  postBody = () => accepted
  postStatus = 202
  getBody = () => poll('QUEUED')
  client.defaults.adapter = async (config) => {
    if (config.url === '/api/mypage/active-school')
      throw new Error('Unexpected active school lookup')
    const isPost = config.method === 'post'
    const requests = isPost ? posts : gets
    requests.push(config)
    const data = await (isPost ? postBody() : getBody(config))
    return {
      status: isPost ? postStatus : 200,
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
  clearTokens()
  client.defaults.adapter = oldAdapter
  vi.useRealTimers()
})

describe('비동기 편성 작업', () => {
  it.each([1, 4])('School42 요청의 202 → QUEUED → RUNNING → READY(후보 %i개)', async (count) => {
    const response = ready(count)
    getBody = () => [poll('QUEUED'), poll('RUNNING'), response][gets.length - 1]
    const demo: GenerationRequest = JSON.parse(demoJson)
    const request = { ...demo, ...minimal }
    const { result } = mount()
    expect(result.current.canStart).toBe(true)
    await start(result, request)
    expect(posts.map((x) => client.getUri(x))).toEqual([base])
    expect(JSON.parse(posts[0].data)).toEqual(request)
    expect(request.preferences?.map((p) => p.kind)).toEqual(['WANT', 'WANT', 'AVOID'])
    expect(request.teachingSlots).toHaveLength(32)
    expect(result.current.accepted).toEqual(accepted)
    expect(result.current.job?.state).toBe('QUEUED')
    expect(result.current.progress).toEqual({ phase: 'queued', jobId })
    expect(result.current.canStart).toBe(false)
    await tick(1900)
    expect(gets).toHaveLength(1)
    await tick(100)
    expect(result.current.progress).toEqual({ phase: 'running', jobId })
    await tick(1900)
    expect(gets).toHaveLength(2)
    await tick(100)
    expect(result.current.progress).toEqual({
      phase: 'finished',
      outcome: 'READY',
      jobId,
    })
    expect(result.current.candidates).toEqual(response.result.candidates)
    expect(result.current.canStart).toBe(true)
    await tick(12_000)
    expect(gets.map((x) => client.getUri(x))).toEqual(Array(3).fill(accepted.statusUrl))
    expect([...posts, ...gets].every((x) => x.headers.Authorization === 'Bearer local-test')).toBe(
      true,
    )
  })

  it.each(['INFEASIBLE', 'TIME_LIMIT_NO_SOLUTION', 'FAILED'] as const)(
    '%s에서도 폴링이 끝난다',
    async (state) => {
      getBody = () => (gets.length === 1 ? poll('RUNNING') : poll(state))
      const { result } = mount()
      await start(result)
      expect(JSON.parse(posts[0].data)).toEqual(minimal)
      await tick(2000)
      expect(result.current.progress).toEqual({
        phase: 'finished',
        outcome: state,
        jobId,
      })
      expect(result.current.candidates).toEqual([])
      expect(result.current.canStart).toBe(true)
      await tick(15_000)
      expect(gets).toHaveLength(2)
    },
  )

  it('두 호출자가 동시에 눌러도 POST 한 번이고 접수 후에도 진행 중인 작업을 재접수하지 않는다', async () => {
    const first = mount()
    const second = mount()
    const pending = deferred<typeof accepted>()
    postBody = () => pending.promise
    let started!: Promise<unknown>
    await act(async () => {
      started = first.result.current.start(minimal)
      await expect(second.result.current.start(minimal)).rejects.toThrow('진행 중')
    })
    expect(posts).toHaveLength(1)
    await act(async () => {
      pending.resolve(accepted)
      await started
    })
    await tick()
    expect(second.result.current.accepted).toEqual(accepted)
    await expect(first.result.current.start(minimal)).rejects.toThrow('진행 중')
    expect(gets).toHaveLength(1)
    getBody = () => ready(1)
    await tick(2000)
    expect(first.result.current.canStart).toBe(true)
    const nextJobId = '64208dd6-93bc-4a8d-a5d3-cc071ac2cc94'
    postBody = () => ({ ...accepted, jobId: nextJobId, statusUrl: base + '/' + nextJobId })
    getBody = () => ({ ...poll('QUEUED'), jobId: nextJobId })
    await start(second.result)
    expect(posts).toHaveLength(2)
    expect(first.result.current.progress).toEqual({ phase: 'queued', jobId: nextJobId })
    expect(first.result.current.candidates).toEqual([])
  })

  it('같은 학기로 돌아오면 기존 작업을 이어서 조회하고 완료된 후보는 다시 폴링하지 않는다', async () => {
    const first = mount()
    await start(first.result)
    first.unmount()
    await tick(8_000)
    expect(gets).toHaveLength(1)
    getBody = () => ready(1)
    const second = mount()
    await tick()
    expect(second.result.current.candidates).toHaveLength(1)
    second.unmount()
    await tick(40_000)
    const third = mount()
    expect(third.result.current.job?.state).toBe('READY')
    await tick(10_000)
    expect(gets).toHaveLength(2)
    expect(posts).toHaveLength(1)
  })

  it.each([
    ['TEACHER', 'HIRED'],
    ['STUDENT', 'HIRED'],
    ['ADMIN', 'ON_LEAVE'],
  ])('%s/%s 권한은 POST와 GET 모두 차단한다', async (position, employmentStatus) => {
    setSchool({ ...admin, position, employmentStatus })
    const { result } = mount()
    expect(result.current.canStart).toBe(false)
    await expect(result.current.start(minimal)).rejects.toThrow()
    await expect(result.current.refetchStatus()).rejects.toThrow()
    await tick(10_000)
    expect([...posts, ...gets]).toHaveLength(0)
  })

  it('학기 미선택·타 학교 학기·권한 변경 직후의 이전 콜백은 요청을 보내지 않는다', async () => {
    const { rerender, result } = mount()
    await expect(result.current.start({ validatedLoadId: ' ' })).rejects.toThrow('검증')
    for (const selection of [null, { ...term, schoolId: 1 }]) {
      rerender(selection)
      await expect(result.current.start(minimal)).rejects.toThrow()
    }
    rerender(term)
    const previous = result.current.start
    await act(async () => {
      setSchool({ ...admin, position: 'TEACHER' })
      await expect(previous(minimal)).rejects.toThrow()
    })
    expect([...posts, ...gets]).toHaveLength(0)
  })

  it.each(['화면 이탈', '학기 변경', '학교 변경', '로그아웃'])(
    '%s 시 진행 중인 GET을 취소하고 추가 조회 0회',
    async (change) => {
      const pending = deferred<unknown>()
      getBody = () => (gets.length === 1 ? poll('QUEUED') : pending.promise)
      const { unmount, rerender, result } = mount()
      await start(result)
      await tick(2000)
      expect(gets).toHaveLength(2)
      const previous = result.current.refetchStatus
      if (change === '화면 이탈') unmount()
      if (change === '학기 변경') rerender({ ...term, termId: 547002 })
      if (change === '학교 변경') act(() => setSchool({ ...admin, schoolId: 540002 }))
      if (change === '로그아웃') act(clearTokens)
      await tick()
      expect(gets[1].signal?.aborted).toBe(true)
      await expect(previous()).rejects.toThrow()
      await act(async () => {
        pending.resolve(ready(4))
      })
      await tick(20_000)
      expect(gets).toHaveLength(2)
      if (change !== '화면 이탈') {
        expect(result.current.accepted).toBeUndefined()
        expect(result.current.candidates).toEqual([])
        expect(result.current.progress).toBeNull()
      }
    },
  )

  it('학기 전환 후 늦게 도착한 202로 이전 작업의 폴링을 시작하지 않는다', async () => {
    const pending = deferred<typeof accepted>()
    postBody = () => pending.promise
    const { result, rerender } = mount()
    let outcome!: Promise<unknown>
    await act(async () => {
      outcome = result.current.start(minimal).catch((error) => error)
    })
    expect(posts).toHaveLength(1)
    rerender({ ...term, termId: 547002 })
    expect(posts[0].signal?.aborted).toBe(true)
    await act(async () => {
      pending.resolve(accepted)
      await outcome
    })
    await tick(10_000)
    expect(gets).toHaveLength(0)
    expect(result.current.accepted).toBeUndefined()
  })

  it('서버 403·409 원문을 보존하고 자동으로 다시 접수하지 않는다', async () => {
    const { result } = mount()
    for (const status of [403, 409]) {
      const data =
        status === 409 ? { code: 'GENERATION_ACTIVE', activeJobId: jobId } : { error: 'FORBIDDEN' }
      postBody = () => {
        throw httpError(status, data, posts[posts.length - 1])
      }
      await act(async () => {
        await expect(result.current.start(minimal)).rejects.toMatchObject({
          response: { status, data },
        })
      })
      await tick(10_000)
      expect(result.current.submissionError).toMatchObject({
        response: { status, data },
      })
    }
    expect(posts).toHaveLength(2)
    expect(gets).toHaveLength(0)
  })

  it('조회 실패 후 명시적으로 같은 작업을 다시 읽을 수 있다', async () => {
    getBody = (config) => {
      throw httpError(503, {}, config)
    }
    const { result } = mount()
    await start(result)
    await tick(12_000)
    expect(result.current.statusError).toMatchObject({
      response: { status: 503 },
    })
    expect(result.current.canStart).toBe(false)
    expect(gets).toHaveLength(1)
    getBody = () => ready(1)
    await act(async () => {
      await result.current.refetchStatus()
    })
    await tick()
    expect(result.current.candidates).toHaveLength(1)
    await act(async () => {
      await result.current.refetchStatus()
    })
    await tick(12_000)
    expect(gets).toHaveLength(3)
    expect(posts).toHaveLength(1)
  })

  it.each([0, 5])('READY의 잘못된 후보 수 %i개는 조회 오류로 처리한다', async (count) => {
    getBody = () => ready(count)
    const { result } = mount()
    await start(result)
    expect(result.current.statusError).toBeInstanceOf(Error)
    expect(result.current.candidates).toEqual([])
    await tick(10_000)
    expect(gets).toHaveLength(1)
  })

  it('202 본문과 학기·작업을 검증한 뒤에만 공유 클라이언트로 조회한다', async () => {
    const { result } = mount()
    postStatus = 200
    await act(async () => {
      await expect(result.current.start(minimal)).rejects.toThrow('접수 응답')
    })
    postStatus = 202
    postBody = () => ({ ...accepted, statusUrl: '/api' + accepted.statusUrl })
    await act(async () => {
      await expect(result.current.start(minimal)).rejects.toThrow('조회 경로')
    })
    for (const statusUrl of [
      'https://example.org/jobs',
      accepted.statusUrl.replace('547001', '547002'),
      base + '/different',
    ]) {
      await expect(getGenerationStatus(term.termId, { ...accepted, statusUrl })).rejects.toThrow(
        '조회 경로',
      )
    }
    expect(gets).toHaveLength(0)
  })
})
