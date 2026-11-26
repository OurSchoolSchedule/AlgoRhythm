// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AIFloatingChat from './AIFloatingChat'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), approve: vi.fn(), voice: vi.fn() }))
vi.mock('@/api/client.js', () => ({ default: { get: api.get, post: api.post } }))
vi.mock('@/api/passkeys', () => ({ approveDemoReset: api.approve, passkeyErrorMessage: () => '인증이 취소됐습니다.' }))
vi.mock('@/hooks', () => ({
  usePreviewVoiceCommand: () => ({ mutate: api.voice, reset: vi.fn() }),
  useConfirmVoiceCommand: () => ({ reset: vi.fn() }),
}))

const scope = { schoolId: 540001, termId: 547001, round: 4, jobs: 2, versions: 1 }
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue({ data: scope }) })
afterEach(cleanup)
function open() {
  render(<AIFloatingChat />)
  fireEvent.click(screen.getByRole('button', { name: 'AI 도우미 열기' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Algorhythm' } })
  fireEvent.click(screen.getByRole('button', { name: '명령 보내기' }))
}
it('opens a masked local confirmation, and cancel discards input without a write', async () => {
  open()
  const input = await screen.findByLabelText('초기화를 진행하려면 비밀번호를 입력하세요')
  expect(input.type).toBe('password')
  fireEvent.change(input, { target: { value: 'test-pin' } })
  fireEvent.click(screen.getByRole('button', { name: '취소' }))
  expect(screen.queryByText('test-pin')).toBeNull()
  expect(api.post).not.toHaveBeenCalled()
  expect(api.voice).not.toHaveBeenCalled()
})
it('requires passkey approval and sends scope and secret only to the reset API', async () => {
  api.approve.mockResolvedValue('one-use')
  api.post.mockRejectedValue({ response: { status: 400, data: { message: '비밀번호가 일치하지 않습니다.' } } })
  open()
  const input = await screen.findByLabelText('초기화를 진행하려면 비밀번호를 입력하세요')
  fireEvent.change(input, { target: { value: 'test-pin' } })
  fireEvent.click(screen.getByRole('button', { name: 'School42 시간표만 초기화' }))
  await screen.findByRole('alert')
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/demo-reset',
    { scope, password: 'test-pin', approvalToken: 'one-use' }, expect.anything())
  expect(input.value).toBe('')
  expect(api.voice).not.toHaveBeenCalled()
})
it('does not offer deletion to an unauthorized account', async () => {
  api.get.mockRejectedValue({ response: { status: 403, data: { message: '관리자만 실행할 수 있습니다.' } } })
  open()
  await screen.findByRole('alert')
  expect(screen.queryByRole('button', { name: 'School42 시간표만 초기화' })).toBeNull()
  expect(api.post).not.toHaveBeenCalled()
})

it('refuses an old global reset server or a different target term', async () => {
  for (const data of [{ revision: 4, users: 44, schools: 1 }, { ...scope, termId: 999 }]) {
    api.get.mockResolvedValueOnce({ data })
    open()
    await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: 'School42 시간표만 초기화' })).toBeNull()
    cleanup()
  }
  expect(api.post).not.toHaveBeenCalled()
})
