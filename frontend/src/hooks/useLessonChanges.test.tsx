// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import client from '@/api/client.js'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage.js'
import type { DatedLessonDto } from '@/types/datedLesson'
import type { LessonChange, NewLessonChange } from '@/types/lessonChange'
import { queryKeys } from './queryKeys.js'
import { useLessonChanges } from './useLessonChanges'

const term = { schoolId: 540001, termId: 547001 }
const base = '/api/v2/terms/547001'
const dayA = '2026-11-23'
const dayB = '2026-11-25'
const first: DatedLessonDto = {
  id: 51,
  rev: 0,
  termId: term.termId,
  versionId: 83,
  originId: 999,
  date: dayA,
  originDate: dayA,
  subjectId: 3,
  classId: 4,
  planned: { teacherId: 88, periodId: 21 },
  actual: { teacherId: 10, periodId: 21 },
}
const second = {
  ...first,
  id: 52,
  rev: 2,
  date: dayB,
  originDate: dayB,
  actual: { teacherId: 19, periodId: 25 },
}
const cover: LessonChange = {
  id: 101,
  termId: term.termId,
  kind: 'SUBSTITUTE',
  requester: 1,
  responder: 19,
  firstId: 51,
  firstRev: 0,
  secondId: null,
  secondRev: null,
  state: 'PENDING',
  rev: 0,
}
const swap: LessonChange = {
  ...cover,
  id: 102,
  kind: 'SWAP',
  requester: 10,
  secondId: 52,
  secondRev: 2,
}
const oldAdapter = client.defaults.adapter
let cache: QueryClient
let userId: number
let me: number
let list: LessonChange[]
let lessons: DatedLessonDto[]
let directory: boolean
let posts: InternalAxiosRequestConfig[]
let reads: InternalAxiosRequestConfig[]
let write: (cfg: InternalAxiosRequestConfig) => unknown
let lessonReadFails: boolean

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
}
function login(position: string, membership: number, employmentStatus = 'HIRED') {
  me = membership
  userId = membership + 500
  setTokens({ accessToken: 'local-test', userId })
  cache.setQueryData(queryKeys.home.active({ userId, generation: getSessionVersion() }), {
    schoolId: term.schoolId,
    position,
    employmentStatus,
  })
}
function mount() {
  return renderHook((value) => useLessonChanges(value, dayA, dayB), { initialProps: term, wrapper })
}
type Handle = ReturnType<typeof mount>['result']
async function loaded(result: Handle) {
  await waitFor(() => {
    expect(result.current.changes.state).toMatch(/ready|empty/)
    expect(result.current.lessons.state).toMatch(/ready|empty/)
    expect(result.current.secondLessons.state).toMatch(/ready|empty/)
    expect(result.current.directory.state).toMatch(/ready|empty/)
  })
}
function postError(status: number, data: unknown, cfg: InternalAxiosRequestConfig): never {
  throw new AxiosError(String(status), undefined, cfg, undefined, {
    status,
    statusText: '',
    data,
    config: cfg,
    headers: {},
  })
}
const accepted = (row: LessonChange): LessonChange => ({ ...row, state: 'ACCEPTED', rev: 1 })
const receipt = (id: number) => ({
  requestId: id,
  requestRev: 2,
  state: 'APPROVED',
  lessons: [{ ...first, rev: 1 }],
})
const bodies = () => posts.map((p) => JSON.parse(p.data))
const keys = () => posts.map((p) => String(p.headers['Idempotency-Key']))

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  list = []
  lessons = [first, second]
  directory = true
  posts = []
  reads = []
  lessonReadFails = false
  write = () => {
    throw new Error('Unexpected POST')
  }
  login('ADMIN', 1)
  client.defaults.adapter = async (cfg) => {
    let data: unknown
    let status = 200
    if (cfg.method === 'post') {
      posts.push(cfg)
      status = [base + '/lesson-changes', base + '/lesson-changes/substitutes'].includes(
        cfg.url ?? '',
      )
        ? 201
        : 200
      data = await write(cfg)
    } else {
      reads.push(cfg)
      switch (cfg.url) {
        case '/api/school/members':
        case '/api/school/teachers':
          data = directory ? [{ userId, schoolUserId: me, username: '교사' }] : []
          break
        case base + '/lesson-changes':
          data = list
          break
        case base + '/lessons':
          if (lessonReadFails) return postError(503, {}, cfg)
          data = lessons.filter((row) => row.date === cfg.params.date)
          break
        default:
          throw new Error('Unexpected GET ' + cfg.url)
      }
    }
    return { data, status, statusText: '', headers: {}, config: cfg }
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = oldAdapter
})

