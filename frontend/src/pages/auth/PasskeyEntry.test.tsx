// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  markPendingSchool,
  hasPendingSchool,
  clearTokens,
} from '@/api/tokenStorage.js'
import * as api from '@/api/passkeys'
import { DirectPasskeyLogin, VerifiedPasskeyStep } from './PasskeyEntry'
import EmailEntryView from './EmailEntryView'
import type { VerifiedEmail, WorkSession } from './emailSession'

vi.mock('@/api/passkeys', async (original) => ({
  ...(await original<typeof api>()),
  supportsPasskeys: vi.fn(() => true),
  registerPasskey: vi.fn(),
  loginWithPasskey: vi.fn(),
}))
const verified: VerifiedEmail = {
  userId: 42,
  nextStep: 'REGISTER',
  flowToken: 'limited-fixture',
  newUser: true,
  schoolMembership: null,
}
const work = { userId: 42, accessToken: 'unit-access', refreshToken: 'unit-refresh' }
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.supportsPasskeys).mockReturnValue(true)
})
afterEach(() => {
  cleanup()
  clearTokens()
  sessionStorage.clear()
})

it('continues directly after registration without displaying or storing a recovery code', async () => {
  const enter = vi.fn()
  vi.mocked(api.registerPasskey).mockResolvedValueOnce(work)
  render(<VerifiedPasskeyStep verification={verified} onAuthenticated={enter} onRestart={vi.fn()} />)
  click('새 패스키 발급')
  await waitFor(() => expect(enter).toHaveBeenCalledExactlyOnceWith(work))
  expect(screen.queryByText(/복구 코드 보관/)).toBeNull()
  expect(screen.queryByRole('button', { name: /보관했습니다/ })).toBeNull()
})

it('explains a rejected registration origin without sending the user through email again', async () => {
  vi.mocked(api.registerPasskey).mockRejectedValueOnce({
    response: { status: 403, data: 'Invalid CORS request' },
  })
  render(
    <VerifiedPasskeyStep verification={verified} onAuthenticated={vi.fn()} onRestart={vi.fn()} />,
  )
  click('새 패스키 발급')
  expect((await screen.findByRole('alert')).textContent).toContain('공식 주소')
  expect(screen.queryByText(/이메일 인증 코드를 새로/)).toBeNull()
  expect(screen.queryByText(/세션이 만료/)).toBeNull()
})

it.each(['REGISTER', 'AUTHENTICATE'] as const)(
  'lets a returning account issue a new passkey after email verification (%s)',
  async (nextStep) => {
    const enter = vi.fn()
    vi.mocked(api.registerPasskey).mockResolvedValueOnce(work)
    render(
      <VerifiedPasskeyStep
        verification={{ ...verified, nextStep, newUser: false }}
        onAuthenticated={enter}
        onRestart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '등록한 패스키로 인증' })).toBeTruthy()
    expect(screen.queryByLabelText('기존 복구 코드')).toBeNull()
    click('새 패스키 발급')
    await waitFor(() => expect(enter).toHaveBeenCalledExactlyOnceWith(work))
    expect(api.registerPasskey).toHaveBeenCalledExactlyOnceWith(
      verified.flowToken,
      expect.any(AbortSignal),
    )
    expect(api.loginWithPasskey).not.toHaveBeenCalled()
  },
)

it('requires fresh email verification after a failed new registration instead of reusing the grant', async () => {
  vi.mocked(api.registerPasskey).mockRejectedValueOnce({
    response: { data: { code: 'PASSKEY_FLOW_EXPIRED' } },
  })
  const restart = vi.fn()
  render(
    <VerifiedPasskeyStep
      verification={{ ...verified, nextStep: 'AUTHENTICATE', newUser: false }}
      onAuthenticated={vi.fn()}
      onRestart={restart}
    />,
  )
  click('새 패스키 발급')
  await screen.findByRole('alert')
  expect(screen.getByText(/이메일 인증 코드를 새로/)).toBeTruthy()
  expect((screen.getByRole('button', { name: '새 패스키 발급' }) as HTMLButtonElement).disabled).toBe(true)
  click('새 패스키 발급')
  expect(api.registerPasskey).toHaveBeenCalledOnce()
  click('이메일 입력으로 돌아가기')
  expect(restart).toHaveBeenCalledOnce()
})

