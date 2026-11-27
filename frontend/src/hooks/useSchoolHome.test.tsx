// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App.jsx'
import HomeView from '@/pages/home/HomeView.jsx'
import client from '@/api/client.js'
import { clearTokens, setTokens } from '@/api/tokenStorage.js'
import { useSchoolHome, type HomeSelection } from './useSchoolHome'
import { useUpdateActiveStore, useStaffProfile } from './useMypage.js'
import { useNotifications } from './useNotification.js'
import { useSchoolTimetable } from './useSchoolTimetable.js'
import { useTodos } from './useTodo.js'
import { useSubstituteRequests } from './useExtraShift.js'

const term = {
  schoolId: 540001, termId: 547001, academicYear: 2026, semester: 2,
  startDate: '2026-08-20', endDate: '2027-02-20',
}
const day = '2026-11-23'
const legacyMine = '/api/timetable/me/year/2026/semester/2'
const legacySchool = '/api/timetable/year/2026/semester/2'
const active = '/api/mypage/active-school'
const lessonsUrl = '/api/v2/terms/547001/lessons'
const room = { academicYear: 2026, grade: 1, classNumber: 6, classId: 544006 }
const teacher = {
  userId: 541004,
  schoolUserId: 542004,
  username: '최도현',
  subjects: [],
  homeroomClasses: [room],
}
const other = {
  ...teacher,
  userId: 541005,
  schoolUserId: 542005,
  username: '다른 교사',
  homeroomClasses: [],
}
const weeklyRow = {
  id: null,
  weeklyLessonId: 12,
  subjectId: 20,
  grade: room.grade,
  classNumber: room.classNumber,
  periodNumber: 2,
  periodSettingId: 32,
  dayOfWeek: 'MON',
  subjectName: '미술',
  teacherName: teacher.username,
  schoolId: term.schoolId,
  schoolClassId: room.classId,
  teacherId: teacher.schoolUserId,
}
const lesson = {
  id: 51,
  rev: 3,
  termId: term.termId,
  originId: 95,
  originDate: '2026-11-22',
  date: day,
  subjectId: 20,
  classId: room.classId,
  versionId: 83,
  planned: { teacherId: other.schoolUserId, periodId: 31 },
  actual: { teacherId: teacher.schoolUserId, periodId: 32 },
}
const originalAdapter = client.defaults.adapter
type Route = (config: InternalAxiosRequestConfig) => unknown
type WeekView = 'mine' | 'class' | 'school' | 'teacher'
let routes: Map<string, Route>
let weeks: Map<string, Route>
let personalTeacherId: number
let requests: InternalAxiosRequestConfig[]
let cache: QueryClient

function weekUrl(termId: number) {
  return `/api/v2/terms/${termId}/timetable-week`
}
function setWeekRows(view: WeekView, read: Route, termId = term.termId) {
  weeks.set(`${termId}/${view}`, read)
  routes.set(weekUrl(termId), async (config) => {
    const { view, date, teacherId, classId } = config.params
    const rows = weeks.get(`${termId}/${view}`)
    if (!rows) throw new Error('예상하지 않은 주간 조회 ' + view)
    const monday = new Date(date + 'T12:00:00Z')
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
    const days = Array.from({ length: 7 }, (_, offset) => {
      const current = new Date(monday)
      current.setUTCDate(current.getUTCDate() + offset)
      return {
        date: current.toISOString().slice(0, 10), inTerm: true, excluded: false, published: true,
        lastPeriod: offset < 5 ? 7 : 0, lastPeriodByGrade: {},
      }
    })
    return {
      termId, view, classId: classId ?? null,
      teacherId: view === 'mine' ? personalTeacherId : teacherId ?? null,
      weekStart: days[0].date, days, lessons: await rows(config),
    }
  })
}
function weekCalls(view: WeekView, termId = term.termId) {
  return getCalls(weekUrl(termId)).filter((req) => req.params.view === view)
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
}
function getCalls(url: string) {
  return requests.filter((request) => request.url === url)
}
function httpError(status: number): Route {
  return (config) => {
    throw new AxiosError('조회 실패', undefined, config, undefined, {
      status,
      statusText: '',
      config,
      headers: {},
      data: { success: false, error: 'FORBIDDEN' },
    })
  }
}
function activeSchool(position = 'TEACHER', schoolId = term.schoolId) {
  return { schoolId, position, employmentStatus: 'HIRED' }
}
function renderHome(initialProps: HomeSelection = { term, date: day }) {
  return renderHook((input: HomeSelection) => useSchoolHome(input), { wrapper, initialProps })
}