describe('날짜별 수업 변경', () => {
  it.each(['SUBSTITUTE', 'SWAP'] as const)(
    '%s 신청 → 지정 교사 수락 → 관리자 승인',
    async (kind) => {
      const isSwap = kind === 'SWAP'
      if (isSwap) login('TEACHER', first.actual.teacherId)
      const selected = isSwap ? swap : cover
      const after = isSwap
        ? [
            { ...first, date: dayB, rev: 1 },
            { ...second, date: dayA, rev: 3 },
          ]
        : [{ ...first, actual: { ...first.actual, teacherId: 19 }, rev: 1 }]
      write = (cfg) => {
        if (cfg.url === base + '/lesson-changes') {
          list = [selected]
          return selected
        }
        if (cfg.url?.endsWith('/response')) {
          list = [accepted(selected)]
          return list[0]
        }
        list = [{ ...selected, state: 'APPROVED', rev: 2 }]
        lessons = after
        return { ...receipt(selected.id), lessons: after }
      }
      const { result } = mount()
      await loaded(result)
      await act(async () => {
        const outcome = isSwap
          ? await result.current.requestSwap(first, second)
          : await result.current.requestSubstitute(first, 19)
        expect(outcome).toMatchObject({ phase: 'created', change: selected, refreshError: null })
      })
      const create: NewLessonChange = isSwap
        ? { kind, firstId: 51, firstRev: 0, secondId: 52, secondRev: 2 }
        : { kind, firstId: 51, firstRev: 0, substituteTeacherId: 19 }
      expect(bodies()).toEqual([create])
      act(() => login('TEACHER', 19))
      await loaded(result)
      expect(result.current.canRespond(selected)).toBe(true)
      await act(async () => {
        await result.current.respond(selected, true)
      })
      expect(posts[1].url).toBe(base + '/lesson-changes/' + selected.id + '/response')
      expect(bodies()[1]).toEqual({ accept: true, expectedRequestRev: 0 })
      act(() => login('ADMIN', 1))
      await loaded(result)
      const row = accepted(selected)
      expect(result.current.canApprove(row)).toBe(true)
      const send = result.current.prepareApproval(row)
      await act(async () => {
        const outcome = await send()
        expect(outcome).toMatchObject({
          phase: 'approved',
          receipt: { lessons: after },
          refreshError: null,
        })
      })
      expect(posts[2].url).toBe(base + '/lesson-changes/' + selected.id + '/approval')
      expect(bodies()[2]).toEqual({
        expectedRequestRev: 1,
        expectedLessonRev: 0,
        ...(isSwap ? { expectedSecondRev: 2 } : {}),
      })
      expect(posts.slice(0, 2).every((p) => !p.headers['Idempotency-Key'])).toBe(true)
      expect(keys()[2]).toMatch(/^[\da-f-]{36}$/)
      await waitFor(() =>
        expect(result.current.lessons).toMatchObject({
          data: after.filter((row) => row.date === dayA),
        }),
      )
    },
  )

  it('담당 교사가 한 번의 요청으로 두 공강 교사를 초대한다', async () => {
    login('TEACHER', first.actual.teacherId)
    const invitations = [cover, { ...cover, id: 105, responder: 25 }]
    write = () => {
      list = invitations
      return invitations
    }
    const { result } = mount()
    await loaded(result)
    await act(async () => {
      const outcome = await result.current.requestSubstitute(first, [19, 25])
      expect(outcome).toMatchObject({ phase: 'created', count: 2 })
    })
    expect(posts.map((p) => p.url)).toEqual([base + '/lesson-changes/substitutes'])
    expect(bodies()).toEqual([
      { firstId: first.id, firstRev: first.rev, substituteTeacherIds: [19, 25] },
    ])
  })

  it('지정 교사는 거절할 수 있고 거절한 신청은 승인할 수 없다', async () => {
    login('TEACHER', cover.responder)
    list = [cover]
    write = () => {
      list = [{ ...cover, state: 'REJECTED', rev: 1 }]
      return list[0]
    }
    const { result } = mount()
    await loaded(result)
    await act(async () => {
      await result.current.respond(cover, false)
    })
    expect(bodies()).toEqual([{ accept: false, expectedRequestRev: 0 }])
    act(() => login('ADMIN', 1))
    await loaded(result)
    expect(result.current.canApprove(list[0])).toBe(false)
    expect(() => result.current.prepareApproval(list[0])).toThrow()
  })

  it('교환은 첫 수업의 실제 담당자만 신청하고 응답은 지정된 schoolUserId만 허용한다', async () => {
    login('TEACHER', 11)
    const wrong = { ...swap, responder: userId }
    list = [wrong]
    const { result } = mount()
    await loaded(result)
    expect(result.current.canRespond(wrong)).toBe(false)
    await expect(result.current.respond(wrong, true)).rejects.toThrow('지정된')
    await expect(result.current.requestSwap(first, second)).rejects.toThrow('내가 담당')
    await expect(result.current.requestSubstitute(first, 19)).rejects.toThrow('내가 담당')
    expect(() => result.current.prepareApproval(accepted(wrong))).toThrow('관리자')
    expect(posts).toHaveLength(0)
  })

  it('교사 명부가 비어 있으면 계정 ID로 대신 응답하지 않는다', async () => {
    login('TEACHER', 19)
    directory = false
    list = [cover]
    const { result } = mount()
    await loaded(result)
    await expect(result.current.respond(cover, false)).rejects.toThrow('지정된')
    expect(posts).toHaveLength(0)
  })

  it('주간 원본 ID·다른 학기·이전 버전으로 신규 신청을 전송하지 않는다', async () => {
    const { result } = mount()
    await loaded(result)
    for (const invalid of [
      { ...first, id: first.originId },
      { ...first, termId: 7 },
      { ...first, rev: 8 },
    ]) {
      await expect(result.current.requestSubstitute(invalid, 19)).rejects.toThrow('날짜 수업')
    }
    await expect(result.current.requestSubstitute(first, first.actual.teacherId)).rejects.toThrow(
      '다른 보결',
    )
    await expect(result.current.requestSwap(first, second)).rejects.toThrow('교사만')
    expect(posts).toHaveLength(0)
  })

  it.each([
    ['STUDENT', 'HIRED'],
    ['TEACHER', 'ON_LEAVE'],
    ['ADMIN', 'RESIGNED'],
  ])('%s/%s는 조회와 변경 호출 0건', async (position, employment) => {
    login(position, 19, employment)
    const { result } = mount()
    expect(result.current.changes.state).toBe('disabled')
    await expect(result.current.requestSwap(first, second)).rejects.toThrow()
    expect(() => result.current.prepareApproval(accepted(cover))).toThrow()
    expect([...posts, ...reads]).toHaveLength(0)
  })

  it('승인 응답이 유실된 뒤 같은 동작을 재전송하면 키와 본문이 동일하다', async () => {
    list = [accepted(swap)]
    const { result } = mount()
    await loaded(result)
    const send = result.current.prepareApproval(list[0])
    write = (cfg) => {
      list = [{ ...swap, state: 'APPROVED', rev: 2 }]
      throw new AxiosError('connection lost', 'ERR_NETWORK', cfg)
    }
    await act(async () => {
      await expect(send()).rejects.toThrow('connection lost')
    })
    expect(posts).toHaveLength(1)
    await waitFor(() => expect(result.current.changes).toMatchObject({ data: list }))
    write = () => ({
      ...receipt(swap.id),
      lessons: [
        { ...first, rev: 1 },
        { ...second, rev: 3 },
      ],
    })
    await act(async () => {
      await send()
    })
    expect(keys()[1]).toBe(keys()[0])
    expect(bodies()[1]).toEqual(bodies()[0])
    await expect(send()).rejects.toThrow('새 동작')
    expect(posts).toHaveLength(2)
  })

  it('서로 다른 승인 동작은 본문이 같아도 새 키를 사용한다', async () => {
    list = [accepted(cover), accepted(swap)]
    const { result } = mount()
    await loaded(result)
    write = (cfg) => {
      throw new AxiosError('timeout', 'ECONNABORTED', cfg)
    }
    for (const row of [list[0], list[0], list[1]]) {
      const send = result.current.prepareApproval(row)
      await act(async () => {
        await expect(send()).rejects.toThrow('timeout')
      })
    }
    expect(bodies()[0]).toEqual(bodies()[1])
    expect(bodies()[2]).not.toEqual(bodies()[0])
    expect(new Set(keys()).size).toBe(3)
  })

  it('승인을 빠르게 두 번 보내도 한 건만 전송한다', async () => {
    list = [accepted(cover)]
    let finish!: (value: unknown) => void
    write = () =>
      new Promise((done) => {
        finish = done
      })
    const { result } = mount()
    await loaded(result)
    const send = result.current.prepareApproval(list[0])
    await act(async () => {
      const pending = send()
      await expect(send()).rejects.toThrow('처리 중')
      finish(receipt(cover.id))
      await pending
    })
    expect(posts).toHaveLength(1)
  })

  it.each(['STALE_LESSON', 'STALE_REQUEST', 'SLOT_CONFLICT', 'IDEMPOTENCY_KEY_REUSED'])(
    '승인 409 %s 후 두 날짜와 목록을 다시 읽고 자동 승인 0회',
    async (code) => {
      list = [accepted(swap)]
      const { result, rerender } = mount()
      await loaded(result)
      reads = []
      const send = result.current.prepareApproval(list[0])
      write = (cfg) => {
        list = [{ ...swap, rev: 2, state: 'APPROVED' }]
        lessons = [
          { ...first, rev: 3 },
          { ...second, rev: 8 },
        ]
        return postError(409, { code, currentRev: 3, message: '수업 대조 필요' }, cfg)
      }
      await act(async () => {
        expect(await send()).toEqual({
          phase: 'conflict',
          problem: { code, currentRev: 3, message: '수업 대조 필요' },
          refreshError: null,
        })
      })
      await waitFor(() => expect(result.current.changes).toMatchObject({ data: list }))
      expect(result.current.lessons).toMatchObject({ data: [lessons[0]] })
      expect(result.current.secondLessons).toMatchObject({ data: [lessons[1]] })
      expect(reads.map((cfg) => client.getUri(cfg)).sort()).toEqual(
        [
          base + '/lesson-changes',
          base + '/lessons?date=' + dayA,
          base + '/lessons?date=' + dayB,
        ].sort(),
      )
      rerender(term)
      await expect(send()).rejects.toThrow('새 동작')
      expect(bodies()).toEqual([
        { expectedRequestRev: 1, expectedLessonRev: 0, expectedSecondRev: 2 },
      ])
    },
  )

  it('응답 409 뒤 재조회가 실패해도 충돌을 보존하고 자동 응답을 보내지 않는다', async () => {
    login('TEACHER', 19)
    list = [cover]
    const { result } = mount()
    await loaded(result)
    write = (cfg) => {
      lessonReadFails = true
      return postError(409, { code: 'STALE_REQUEST' }, cfg)
    }
    await act(async () => {
      expect(await result.current.respond(cover, true)).toMatchObject({
        phase: 'conflict',
        problem: { code: 'STALE_REQUEST' },
        refreshError: { response: { status: 503 } },
      })
    })
    lessonReadFails = false
    list = [{ ...cover, state: 'REJECTED', rev: 2 }]
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.changes).toMatchObject({ data: list }))
    expect(posts).toHaveLength(1)
  })

  it('학기·학교·로그아웃 후에는 이전 승인 동작을 재사용할 수 없다', async () => {
    list = [accepted(cover)]
    const { result, rerender } = mount()
    await loaded(result)
    const old = result.current.prepareApproval(list[0])
    rerender({ ...term, termId: 77 })
    await expect(old()).rejects.toThrow()
    rerender(term)
    await loaded(result)
    const prevSchool = result.current.prepareApproval(list[0])
    act(() => {
      cache.setQueryData(queryKeys.home.active({ userId, generation: getSessionVersion() }), {
        schoolId: 777,
        position: 'ADMIN',
        employmentStatus: 'HIRED',
      })
    })
    await expect(prevSchool()).rejects.toThrow()
    act(clearTokens)
    await expect(prevSchool()).rejects.toThrow()
    expect(posts).toHaveLength(0)
  })

  it('서버 403을 보존하고 같은 동작을 자동으로 재시도하지 않는다', async () => {
    list = [accepted(cover)]
    write = (cfg) => postError(403, { error: 'FORBIDDEN' }, cfg)
    const { result } = mount()
    await loaded(result)
    await act(async () => {
      await expect(result.current.prepareApproval(list[0])()).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
    expect(posts).toHaveLength(1)
  })
})
