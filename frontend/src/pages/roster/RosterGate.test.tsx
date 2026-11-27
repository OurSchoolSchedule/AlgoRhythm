// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, expect, it } from 'vitest'
import client from '@/api/client'
import { clearTokens, setTokens } from '@/api/tokenStorage'
import RosterGate from './RosterGate'
import { toHomeProfile } from '@/utils/homeContract'

const school = {
  schoolId: 7,
  name: '가상 고등학교',
  position: 'TEACHER',
  employmentStatus: 'HIRED',
}
const record = {
  rosterId: 13,
  schoolId: 7,
  displayName: '가상 교사',
  authEmail: 'teacher@example.invalid',
  status: 'LINKED',
  employmentStatus: 'HIRED',
  schoolUserId: 17,
  term: null,
}
const old = client.defaults.adapter
let cache: QueryClient
let calls: string[]
let active: typeof school | null
let status: number
let hasTeachingLink: boolean
let failTerm: boolean
let list: (typeof school)[]
function error(config: InternalAxiosRequestConfig, status: number) {
  return new AxiosError('test', undefined, config, undefined, {
    status,
    data: { success: false, error: status === 403 ? 'FORBIDDEN' : 'NOT_FOUND' },
  } as AxiosResponse)
}
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setTokens({ userId: 1, accessToken: 'session', refreshToken: 'refresh' })
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  calls = []
  active = school
  status = 200
  hasTeachingLink = false
  failTerm = false
  list = [school]
  client.defaults.adapter = async (config) => {
    const url = config.url
    calls.push(config.method + ' ' + url)
    let data
    if (url === '/api/mypage/active-school') {
      if (!active) throw error(config, 403)
      data = active
    } else if (url === '/api/v2/terms') data = [
      { termId: 11, academicYear: 2026, semester: 2, startDate: '2026-08-01', endDate: '2026-12-31' },
      { termId: 999, academicYear: 2026, semester: 1, startDate: '2026-03-01', endDate: '2026-07-01' },
    ]
    else if (url === '/api/mypage/teacher/schools') data = list
    else if (url === '/api/schools/7/roster/me') {
      if (status !== 200 || (failTerm && config.params?.termId))
        throw error(config, failTerm ? 404 : status)
      data = active
        ? {
            ...record,
            teachingSchoolUserId: hasTeachingLink ? 542004 : null,
            term: config.params?.termId
              ? {
                  termId: config.params.termId,
                  assignmentRecorded: !hasTeachingLink,
                  subjects: [],
                  homeroomClass: null,
                }
              : null,
          }
        : { ...record, status: 'PENDING', employmentStatus: null }
    } else throw Error('Unexpected: ' + url)
    return { status: 200, statusText: 'OK', config, headers: {}, data }
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = old
})
function show() {
  render(
    <QueryClientProvider client={cache}>
      <RosterGate onLogout={() => {}}>
        {(review?: () => void) => <button onClick={review}>업무 영역</button>}
      </RosterGate>
    </QueryClientProvider>,
  )
}
it('keeps pending accounts outside the workspace, then rechecks both membership and approval', async () => {
  active = null
  list = [{ ...school, employmentStatus: 'PENDING' }]
  show()
  await screen.findByText(/신청 이름 · 가상 교사/)
  expect(screen.queryByText('업무 영역')).toBeNull()
  active = school
  list = [school]
  fireEvent.click(screen.getByText('승인 상태 새로고침'))
  await screen.findByText('teacher@example.invalid')
  fireEvent.click(screen.getByText('확인하고 업무 홈으로'))
  await screen.findByText('업무 영역')
})
it('offers a draft to the school contact and never submits an administrator edit', async () => {
  show()
  fireEvent.click(await screen.findByText('정정 요청'))
  fireEvent.change(screen.getByLabelText('정정할 내용'), {
    target: { value: '담당 과목을 확인해 주세요.' },
  })
  const link = screen.getByRole('link', { name: '정정 요청 메일 작성' })
  expect(decodeURIComponent(link.getAttribute('href')!)).toContain(
    '담당 과목을 확인해 주세요.',
  )
  expect(calls.every((c) => c.startsWith('get '))).toBe(true)
  fireEvent.click(screen.getByText('확인하고 업무 홈으로'))
  fireEvent.click(await screen.findByText('업무 영역'))
  await screen.findByRole('heading', { name: '내 교사 정보 확인' })
})
it('allows an existing hired teacher without a roster, but never treats an invalid term as a missing person', async () => {
  status = 404
  show()
  await screen.findByText('기존 재직 정보로 계속')
  status = 200
  failTerm = true
  fireEvent.click(screen.getByText('학기 설정'))
  fireEvent.change(screen.getByLabelText('등록된 학기'), {
    target: { value: '999' },
  })
  fireEvent.click(screen.getByText('선택한 학기 적용'))
  await screen.findByRole('alert')
  await waitFor(() =>
    expect(
      calls.filter((s) => s.endsWith('/roster/me')).length,
    ).toBeGreaterThanOrEqual(3),
  )
  expect(screen.queryByText('기존 재직 정보로 계속')).toBeNull()
  expect(screen.queryByText('업무 영역')).toBeNull()
})
it.each(['ADMIN', 'STUDENT'])(
  'does not request teacher records for %s',
  async (position) => {
    active = { ...school, position }
    show()
    await screen.findByText('업무 영역')
    expect(calls).toEqual(['get /api/mypage/active-school'])
  },
)
it('uses the selected term’s directory values, including an explicitly unassigned homeroom', () => {
  const room = { classId: 9, academicYear: 2026, grade: 2, classNumber: 3 }
  const member = {
    userId: 1,
    schoolUserId: 11,
    displayName: '학교 이름',
    subjects: [],
    homeroomClasses: [room],
    rosterSubjects: [
      { subjectId: 1, subjectName: '수학' },
      { subjectId: 2, subjectName: '영어' },
    ],
    rosterHomeroomClass: null,
  }
  const profile = toHomeProfile(
    1,
    2026,
    { state: 'success', data: { userId: 1, username: '계정 이름' } },
    { state: 'success', data: [member] },
    71,
  )
  expect(profile.name).toEqual({ state: 'value', value: '학교 이름' })
  expect(profile.subjects).toEqual({
    state: 'value',
    value: member.rosterSubjects,
  })
  expect(profile.homerooms).toEqual({ state: 'empty' })
})

it('distinguishes a linked teaching identity from optional term roster assignments', async () => {
  hasTeachingLink = true
  show()
  await screen.findByText('연결됨 · #542004')
  expect(screen.getByText('담당 수업은 개인 시간표에서 확인하세요.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '확인하고 업무 홈으로' }))
  await screen.findByText('업무 영역')
})