beforeEach(() => {
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 }, mutations: { retry: false } },
  })
  requests = []
  weeks = new Map()
  personalTeacherId = teacher.schoolUserId
  routes = new Map<string, Route>([
    [active, () => activeSchool()],
    ['/api/v2/terms', () => [{ ...term, startDate: '2026-08-20', endDate: '2027-02-20' }]],
    ['/api/mypage/teacher/profile', () => teacher],
    ['/api/mypage/admin/profile', () => teacher],
    ['/api/school/teachers', () => [teacher, other]],
    ['/api/school/members', () => [teacher, other]],
    ['/api/school/subjects', () => []],
    ['/api/school/classes', () => []],
    [
      '/api/school-setting/periods',
      () => [
        { id: 31, periodNumber: 1 },
        { id: 32, periodNumber: 2 },
      ],
    ],
    ['/api/notifications', () => []],
    [legacyMine, () => [{ ...weeklyRow, id: 12 }]],
    [legacySchool, () => [{ ...weeklyRow, id: 12 }]],
    [lessonsUrl, () => [lesson]],
  ])
  setWeekRows('mine', () => [weeklyRow])
  setWeekRows('class', () => [weeklyRow])
  setWeekRows('school', () => [weeklyRow])
  client.defaults.adapter = async (config) => {
    requests.push(config)
    const route = routes.get(config.url ?? '')
    if (!route) throw new Error('예상 밖의 호출 ' + config.url)
    return { status: 200, statusText: 'OK', headers: {}, config, data: await route(config) }
  }
  setTokens({ accessToken: 'test-token', userId: teacher.userId })
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = originalAdapter
})

