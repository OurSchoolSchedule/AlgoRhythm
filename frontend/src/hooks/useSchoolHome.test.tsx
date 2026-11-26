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

const term = { schoolId: 540001, termId: 547001, academicYear: 2026, semester: 2 }
const day = '2026-11-23'
const mine = '/api/timetable/me/year/2026/semester/2'
const schoolWeek = '/api/timetable/year/2026/semester/2'
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
  id: 12,
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
let routes: Map<string, Route>
let requests: InternalAxiosRequestConfig[]
let cache: QueryClient

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
  routes = new Map<string, Route>([
    [active, () => activeSchool()],
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
    [mine, () => [weeklyRow]],
    [schoolWeek, () => [weeklyRow]],
    [lessonsUrl, () => [lesson]],
  ])
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
    expect(result.current.weekly.data?.[0].id).toBe(12)
    expect(getCalls(lessonsUrl)[0].params).toEqual({ date: day })
    expect(getCalls('/api/school/classes')[0].params).toEqual({ academicYear: 2026 })
    expect(getCalls(lessonsUrl)[0].headers.Authorization).toBe('Bearer test-token')
    expect(getCalls('/api/school/members')).toHaveLength(0)
    expect(result.current.profile.name).toEqual({ state: 'value', value: teacher.username })
    expect(result.current.canSwitchHomeroom).toBe(true)
    routes.set(schoolWeek, () => [weeklyRow, { ...weeklyRow, id: 13, schoolClassId: 999 }])
    rerender({ term, date: day, classId: room.classId })
    await waitFor(() => expect(result.current.selection.view).toBe('homeroom'))
    await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
    expect(result.current.weekly.data?.map((row) => row.id)).toEqual([12])
    await waitFor(() => expect(result.current.dated.data).toHaveLength(2))
    expect(getCalls(schoolWeek)).toHaveLength(1)
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
      expect(getCalls(schoolWeek)).toHaveLength(0)
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
    expect(getCalls(mine)).toHaveLength(0)
    expect(getCalls('/api/school/teachers')).toHaveLength(0)
    expect(getCalls('/api/school/members')).toHaveLength(1)
  })

  it('최초 로딩·빈 목록·배경 갱신을 구분하고 403을 받으면 캐시된 수업도 숨긴다', async () => {
    const first = deferred<unknown>()
    routes.set(mine, () => first.promise)
    const { result } = renderHome()
    await waitFor(() => expect(result.current.weekly.state).toBe('loading'))
    first.resolve([])
    await waitFor(() => expect(result.current.weekly.state).toBe('empty'))
    const next = deferred<unknown>()
    routes.set(mine, () => next.promise)
    act(() => {
      void cache.invalidateQueries({ queryKey: ['timetable'] })
    })
    await waitFor(() =>
      expect(result.current.weekly).toMatchObject({ state: 'empty', refreshing: true, data: [] }),
    )
    next.resolve([weeklyRow])
    await waitFor(() => expect(result.current.weekly.state).toBe('ready'))
    routes.set(mine, httpError(403))
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
    routes.set(mine, () => late.promise)
    act(() => {
      void cache.invalidateQueries({ queryKey: ['timetable'] })
    })
    await waitFor(() => expect(getCalls(mine)).toHaveLength(2))
    const previous = getCalls(mine)[1]
    act(() => result.current.change.mutate(schoolB))
    await waitFor(() => expect(result.current.home.weekly.state).toBe('disabled'))
    expect(result.current.home.weekly.data).toBeUndefined()
    expect(previous.signal?.aborted).toBe(true)
    routes.set(active, () => activeSchool('TEACHER', schoolB))
    routes.set(mine, () => [{ ...weeklyRow, id: 22, schoolId: schoolB }])
    routes.set('/api/v2/terms/' + termB.termId + '/lessons', () => [])
    patch.resolve(activeSchool('TEACHER', schoolB))
    await waitFor(() => expect(result.current.home.activeSchool.data?.schoolId).toBe(schoolB))
    expect(result.current.home.weekly.state).toBe('disabled')
    rerender({ term: termB, date: day })
    await waitFor(() => expect(result.current.home.weekly.data?.[0]?.id).toBe(22))
    await act(async () => {
      late.resolve([weeklyRow])
      await late.promise
    })
    expect(result.current.home.weekly.data?.[0]?.schoolId).toBe(schoolB)
    expect(observed).not.toContain(term.schoolId)
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
    routes.set(mine, () => [])
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
    // Fix the school date while leaving React Query's real timers running.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-23T00:00:00+09:00'))
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('학기 ID를 모르는 교사는 기본표와 확인된 담임을 조회하고 알림 실패에도 선택한 수업을 읽는다', async () => {
    routes.set(mine, () => [displayRow])
    routes.set('/api/notifications', httpError(500))
    const ui = render(<HomeView navigate={vi.fn()} onLogout={vi.fn()} />, { wrapper })
    const cell = await ui.findByRole('button', { name: '월요일 1교시 · 미술' })
    fireEvent.click(cell)
    expect(cell.getAttribute('aria-pressed')).toBe('true')
    expect(cell.closest('td')?.getAttribute('data-today')).toBe('true')
    expect(ui.getByRole('radio', { name: '담임 1-6반' })).toBeTruthy()
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

  it('담임 미등록과 빈 기본표에서도 해당 날짜 실제 수업과 변경된 담당 교사를 표시한다', async () => {
    sessionStorage.setItem('school-home-term/541004/540001/2026/2', JSON.stringify(term))
    routes.set(mine, () => [])
    routes.set('/api/school/teachers', () => [{ ...teacher, homeroomClasses: [] }, other])
    routes.set('/api/school/subjects', () => [{ id: lesson.subjectId, name: '실제 수업 과목' }])
    const navigate = vi.fn()
    const ui = render(<HomeView navigate={navigate} onLogout={vi.fn()} />, { wrapper })
    const dated = within(await ui.findByRole('region', { name: '날짜별 실제 수업' }))
    await dated.findByText('실제 수업 과목')
    expect(dated.getByText('담당 변경')).toBeTruthy()
    expect(dated.getByText(/최도현/)).toBeTruthy()
    expect(ui.queryByRole('radio', { name: /담임/ })).toBeNull()
    fireEvent.click(await ui.findByRole('button', { name: '월요일 2교시 · 날짜 수업 있음' }))
    fireEvent.click(ui.getByRole('button', { name: '교환 요청하기' }))
    expect(navigate).toHaveBeenCalledWith('lesson-changes', day, {
      kind: 'SWAP', schoolId: term.schoolId, termId: term.termId,
      date: day, datedLessonId: lesson.id, rev: lesson.rev, teacherId: teacher.schoolUserId,
    })
  })

  it('주간 조회 조건이 이전 학교의 것이면 기본표와 날짜 수업 모두 요청하지 않는다', async () => {
    const { result } = renderHome({ term: null, weeklyTerm: { ...term, schoolId: 123 } })
    await waitFor(() => expect(result.current.activeSchool.state).toBe('ready'))
    expect(result.current.weekly.state).toBe('disabled')
    expect(result.current.dated.state).toBe('disabled')
    expect(getCalls(mine)).toHaveLength(0)
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
    routes.set(mine, () => [])
    routes.set(schoolWeek, () => [])
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
      expect(getCalls(role === 'ADMIN' ? schoolWeek : mine)).toHaveLength(1)
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
