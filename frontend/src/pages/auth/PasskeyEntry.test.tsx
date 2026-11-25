// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  getAccessToken,
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
  recoverPasskey: vi.fn(),
}))
const verified: VerifiedEmail = {
  userId: 42,
  nextStep: 'REGISTER',
  flowToken: 'limited-fixture',
  newUser: true,
  schoolMembership: null,
}
const work = { userId: 42, accessToken: 'unit-access', refreshToken: 'unit-refresh' }
const issued = { ...work, recoveryCode: 'unit-recovery' }
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

it('holds registration tokens and the single recovery code until the user acknowledges it', async () => {
  const enter = vi.fn()
  const notified = vi.fn()
  vi.mocked(api.registerPasskey).mockResolvedValueOnce(issued)
  render(
    <VerifiedPasskeyStep
      verification={verified}
      onAuthenticated={enter}
      onRecoveryIssued={notified}
      onRestart={vi.fn()}
    />,
  )
  click('패스키 등록')
  await screen.findByText(issued.recoveryCode)
  expect(notified).toHaveBeenCalledWith(42)
  expect(enter).not.toHaveBeenCalled()
  expect(getAccessToken()).toBeNull()
  expect(
    JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + location.href,
  ).not.toContain(issued.recoveryCode)
  click('복구 코드를 보관했습니다')
  expect(enter).toHaveBeenCalledExactlyOnceWith(work)
  expect(screen.queryByText(issued.recoveryCode)).toBeNull()
})

it('requires fresh email verification after a bad recovery code instead of reusing the grant', async () => {
  vi.mocked(api.recoverPasskey).mockRejectedValueOnce({
    response: { data: { code: 'PASSKEY_INVALID' } },
  })
  const restart = vi.fn()
  render(
    <VerifiedPasskeyStep
      verification={{ ...verified, nextStep: 'AUTHENTICATE' }}
      onAuthenticated={vi.fn()}
      onRestart={restart}
    />,
  )
  click('복구 코드로 복구')
  fireEvent.change(screen.getByLabelText('기존 복구 코드'), { target: { value: 'wrong-fixture' } })
  click('새 패스키로 복구')
  await screen.findByRole('alert')
  expect(api.recoverPasskey).toHaveBeenCalledExactlyOnceWith(
    verified.flowToken,
    'wrong-fixture',
    expect.any(AbortSignal),
  )
  expect(screen.queryByLabelText('기존 복구 코드')).toBeNull()
  expect(screen.getByText(/이메일 인증 코드를 새로/)).toBeTruthy()
  click('이메일 입력으로 돌아가기')
  expect(restart).toHaveBeenCalledOnce()
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

it('returns to pending school setup after registration was interrupted before acknowledgement', async () => {
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