describe('FE3 홈 조회', () => {
  it('기본 주간표와 날짜 수업을 각각 조회하고 승인 후 실제 교사·교시를 표시한다', async () => {
    routes.set(lessonsUrl, () => [
      lesson,
      { ...lesson, id: 52, planned: lesson.actual, actual: lesson.planned },
    ])
    const { result, rerender } = renderHome()
    await waitFor(() => expect(result.current.dated.state).toBe('ready'))
    expect(result.current.dated.data).toEqual([
      expect.objectContaining({
        lessonId: 51,
        rev: 3,
        originId: 95,
        date: day,
        originDate: '2026-11-22',
        planned: { ...lesson.planned, teacherName: other.username, periodNumber: 1 },
        actual: { ...lesson.actual, teacherName: teacher.username, periodNumber: 2 },
      }),
    ])
    expect(result.current.slotLessons.data?.map((row) => row.lessonId)).toEqual([51, 52])
    expect(result.current.weekly.data?.[0].weeklyLessonId).toBe(12)
    expect(weekCalls('mine')[0].params).toMatchObject({ view: 'mine', date: day })
    expect(getCalls(legacyMine)).toHaveLength(0)
    expect(getCalls(lessonsUrl)[0].params).toEqual({ date: day })
    expect(getCalls('/api/school/classes')[0].params).toEqual({ academicYear: 2026 })
    expect(getCalls(lessonsUrl)[0].headers.Authorization).toBe('Bearer test-token')
    expect(getCalls('/api/school/members')).toHaveLength(0)
    expect(result.current.profile.name).toEqual({ state: 'value', value: teacher.username })
    expect(result.current.canSwitchHomeroom).toBe(true)
    setWeekRows('class', () => [weeklyRow])
    rerender({ term, date: day, classId: room.classId })
    await waitFor(() => expect(result.current.selection.view).toBe('homeroom'))
    await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
    expect(result.current.weekly.data?.map((row) => row.weeklyLessonId)).toEqual([12])
    await waitFor(() => expect(result.current.dated.data).toHaveLength(2))
    expect(weekCalls('class')).toHaveLength(1)
    expect(weekCalls('class')[0].params).toMatchObject({ date: day, classId: room.classId })
    rerender({ term, date: '2026-11-24', classId: room.classId })
    await waitFor(() => expect(result.current.dated.state).toBe('empty'))
    expect(getCalls(lessonsUrl).at(-1)?.params.date).toBe('2026-11-24')
  })

  it.each(['pending', 'empty', 'missing', 'failed', 'forbidden'])(
    '담임 명부 %s이면 학급 주간표 호출이 0건이다',
    async (state) => {
      const pending = deferred<unknown>()
      const reads: Record<string, Route> = {
        pending: () => pending.promise,
        empty: () => [{ ...teacher, homeroomClasses: [] }],
        missing: () => [other],
        failed: httpError(500),
        forbidden: httpError(403),
      }
      routes.set('/api/school/teachers', reads[state])
      const { result } = renderHome({ term, date: day, classId: room.classId })
      await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
      const expected: Record<string, string> = {
        pending: 'pending',
        empty: 'empty',
        missing: 'unconfirmed',
        failed: 'error',
        forbidden: 'forbidden',
      }
      expect(result.current.profile.homerooms.state).toBe(expected[state])
      expect(result.current.canSwitchHomeroom).toBe(false)
      expect(result.current.selection.view).toBe('mine')
      expect(weekCalls('class')).toHaveLength(0)
      pending.resolve([])
    },
  )

  it.each(['STUDENT', 'FUTURE_ROLE'])(
    '%s는 활성 학교만 조회한다. 기존 홈의 훅도 교사 API를 보내지 않는다',
    async (position) => {
      routes.set(active, () => activeSchool(position))
      const { result } = renderHook(
        () => {
          const home = useSchoolHome({ term, date: day, classId: room.classId })
          useSchoolTimetable()
          useNotifications()
          useStaffProfile()
          useTodos(day)
          useSubstituteRequests()
          return home
        },
        { wrapper },
      )
      await waitFor(() => expect(result.current.activeSchool.state).toBe('ready'))
      expect(result.current.weekly.state).toBe('disabled')
      expect(result.current.dated.state).toBe('disabled')
      expect(requests.map((r) => r.url)).toEqual([active])
    },
  )

  it('학생 계정으로 기존 홈과 헤더를 함께 열어도 활성 학교 외 요청은 없다', async () => {
    routes.set(active, () => activeSchool('STUDENT'))
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }))
    try {
      render(<App />, { wrapper })
      await waitFor(() =>
        expect(
          cache.getQueryCache().find({ queryKey: ['mypage', 'active-store'], exact: false })?.state
            .status,
        ).toBe('success'),
      )
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      expect(requests.map((r) => r.url)).toEqual([active])
    } finally {
      cleanup()
      vi.unstubAllGlobals()
    }
  })

  it('알림센터와 홈이 하나의 GET을 공유하고 홈 모델은 nullable 학교 이름을 보존한다', async () => {
    routes.set('/api/notifications', () => [
      {
        id: 42,
        schoolName: null,
        type: 'SUBSTITUTE_REQUEST_INVITE',
        category: 'SUBSTITUTE',
        read: true,
        message: '보결 요청',
        createdAt: '2026-11-23T08:00:00',
        timetableSwapRequestId: null,
        substituteRequestId: 5,
        substituteResponseId: null,
      },
    ])
    const { result } = renderHook(
      () => ({ home: useSchoolHome({ term, date: day }), legacy: useNotifications() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.home.notifications.items.state).toBe('value'))
    expect(result.current.home.notifications.items).toMatchObject({
      value: [{ id: 42, group: 'substitute', schoolName: null, read: true }],
    })
    expect(result.current.legacy.data).toMatchObject([{ id: 42, isRead: true, storeName: '' }])
    expect(getCalls('/api/notifications')).toHaveLength(1)
  })

  it('활성 학교 403이면 하위 조회를 시작하지 않는다', async () => {
    routes.set(active, httpError(403))
    const { result } = renderHome()
    await waitFor(() => expect(result.current.activeSchool.state).toBe('forbidden'))
    expect(result.current.weekly.state).toBe('disabled')
    expect(requests.map((r) => r.url)).toEqual([active])
  })

  it('관리자는 전체 명부와 학교 주간표를 쓰고 알림 500에도 시간표를 유지한다', async () => {
    routes.set(active, () => activeSchool('ADMIN'))
    routes.set('/api/notifications', httpError(500))
    const { result } = renderHome()
    await waitFor(() => expect(result.current.notifications.items.state).toBe('error'))
    await waitFor(() => expect(result.current.dated.state).toBe('ready'))
    expect(result.current.weekly.state).toBe('ready')
    expect(result.current.canSwitchHomeroom).toBe(false)
    expect(weekCalls('mine')).toHaveLength(0)
    expect(getCalls('/api/school/teachers')).toHaveLength(0)
    expect(getCalls('/api/school/members')).toHaveLength(1)
  })

  it('최초 로딩·빈 목록·배경 갱신을 구분하고 403을 받으면 캐시된 수업도 숨긴다', async () => {
    const first = deferred<unknown>()
    setWeekRows('mine', () => first.promise)
    const { result } = renderHome()
    await waitFor(() => expect(result.current.weekly.state).toBe('loading'))
    first.resolve([])
    await waitFor(() => expect(result.current.weekly.state).toBe('empty'))
    const next = deferred<unknown>()
    setWeekRows('mine', () => next.promise)
    act(() => {
      void cache.invalidateQueries({ queryKey: ['timetable'] })
    })
    await waitFor(() =>
      expect(result.current.weekly).toMatchObject({ state: 'empty', refreshing: true, data: [] }),
    )
    next.resolve([weeklyRow])
    await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
    setWeekRows('mine', httpError(403))
    await act(() => cache.invalidateQueries({ queryKey: ['timetable'] }))
    await waitFor(() => expect(result.current.weekly.state).toBe('forbidden'))
    expect(result.current.weekly.data).toBeUndefined()
    expect(result.current.dated.state).toBe('ready')
  })

  it('학교 전환 중 이전 표를 숨기고 이전 학기 입력·지연 응답을 새 학교에 노출하지 않는다', async () => {
    const schoolB = term.schoolId + 1
    const termB = { ...term, schoolId: schoolB, termId: term.termId + 1 }
    const patch = deferred<unknown>()
    const late = deferred<unknown>()
    routes.set(active + '/' + schoolB, () => patch.promise)
    const observed: (number | undefined)[] = []
    const { result, rerender } = renderHook(
      (input: HomeSelection) => {
        const home = useSchoolHome(input)
        const change = useUpdateActiveStore()
        if (home.activeSchool.data?.schoolId === schoolB)
          observed.push(home.weekly.data?.[0]?.schoolId)
        return { home, change }
      },
      { wrapper, initialProps: { term, date: day } },
    )
    await waitFor(() => expect(result.current.home.weekly.state).toBe('ready'))
    const initialReads = weekCalls('mine').length
    setWeekRows('mine', () => late.promise)
    act(() => {
      void cache.invalidateQueries({ queryKey: ['timetable'] })
    })
    await waitFor(() => expect(weekCalls('mine')).toHaveLength(initialReads + 1))
    const previous = weekCalls('mine').at(-1)!
    act(() => result.current.change.mutate(schoolB))
    await waitFor(() => expect(result.current.home.weekly.state).toBe('disabled'))
    expect(result.current.home.weekly.data).toBeUndefined()
    expect(previous.signal?.aborted).toBe(true)
    routes.set(active, () => activeSchool('TEACHER', schoolB))
    setWeekRows('mine', () => [{ ...weeklyRow, weeklyLessonId: 22, schoolId: schoolB }], termB.termId)
    routes.set('/api/v2/terms/' + termB.termId + '/lessons', () => [])
    patch.resolve(activeSchool('TEACHER', schoolB))
    await waitFor(() => expect(result.current.home.activeSchool.data?.schoolId).toBe(schoolB))
    expect(result.current.home.weekly.state).toBe('disabled')
    rerender({ term: termB, date: day })
    await waitFor(() => expect(result.current.home.weekly.data?.[0]?.weeklyLessonId).toBe(22))
    await act(async () => {
      late.resolve([weeklyRow])
      await late.promise
    })
    expect(result.current.home.weekly.data?.[0]?.schoolId).toBe(schoolB)
    expect(observed).not.toContain(term.schoolId)
  })

  it('같은 로그인 계정의 편성 교사 연결이 변경되면 이전 개인 시간표를 재사용하지 않는다', async () => {
    const { result } = renderHome()
    await waitFor(() => expect(result.current.weekly.data?.[0]?.teacherId).toBe(teacher.schoolUserId))
    const updatedTeacher = { ...teacher, schoolUserId: 545900 }
    const next = deferred<unknown[]>()
    personalTeacherId = updatedTeacher.schoolUserId
    setWeekRows('mine', () => next.promise)
    routes.set('/api/school/teachers', () => [updatedTeacher, other])
    await act(() => cache.invalidateQueries({ queryKey: ['store', 'directory'] }))
    await waitFor(() => expect(result.current.profile.schoolUserId).toEqual({
      state: 'value', value: updatedTeacher.schoolUserId,
    }))
    expect(result.current.weekly.data).toBeUndefined()
    next.resolve([{ ...weeklyRow, teacherId: updatedTeacher.schoolUserId }])
    await waitFor(() => expect(result.current.weekly.data?.[0]?.teacherId).toBe(updatedTeacher.schoolUserId))
  })

  it('교사의 연속 학급 선택에서 이전 요청을 취소하고 늦게 도착한 반을 표에 섞지 않는다', async () => {
    const firstRoom = { id: room.classId, grade: 1, classNumber: 6, academicYear: term.academicYear }
    const secondRoom = { ...firstRoom, id: 544007, classNumber: 7 }
    routes.set('/api/school/classes', () => [firstRoom, secondRoom])
    const delayed = deferred<unknown[]>()
    setWeekRows('class', (req) => req.params.classId === firstRoom.id
      ? delayed.promise
      : [{ ...weeklyRow, schoolClassId: secondRoom.id, subjectName: '다음 선택' }])
    const { result, rerender } = renderHome({ term, date: day, grade: 1, view: 'class', classId: firstRoom.id })
    await waitFor(() => expect(weekCalls('class')).toHaveLength(1))
    const previous = weekCalls('class')[0]
    rerender({ term, date: day, grade: 1, view: 'class', classId: secondRoom.id })
    await waitFor(() => expect(result.current.weekly.data?.[0]?.subjectName).toBe('다음 선택'))
    expect(previous.signal?.aborted).toBe(true)
    await act(async () => {
      delayed.resolve([{ ...weeklyRow, subjectName: '취소한 이전 반' }])
      await delayed.promise
    })
    expect(result.current.weekly.data?.map((row) => row.schoolClassId)).toEqual([secondRoom.id])
    expect(weekCalls('class').map((request) => request.params.classId)).toEqual([firstRoom.id, secondRoom.id])
  })

  it('담임 변경 후 새 실제 담당 학급만 읽고, 미배정이 되면 기존 주간표를 숨긴다', async () => {
    const nextRoom = { ...room, classId: room.classId + 1, classNumber: 7 }
    const directory = '/api/school/teachers'
    setWeekRows('class', ({ params }) => [{ ...weeklyRow, schoolClassId: params.classId }])
    const { result } = renderHome({ view: 'homeroom', term, date: day })
    await waitFor(() => expect(result.current.weekly.data?.[0]?.schoolClassId).toBe(room.classId))
    const assign = (homeroomClasses: typeof room[]) => {
      routes.set(directory, () => [{ ...teacher, homeroomAssignmentTermId: term.termId, homeroomClasses }, other])
      return act(() => cache.invalidateQueries({ queryKey: ['store', 'directory'] }))
    }
    await assign([nextRoom])
    await waitFor(() => expect(result.current.weekly.data?.[0]?.schoolClassId).toBe(nextRoom.classId))
    await assign([])
    await waitFor(() => expect(result.current.weekly.data).toBeUndefined())
    expect(result.current.selection.view).toBe('homeroom')
    expect(weekCalls('class').map((req) => req.params.classId)).toEqual([room.classId, nextRoom.classId])
  })

  it('학기 밖 날짜는 선택한 학기의 다른 날짜 수업으로 대신 조회하지 않는다', async () => {
    const { result } = renderHome({ term, date: '2026-07-10' })
    await waitFor(() => expect(result.current.activeSchool.state).toBe('ready'))
    expect(result.current.inRange).toBe(false)
    expect(result.current.weekly.data).toBeUndefined()
    expect(result.current.dated.data).toBeUndefined()
    expect(getCalls(weekUrl(term.termId))).toHaveLength(0)
    expect(getCalls(lessonsUrl)).toHaveLength(0)
  })

  it('학교 변경 응답이 유실되면 활성 학교를 다시 확인한 뒤 학기 조회를 재개한다', async () => {
    const schoolB = term.schoolId + 1
    routes.set(active + '/' + schoolB, (config) => {
      routes.set(active, () => activeSchool('TEACHER', schoolB))
      return httpError(503)(config)
    })
    const { result } = renderHook(
      () => ({
        home: useSchoolHome({ term, date: day }),
        change: useUpdateActiveStore(),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.home.weekly.state).toBe('ready'))
    act(() => result.current.change.mutate(schoolB))
    await waitFor(() => expect(result.current.home.activeSchool.data?.schoolId).toBe(schoolB))
    expect(getCalls(active)).toHaveLength(2)
    expect(result.current.home.weekly.data).toBeUndefined()
  })

  it('다른 탭의 학교 전환 알림을 받으면 현재 학기와 이전 학교 캐시를 분리한다', async () => {
    const { result } = renderHome()
    await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
    const schoolB = term.schoolId + 1
    routes.set(active, () => activeSchool('TEACHER', schoolB))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'activeSchoolChanged', storageArea: localStorage }),
      )
    })
    await waitFor(() => expect(result.current.activeSchool.data?.schoolId).toBe(schoolB))
    expect(result.current.weekly.state).toBe('disabled')
    expect(result.current.weekly.data).toBeUndefined()
  })

  it('로그아웃과 재로그인 후 새 계정이 이전 계정의 표나 지연 알림을 받지 않는다', async () => {
    const late = deferred<unknown>()
    routes.set('/api/notifications', () => late.promise)
    const { result } = renderHome()
    await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
    const oldRequest = getCalls('/api/notifications')[0]
    act(clearTokens)
    await waitFor(() => expect(result.current.weekly.state).toBe('disabled'))
    expect(result.current.weekly.data).toBeUndefined()
    expect(oldRequest.signal?.aborted).toBe(true)
    setWeekRows('mine', () => [])
    routes.set('/api/notifications', () => [])
    act(() => setTokens({ accessToken: 'next-user-token', userId: other.userId }))
    await waitFor(() => expect(result.current.weekly.state).toBe('empty'))
    await act(async () => {
      late.resolve([{ id: 99 }])
      await late.promise
    })
    expect(result.current.notifications.items.state).toBe('empty')
    expect(getCalls(active)).toHaveLength(2)
  })
})