it('discards a cancelled registration and requires a fresh email grant while preserving existing-key login', async () => {
  let resolve!: (session: WorkSession) => void
  vi.mocked(api.registerPasskey).mockImplementationOnce(
    () => new Promise((r) => { resolve = r }),
  )
  vi.mocked(api.loginWithPasskey).mockResolvedValueOnce(work)
  const enter = vi.fn()
  render(<VerifiedPasskeyStep verification={verified} onAuthenticated={enter} onRestart={vi.fn()} />)
  click('새 패스키 발급')
  click('인증 취소')
  expect(vi.mocked(api.registerPasskey).mock.calls[0][1]?.aborted).toBe(true)
  await act(async () => resolve(work))
  expect(enter).not.toHaveBeenCalled()
  expect(screen.getByText(/이메일 인증 코드를 새로/)).toBeTruthy()
  expect((screen.getByRole('button', { name: '새 패스키 발급' }) as HTMLButtonElement).disabled).toBe(true)
  click('등록한 패스키로 인증')
  await waitFor(() => expect(enter).toHaveBeenCalledExactlyOnceWith(work))
})

it('discards a verified email grant when the current session changes', async () => {
  const enter = vi.fn()
  render(<VerifiedPasskeyStep verification={verified} onAuthenticated={enter} onRestart={vi.fn()} />)
  await act(async () => clearTokens())
  expect(screen.getByRole('alert').textContent).toContain('로그인 상태가 변경')
  expect(screen.queryByRole('button', { name: '새 패스키 발급' })).toBeNull()
  expect(api.registerPasskey).not.toHaveBeenCalled()
})

it('starts a fresh discoverable login after cancel and discards the cancelled result', async () => {
  let resolve!: (session: WorkSession) => void
  vi.mocked(api.loginWithPasskey)
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )
    .mockResolvedValueOnce(work)
  const enter = vi.fn()
  render(<DirectPasskeyLogin disabled={false} onBusyChange={vi.fn()} onAuthenticated={enter} />)
  click('패스키로 로그인')
  click('인증 취소')
  expect(vi.mocked(api.loginWithPasskey).mock.calls[0][0]?.aborted).toBe(true)
  await act(async () => resolve(work))
  expect(enter).not.toHaveBeenCalled()
  click('패스키로 로그인')
  await waitFor(() => expect(enter).toHaveBeenCalledExactlyOnceWith(work))
})

it('rejects an authenticator for a different email account and allows a fresh account selection', async () => {
  vi.mocked(api.loginWithPasskey)
    .mockResolvedValueOnce({ ...work, userId: 21 })
    .mockResolvedValueOnce(work)
  const enter = vi.fn()
  render(
    <VerifiedPasskeyStep
      verification={{ ...verified, nextStep: 'AUTHENTICATE' }}
      onAuthenticated={enter}
      onRestart={vi.fn()}
    />,
  )
  click('등록한 패스키로 인증')
  expect((await screen.findByRole('alert')).textContent).toContain('계정이 다릅니다')
  expect(enter).not.toHaveBeenCalled()
  click('등록한 패스키로 인증')
  await waitFor(() => expect(enter).toHaveBeenCalledExactlyOnceWith(work))
})

it('returns to pending school setup when a returning user still needs a school', async () => {
  markPendingSchool(42)
  vi.mocked(api.loginWithPasskey).mockResolvedValueOnce(work)
  const enter = vi.fn()
  const cache = new QueryClient()
  render(
    <QueryClientProvider client={cache}>
      <EmailEntryView onSuccess={enter} />
    </QueryClientProvider>,
  )
  click('패스키로 로그인')
  await screen.findByRole('heading', { name: '학교 연결' })
  expect(hasPendingSchool()).toBe(true)
  expect(enter).not.toHaveBeenCalled()
  cache.clear()
})

it('gives unsupported browsers a next action without starting a ceremony', () => {
  vi.mocked(api.supportsPasskeys).mockReturnValue(false)
  render(<DirectPasskeyLogin disabled={false} onBusyChange={vi.fn()} onAuthenticated={vi.fn()} />)
  expect(
    (screen.getByRole('button', { name: '패스키로 로그인' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(screen.getByText(/최신 브라우저/)).toBeTruthy()
  expect(api.loginWithPasskey).not.toHaveBeenCalled()
})

it('shows the new passkey action with supported-browser guidance when WebAuthn is unavailable', () => {
  vi.mocked(api.supportsPasskeys).mockReturnValue(false)
  render(<VerifiedPasskeyStep verification={verified} onAuthenticated={vi.fn()} onRestart={vi.fn()} />)
  expect((screen.getByRole('button', { name: '새 패스키 발급' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('status').textContent).toContain('최신 브라우저')
  expect(api.registerPasskey).not.toHaveBeenCalled()
})
