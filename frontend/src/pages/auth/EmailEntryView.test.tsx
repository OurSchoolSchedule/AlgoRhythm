// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '@/App'
import { client, clearTokens, getAccessToken, getRefreshToken, hasPendingSchool } from '@/api'
import EmailEntryView from './EmailEntryView'
import { readVerifiedEmail, type PasskeyContinuation } from './emailSession'

const session = { userId: 42, accessToken: 'example-work-session', refreshToken: 'example-refresh' }
const limited = {
  success: true,
  userId: 42,
  newUser: true,
  nextStep: 'REGISTER',
  flowToken: 'example-limited',
}
let cache: QueryClient

beforeEach(() => {
  cache = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  sessionStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function display(onSuccess = vi.fn(), PasskeyStep?: PasskeyContinuation) {
  return render(
    <QueryClientProvider client={cache}>
      <EmailEntryView onSuccess={onSuccess} PasskeyStep={PasskeyStep} />
    </QueryClientProvider>,
  )
}

async function emailAndCode(email = 'teacher@example.invalid') {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: '인증 코드 받기' }))
  await inputCode()
}

async function inputCode() {
  const field = await screen.findByLabelText('인증 코드')
  fireEvent.change(field, { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: '인증하기' }))
}

it('keeps the email step usable after a failed send and clears the old code on successful resend', async () => {
  const done = vi.fn()
  const post = vi
    .spyOn(client, 'post')
    .mockRejectedValueOnce({ response: { data: { message: '발송 실패' } } })
    .mockResolvedValueOnce({ data: { success: true } })
    .mockRejectedValueOnce({
      response: { data: { message: '코드가 일치하지 않거나 만료되었습니다.' } },
    })
    .mockResolvedValueOnce({ data: { success: true, message: '새 코드를 보냈습니다.' } })
    .mockResolvedValueOnce({ data: { success: true, newUser: false, ...session } })
  display(done)
  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: 'teacher@example.invalid' },
  })
  fireEvent.click(screen.getByRole('button', { name: '인증 코드 받기' }))
  expect((await screen.findByRole('alert')).textContent).toBe('발송 실패')
  fireEvent.click(screen.getByRole('button', { name: '인증 코드 받기' }))
  await inputCode()
  expect((await screen.findByRole('alert')).textContent).toContain('만료')
  expect(done).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '다시 보내기' }))
  await screen.findByText('새 코드를 보냈습니다.')
  expect((screen.getByLabelText('인증 코드') as HTMLInputElement).value).toBe('')
  await inputCode()
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
  expect(post.mock.calls.map(([url]) => url.split('/').pop())).toEqual([
    'send',
    'send',
    'verify',
    'send',
    'verify',
  ])
  expect(getRefreshToken()).toBe(session.refreshToken)
})

it.each(['REGISTER', 'AUTHENTICATE'])(
  'retains a limited %s step in memory without opening the workspace',
  async (nextStep) => {
    const done = vi.fn()
    vi.spyOn(client, 'post')
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { ...limited, nextStep } })
    display(done)
    await emailAndCode()
    await screen.findByRole('heading', {
      name: '이메일 인증 완료',
    })
    expect(done).not.toHaveBeenCalled()
    expect(getAccessToken()).toBeNull()
    expect(
      JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + window.location.href,
    ).not.toContain(limited.flowToken)
    expect(document.body.textContent).not.toContain(limited.flowToken)
    fireEvent.click(screen.getByRole('button', { name: '이메일 입력으로 돌아가기' }))
    await screen.findByLabelText('이메일')
  },
)