describe('FE9 업무 홈', () => {
  const displayRow = {
    ...weeklyRow,
    dayOfWeek: 'MON',
    periodNumber: 1,
    subjectName: '미술',
    teacherName: teacher.username,
  }

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
    // Fix the school date while leaving React Query's real timers running.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-23T00:00:00+09:00'))
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('등록 학기가 없는 기존 교사는 기본표와 확인된 담임을 조회하고 알림 실패에도 선택한 수업을 읽는다', async () => {
    routes.set('/api/v2/terms', () => [])
    routes.set(legacyMine, () => [{ ...displayRow, id: 12 }])
    routes.set('/api/notifications', httpError(500))
    const ui = render(<HomeView navigate={vi.fn()} onLogout={vi.fn()} />, { wrapper })
    // The home waits for the active school, roster and weekly lessons in sequence.
    const cell = await ui.findByLabelText('월요일 1교시 · 미술', { selector: 'button' }, { timeout: 3000 })
    fireEvent.click(cell)
    expect(cell.getAttribute('aria-pressed')).toBe('true')
    expect(cell.closest('td')?.getAttribute('data-today')).toBe('true')
    expect(ui.getByRole('radio', { name: '담임' })).toBeTruthy()
    await waitFor(() =>
      expect(
        within(ui.getByRole('region', { name: '최근 알림' })).getByText('조회 실패'),
      ).toBeTruthy(),
    )
    routes.set('/api/notifications', () => [])
    fireEvent.click(ui.getByRole('button', { name: '알림 다시 시도' }))
    await ui.findByText('받은 알림이 없습니다.')
    expect(cell.getAttribute('aria-pressed')).toBe('true')
    expect(getCalls(lessonsUrl)).toHaveLength(0)
    expect(ui.queryByRole('button', { name: '시간표 생성' })).toBeNull()
  })

  it('학교 전환 중 지연된 학기 목록은 취소하고 새 학교의 날짜 수업만 요청한다', async () => {
    const old = deferred<unknown[]>()
    routes.set('/api/v2/terms', () => old.promise)
    routes.set(active, () => activeSchool('ADMIN'))
    const ui = render(<HomeView navigate={vi.fn()} onLogout={vi.fn()} />, { wrapper })
    await waitFor(() => expect(getCalls('/api/v2/terms')).toHaveLength(1))
    const pending = getCalls('/api/v2/terms')[0]
    const nextTerm = { ...term, schoolId: term.schoolId + 1, termId: 77, startDate: day, endDate: '2026-12-31' }
    routes.set(active, () => activeSchool('ADMIN', nextTerm.schoolId))
    routes.set('/api/v2/terms', () => [nextTerm])
    routes.set('/api/v2/terms/77/lessons', () => [])
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'activeSchoolChanged', storageArea: localStorage })))
    await waitFor(() => expect(getCalls('/api/v2/terms/77/lessons')).toHaveLength(1))
    expect(pending.signal?.aborted).toBe(true)
    await act(async () => old.resolve([{ ...term, startDate: day, endDate: '2026-12-31' }]))
    expect(getCalls(lessonsUrl)).toHaveLength(0)
    expect(ui.getByRole('button', { name: '조회 학기 설정' }).textContent).toContain('2026학년도 2학기')
  })

  it('학기 목록 조회 실패는 빈 목록으로 표시하지 않고 재시도로 복구한다', async () => {
    routes.set('/api/v2/terms', httpError(500))
    const ui = render(<HomeView navigate={vi.fn()} onLogout={vi.fn()} />, { wrapper })
    expect(await ui.findByText('학기 목록을 불러오지 못했습니다.')).toBeTruthy()
    expect(ui.queryByText('등록된 학기가 없습니다.')).toBeNull()
    routes.set('/api/v2/terms', () => [])
    fireEvent.click(ui.getByRole('button', { name: '다시 조회' }))
    expect(await ui.findByText('등록된 학기가 없습니다.')).toBeTruthy()
    expect(getCalls(lessonsUrl)).toHaveLength(0)
  })

  it('담임 미등록과 빈 기본표에서도 해당 날짜 실제 수업과 변경된 담당 교사를 표시한다', async () => {
    routes.set('/api/v2/terms', () => [{ ...term, startDate: day, endDate: '2026-12-31' }])
    setWeekRows('mine', () => [])
    routes.set('/api/school/teachers', () => [{ ...teacher, homeroomClasses: [] }, other])
    routes.set('/api/school/subjects', () => [{ id: lesson.subjectId, name: '실제 수업 과목' }])
    const navigate = vi.fn()
    const ui = render(<HomeView navigate={navigate} onLogout={vi.fn()} />, { wrapper })
    await ui.findByText('실제 수업 과목')
    const dated = within(ui.getByRole('region', { name: '날짜별 실제 수업' }))
    expect(dated.getByText('담당 변경')).toBeTruthy()
    expect(dated.getByText(/최도현/)).toBeTruthy()
    fireEvent.click(ui.getByRole('radio', { name: '담임' }))
    await ui.findByText('배정된 담임 학급이 없습니다.')
    expect(weekCalls('class')).toHaveLength(0)
    fireEvent.click(ui.getByRole('radio', { name: '내 시간표' }))
    fireEvent.click(await ui.findByRole('button', { name: '월요일 2교시 · 날짜 수업 있음' }))
    fireEvent.click(ui.getByRole('button', { name: '교환 요청하기' }))
    expect(navigate).toHaveBeenCalledWith('lesson-changes', day, {
      kind: 'SWAP', schoolId: term.schoolId, termId: term.termId,
      date: day, datedLessonId: lesson.id, rev: lesson.rev, teacherId: teacher.schoolUserId,
    })
  })

  it('1학기와 조회 날짜·학급을 홈과 메뉴에서 공유하고 새로고침 뒤 같은 게시 수업을 복원한다', async () => {
    const firstTerm = {
      ...term, termId: 549001, semester: 1, startDate: '2026-03-02', endDate: '2026-07-19',
    }
    const otherRoom = { id: 552010, grade: 2, classNumber: 10, academicYear: 2026 }
    const nearerRoom = { ...otherRoom, id: 552002, classNumber: 2 }
    routes.set('/api/v2/terms', () => [term, firstTerm])
    routes.set('/api/school/classes', () => [
      otherRoom, nearerRoom, { ...room, id: room.classId },
    ])
    const selectedDate = '2026-04-15'
    routes.set(`/api/v2/terms/${firstTerm.termId}/lessons`, () => [])
    setWeekRows('mine', () => [displayRow], firstTerm.termId)
    setWeekRows('class', (request) => [
      {
        ...displayRow, schoolClassId: request.params.classId, grade: 2, classNumber: 10,
        subjectName: '다른 반 화학', teacherId: other.schoolUserId, teacherName: other.username,
      },
    ], firstTerm.termId)
    const mount = () => render(<HomeView navigate={vi.fn()} onLogout={vi.fn()} />, { wrapper })
    let ui = mount()
    fireEvent.click(await ui.findByRole('button', { name: '조회 학기 설정' }))
    fireEvent.change(await ui.findByLabelText('등록된 학기'), { target: { value: firstTerm.termId } })
    fireEvent.click(ui.getByRole('button', { name: '선택한 학기 적용' }))
    await waitFor(() => expect(weekCalls('mine', firstTerm.termId).length).toBeGreaterThan(0))
    const firstDate = weekCalls('mine', firstTerm.termId)[0].params.date
    expect(firstDate >= firstTerm.startDate && firstDate <= firstTerm.endDate).toBe(true)
    fireEvent.change(ui.getByLabelText('수업 날짜'), { target: { value: selectedDate } })
    await waitFor(() => expect(weekCalls('mine', firstTerm.termId).at(-1)?.params.date).toBe(selectedDate))
    const nav = () => within(ui.getByRole('navigation', { name: '업무 메뉴' }))
    fireEvent.click(nav().getByRole('button', { name: '시간표' }))
    await ui.findByRole('heading', { name: '시간표' })
    expect(ui.getByRole('button', { name: '조회 학기 설정' }).textContent).toContain('2026학년도 1학기')
    expect((ui.getByLabelText('수업 날짜') as HTMLInputElement).value).toBe(selectedDate)
    await ui.findByRole('button', { name: '월요일 1교시 · 미술' })

    fireEvent.click(ui.getByRole('radio', { name: '학급 조회' }))
    const grade = await ui.findByRole('combobox', { name: '학년' })
    fireEvent.change(grade, { target: { value: '2' } })
    const rooms = ui.getByRole('combobox', { name: '학급' }) as HTMLSelectElement
    await waitFor(() => expect([...rooms.options].map((o) => o.value).filter(Boolean)).toEqual([
      String(nearerRoom.id), String(otherRoom.id),
    ]))
    fireEvent.change(rooms, { target: { value: String(otherRoom.id) } })
    await ui.findByRole('heading', { name: '2학년 10반 시간표' })
    await ui.findByRole('button', { name: '월요일 1교시 · 다른 반 화학' })
    expect(weekCalls('class', firstTerm.termId).at(-1)?.params).toMatchObject({
      date: selectedDate, classId: otherRoom.id,
    })

    fireEvent.click(nav().getByRole('button', { name: '업무 홈' }))
    await ui.findByRole('heading', { name: '2학년 10반 시간표' })
    expect((ui.getByLabelText('수업 날짜') as HTMLInputElement).value).toBe(selectedDate)
    fireEvent.click(nav().getByRole('button', { name: '시간표' }))
    ui.unmount()
    cache.clear()
    requests = []
    ui = mount()
    await ui.findByRole('heading', { name: '시간표' })
    await ui.findByRole('button', { name: '월요일 1교시 · 다른 반 화학' })
    expect((ui.getByRole('radio', { name: '학급 조회' }) as HTMLInputElement).checked).toBe(true)
    expect((ui.getByLabelText('수업 날짜') as HTMLInputElement).value).toBe(selectedDate)
    expect(weekCalls('class', firstTerm.termId)[0].params.classId).toBe(otherRoom.id)
    expect(getCalls(weekUrl(term.termId))).toHaveLength(0)
    fireEvent.click(ui.getByRole('radio', { name: '내 시간표' }))
    await ui.findByRole('button', { name: '월요일 1교시 · 미술' })
    expect(ui.queryByRole('button', { name: /다른 반 화학/ })).toBeNull()
  })

  it('주간 조회 조건이 이전 학교의 것이면 기본표와 날짜 수업 모두 요청하지 않는다', async () => {
    const { result } = renderHome({ term: null, weeklyTerm: { ...term, schoolId: 123 } })
    await waitFor(() => expect(result.current.activeSchool.state).toBe('ready'))
    expect(result.current.weekly.state).toBe('disabled')
    expect(result.current.dated.state).toBe('disabled')
    expect(weekCalls('mine')).toHaveLength(0)
    expect(getCalls(lessonsUrl)).toHaveLength(0)
  })

  it('재직 관리자의 생성 바로가기가 기존 생성 화면으로 이어진다', async () => {
    routes.set(active, () => activeSchool('ADMIN'))
    const navigate = vi.fn()
    const ui = render(<HomeView navigate={navigate} onLogout={vi.fn()} />, { wrapper })
    const section = await ui.findByText('자주 쓰는 기능')
    fireEvent.click(
      within(section.closest('section')!).getByRole('button', { name: '시간표 생성' }),
    )
    expect(navigate).toHaveBeenCalledWith('schedule-create')
    expect(ui.queryByRole('radio', { name: /담임/ })).toBeNull()
  })
})

