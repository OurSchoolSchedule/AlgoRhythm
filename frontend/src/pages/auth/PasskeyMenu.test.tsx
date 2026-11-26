// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { verifyCurrentPasskey } from '@/api/passkeys'
import PasskeyMenu from './PasskeyMenu'

vi.mock('@/api/passkeys', async (load) => ({
  ...(await load<typeof import('@/api/passkeys')>()),
  verifyCurrentPasskey: vi.fn(),
}))
vi.mock('./PasskeySettings', () => ({ default: () => <p>등록 기기 목록</p> }))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

it('opens settings only after fresh verification on every click, including after cancellation', async () => {
  const verify = vi.mocked(verifyCurrentPasskey)
  verify
    .mockRejectedValueOnce(new DOMException('cancelled', 'NotAllowedError'))
    .mockResolvedValue(undefined)
  render(<PasskeyMenu>{(button) => button}</PasskeyMenu>)
  click('패스키 관리')
  await screen.findByRole('alert')
  expect(screen.queryByText('등록 기기 목록')).toBeNull()
  click('다시 확인')
  await screen.findByText('등록 기기 목록')
  click('닫기')
  let finish!: () => void
  verify.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  click('패스키 관리')
  expect(verify).toHaveBeenCalledTimes(3)
  expect(screen.queryByText('등록 기기 목록')).toBeNull()
  click('닫기')
  expect(verify.mock.calls[2][0]?.aborted).toBe(true)
  await act(async () => finish())
  expect(screen.queryByRole('dialog')).toBeNull()
})