it('restores unfinished onboarding after reload and shows the server’s pending school status', async () => {
  const done = vi.fn()
  const post = vi
    .spyOn(client, 'post')
    .mockResolvedValueOnce({ data: { success: true } })
    .mockResolvedValueOnce({ data: { success: true, newUser: true, ...session } })
    .mockResolvedValueOnce({ data: { schoolId: 7, schoolName: '시연고', baseName: '예시 교사', displayName: '예시 교사', confirmation: 'preview-7' } })
    .mockResolvedValueOnce({ data: { userId: 42, schoolId: 7, employmentStatus: 'PENDING' } })
  display(done)
  await emailAndCode()
  await screen.findByLabelText('학교 코드')
  expect(hasPendingSchool()).toBe(true)
  expect(done).not.toHaveBeenCalled()
  cleanup()
  render(
    <QueryClientProvider client={cache}>
      <App />
    </QueryClientProvider>,
  )
  fireEvent.change(await screen.findByLabelText('학교 코드'), { target: { value: 'SCHOOL42' } })
  fireEvent.change(screen.getByLabelText('본인 이름'), { target: { value: '예시 교사' } })
  fireEvent.click(screen.getByRole('button', { name: '학교·이름 확인' }))
  fireEvent.click(await screen.findByRole('button', { name: '학교 가입 요청' }))
  await screen.findByRole('heading', { name: '학교 가입 승인 대기' })
  expect(post).toHaveBeenLastCalledWith('/api/auth/onboarding', {
    role: 'TEACHER',
    schoolCode: 'SCHOOL42',
    displayName: '예시 교사',
    nameConfirmation: 'preview-7',
  })
  expect(hasPendingSchool()).toBe(false)
})

it('continues a repeated first registration without a linked school after a matching work session is issued', async () => {
  const done = vi.fn()
  vi.spyOn(client, 'post')
    .mockResolvedValueOnce({ data: { success: true } })
    .mockResolvedValueOnce({ data: { ...limited, newUser: false, schoolMembership: null } })
  const Finish: PasskeyContinuation = ({ onAuthenticated }) => (
    <>
      <button onClick={() => onAuthenticated({ ...session, userId: 9 })}>다른 계정 응답</button>
      <button onClick={() => onAuthenticated(session)}>패스키 등록 완료 예시</button>
    </>
  )
  display(done, Finish)
  await emailAndCode()
  fireEvent.click(await screen.findByRole('button', { name: '다른 계정 응답' }))
  expect((await screen.findByRole('alert')).textContent).toContain('업무 세션')
  expect(getAccessToken()).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '패스키 등록 완료 예시' }))
  await screen.findByRole('heading', { name: '학교 연결' })
  expect(hasPendingSchool()).toBe(true)
  expect(done).not.toHaveBeenCalled()
})

it('preserves a returning account’s school routing after issuing a new passkey', async () => {
  const done = vi.fn()
  vi.spyOn(client, 'post')
    .mockResolvedValueOnce({ data: { success: true } })
    .mockResolvedValueOnce({
      data: { ...limited, nextStep: 'AUTHENTICATE', newUser: false, schoolMembership: null },
    })
  const Finish: PasskeyContinuation = ({ onAuthenticated }) => (
    <button onClick={() => onAuthenticated(session)}>새 패스키 발급 완료 예시</button>
  )
  display(done, Finish)
  await emailAndCode()
  fireEvent.click(await screen.findByRole('button', { name: '새 패스키 발급 완료 예시' }))
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
  expect(hasPendingSchool()).toBe(false)
  expect(screen.queryByRole('heading', { name: '학교 연결' })).toBeNull()
  expect(getAccessToken()).toBe(session.accessToken)
})

it('rejects incomplete or unknown verification responses and distinguishes confirmed membership', () => {
  for (const response of [
    { success: false, ...session, newUser: false },
    { success: true, userId: 42, newUser: false },
    { ...limited, nextStep: 'UNKNOWN', ...session },
    { ...limited, flowToken: '' },
    { ...limited, schoolMembership: {} },
  ])
    expect(() => readVerifiedEmail(response)).toThrow()
  const schoolMembership = { schoolId: 7, schoolName: '예시', employmentStatus: 'HIRED' }
  expect(readVerifiedEmail({ ...limited, schoolMembership })).toMatchObject({
    kind: 'passkey',
    verification: { schoolMembership },
  })
  expect(
    readVerifiedEmail({ success: true, newUser: true, ...session, schoolMembership }),
  ).toMatchObject({ kind: 'session', needsSchool: false })
})