describe('FE11 공통 업무 메뉴', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-23T00:00:00+09:00'))
    sessionStorage.setItem('school-home-term/541004/540001/2026/2', JSON.stringify(term))
    setWeekRows('mine', () => [])
    setWeekRows('school', () => [])
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it.each(['ADMIN', 'TEACHER'])(
    '%s의 권한이 확인된 뒤 한 메뉴에서 상세와 홈을 오간다',
    async (role) => {
      const response = deferred<ReturnType<typeof activeSchool>>()
      routes.set(active, () => response.promise)
      routes.set('/api/todos', () => ({ personalTodos: [] }))
      const ui = render(<App />, { wrapper })
      expect(ui.queryByRole('navigation', { name: '업무 메뉴' })).toBeNull()
      expect(ui.getByText('소속 학교를 확인하고 있습니다.')).toBeTruthy()
      await waitFor(() => expect(requests.map((r) => r.url)).toEqual([active]))
      if (role === 'TEACHER') {
        routes.set('/api/mypage/teacher/schools', () => [activeSchool(role)])
        routes.set('/api/schools/540001/roster/me', () => ({
          schoolId: 540001, rosterId: 8, schoolUserId: teacher.schoolUserId, status: 'LINKED',
          employmentStatus: 'HIRED', authEmail: 'teacher@example.invalid', displayName: teacher.username,
          term: { termId: term.termId, subjects: [], homeroomClass: null },
        }))
      }
      await act(async () => response.resolve(activeSchool(role)))
      if (role === 'TEACHER') fireEvent.click(await ui.findByRole('button', { name: '확인하고 업무 홈으로' }))

      await ui.findByRole('button', { name: '요청 내역' })
      const menu = ui.getByRole('navigation', { name: '업무 메뉴' })
      expect(
        within(menu)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual([
        '업무 홈',
        '시간표',
        '할 일',
        '보결·교환 업무',
        '요청 내역',
        ...(role === 'ADMIN' ? ['시간표 생성', '과목·수업 관리', '관리자 도구'] : []),
      ])
      await waitFor(() => expect(getCalls(lessonsUrl)).toHaveLength(1))
      expect(weekCalls(role === 'ADMIN' ? 'school' : 'mine').at(-1)?.params.date).toBe(day)
      fireEvent.click(within(menu).getByRole('button', { name: '할 일' }))
      await waitFor(() => expect(getCalls('/api/todos').length).toBeGreaterThan(0))
      expect(ui.getByRole('navigation', { name: '업무 메뉴' })).toBe(menu)
      expect(within(menu).getByRole('button', { current: 'page' }).textContent).toBe('할 일')
      expect(ui.queryByRole('region', { name: '날짜별 실제 수업' })).toBeNull()

      requests.length = 0
      await act(async () => {
        await cache.invalidateQueries({ queryKey: ['timetable'] })
        await cache.invalidateQueries({ queryKey: ['dated-lessons'] })
      })
      expect(requests).toHaveLength(0)
      fireEvent.click(within(menu).getByRole('button', { name: '업무 홈' }))
      await ui.findByRole('heading', { name: '업무 홈' })
      expect(within(menu).getByRole('button', { current: 'page' }).textContent).toBe('업무 홈')
    },
  )

  it('관리 화면에서 학교 권한을 잃으면 이전 화면과 관리자 메뉴를 즉시 해제한다', async () => {
    routes.set(active, () => activeSchool('ADMIN'))
    const ui = render(<App />, { wrapper })
    routes.set('/api/mypage/teacher/schools', () => [])
    fireEvent.click(await ui.findByRole('button', { name: '관리자 도구' }))
    await ui.findByRole('heading', { name: '관리자 도구' })
    routes.set(active, httpError(403))
    await act(async () => {
      await cache.invalidateQueries({ queryKey: ['mypage', 'active-store'] })
    })
    await ui.findByRole('heading', { name: '학교 연결 확인' })
    expect(ui.queryByRole('navigation', { name: '업무 메뉴' })).toBeNull()
    expect(ui.queryByRole('heading', { name: '관리자 도구' })).toBeNull()
  })
})
