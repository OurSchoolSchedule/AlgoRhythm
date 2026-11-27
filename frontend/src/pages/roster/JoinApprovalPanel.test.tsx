// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import client from '@/api/client'
import { setTokens, clearTokens } from '@/api/tokenStorage'
import JoinApprovalPanel from './JoinApprovalPanel'

const path = '/api/schools/42/roster'
const row = { schoolId: 42, rosterId: 15, displayName: '박교사', authEmail: 'applicant@gmail.com' }
const candidate = {
  teacherSchoolUserId: 300,
  displayName: '박교사',
  subjects: ['수학', '미술'],
  weeklyPeriods: 16,
  linked: false,
}

let position: string, employmentStatus: string, approved: boolean, schoolId: number, legacy: boolean
let requiresSelection: boolean, candidates: (typeof candidate)[], verifiedEmail: string | null
let cache: QueryClient
beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  setTokens({ userId: 10, accessToken: 'test-session' })
  position = 'ADMIN'
  employmentStatus = 'HIRED'
  approved = false
  schoolId = 42
  legacy = false
  requiresSelection = true
  verifiedEmail = row.authEmail
  candidates = [candidate, { ...candidate, teacherSchoolUserId: 302, linked: true }]
  vi.spyOn(client, 'get').mockImplementation(async (url, options) => {
    if (url === '/api/mypage/active-school')
      return { data: { schoolId, name: '시연학교', position, employmentStatus } }
    if (url === '/api/v2/terms')
      return {
        data: [
          { termId: 2, academicYear: 2026, semester: 2, startDate: '2026-09-01', endDate: '2026-12-31' },
        ],
      }
    if (url === '/api/schools/' + schoolId + '/roster')
      return {
        data: approved
          ? []
          : [
              {
                ...row,
                schoolId,
                status: legacy ? 'LINKED' : 'PENDING',
                teachingSchoolUserId: null,
                employmentStatus: legacy ? 'HIRED' : null,
              },
            ],
      }
    if (url === '/api/schools/' + schoolId + '/roster/15/match-options') {
      expect(options?.params).toEqual({ termId: 2 })
      return {
        data: {
          applicantName: row.displayName,
          verifiedEmail,
          requestedAt: '2026-11-27T10:30:00',
          subjectHint: '수학',
          termId: 2,
          requiresSelection,
          candidates,
        },
      }
    }
    throw Error(url)
  })
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  vi.restoreAllMocks()
})

function open() {
  render(
    <QueryClientProvider client={cache}>
      <JoinApprovalPanel />
    </QueryClientProvider>,
  )
}
async function review() {
  open()
  fireEvent.change(await screen.findByLabelText('가입 신청자'), { target: { value: '15' } })
  await screen.findByText(/신청 과목 · 수학/)
}

it('shows evidence, requires explicit choice, disables occupied records and sends the selected ID', async () => {
  const post = vi.spyOn(client, 'post').mockImplementation(async () => {
    approved = true
    return { data: { ...row, status: 'LINKED', employmentStatus: 'HIRED' } }
  })
  await review()
  const approve = screen.getByRole('button', { name: '명부 연결 및 가입 승인' }) as HTMLButtonElement
  expect(approve.disabled).toBe(true)
  expect((screen.getByRole('option', { name: /302.*이미 연결됨/ }) as HTMLOptionElement).disabled).toBe(
    true,
  )
  fireEvent.change(screen.getByLabelText('연결할 기존 교사 명부'), { target: { value: '300' } })
  fireEvent.click(approve)
  await screen.findByText(/가입 승인 완료 · 박교사 명부 연결/)
  await screen.findByText('승인 대기 중인 교사가 없습니다.')
  expect(post).toHaveBeenCalledWith(
    path + '/15/approve',
    { teacherSchoolUserId: 300 },
    expect.objectContaining({ signal: expect.anything() }),
  )
})

it.each([
  ['TEACHER', 'HIRED'],
  ['ADMIN', 'PENDING'],
])('does not fetch applicants when role=%s employment=%s', async (p, e) => {
  position = p
  employmentStatus = e
  open()
  await screen.findByText(/재직 관리자만/)
  expect(vi.mocked(client.get).mock.calls.some(([url]) => url === path)).toBe(false)
})

it('keeps a required selection blocked when the candidate roster is empty', async () => {
  candidates = []
  await review()
  expect(
    (screen.getByRole('button', { name: '명부 연결 및 가입 승인' }) as HTMLButtonElement).disabled,
  ).toBe(true)
})

it('retains ordinary approvals when the server permits them and verifies the applicant', async () => {
  candidates = []
  requiresSelection = false
  await review()
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '가입 승인' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  )
})

it('opens an approved School42 teacher separately for a missing timetable identity', async () => {
  schoolId = 540001
  legacy = true
  open()
  await screen.findByText('승인 대기 중인 교사가 없습니다.')
  fireEvent.click(screen.getByRole('checkbox', { name: '이미 승인된 교사의 명부 연결' }))
  fireEvent.change(screen.getByLabelText('재직 교사'), { target: { value: '15' } })
  await screen.findByRole('button', { name: '기존 교사 명부 연결' })
  expect(screen.queryByRole('button', { name: '가입 거절' })).toBeNull()
  expect(
    ((await screen.findByRole('button', { name: '기존 교사 명부 연결' })) as HTMLButtonElement).disabled,
  ).toBe(true)
  fireEvent.change(screen.getByLabelText('연결할 기존 교사 명부'), { target: { value: '300' } })
  expect(
    (screen.getByRole('button', { name: '기존 교사 명부 연결' }) as HTMLButtonElement).disabled,
  ).toBe(false)
})

it('blocks approval when the verified email record is missing', async () => {
  requiresSelection = false
  candidates = []
  verifiedEmail = null
  await review()
  expect((screen.getByRole('button', { name: '가입 승인' }) as HTMLButtonElement).disabled).toBe(true)
})

it('rejects only after confirmation, without selecting a teaching identity', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  const post = vi.spyOn(client, 'post').mockImplementation(async () => {
    approved = true
    return { status: 204 }
  })
  await review()
  const button = screen.getByRole('button', { name: '가입 거절' })
  fireEvent.click(button)
  expect(post).not.toHaveBeenCalled()
  fireEvent.click(button)
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining(row.authEmail))
  expect(post).toHaveBeenCalledWith(path + '/15/reject', { requestedAt: '2026-11-27T10:30:00' }, expect.anything())
  await screen.findByText('박교사 가입 거절 완료')
  await screen.findByText('승인 대기 중인 교사가 없습니다.')
})
