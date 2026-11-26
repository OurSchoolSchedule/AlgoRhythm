// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '@/api/passkeys'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/api/tokenStorage.js'
import type { WorkSession } from './emailSession'
import PasskeySettings from './PasskeySettings'

vi.mock('@/api/passkeys', async (load) => ({
  ...(await load<typeof import('@/api/passkeys')>()),
  addPasskey: vi.fn(),
  listPasskeys: vi.fn(),
  removePasskey: vi.fn(),
  supportsPasskeys: vi.fn(),
}))

const first = { id: 'device-red', createdAt: '2026-10-11T14:55:00' }
const second = { id: 'device-green', createdAt: '2026-10-12T12:02:33' }
const session = { userId: 18, accessToken: 'test-access', refreshToken: 'test-refresh' }
const fresh = { ...session, accessToken: 'test-fresh', refreshToken: 'test-fresh-refresh' }
const other = { userId: 19, accessToken: 'test-other', refreshToken: 'test-other-refresh' }
let cache: QueryClient

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  cache = new QueryClient()
  setTokens(session)
  vi.mocked(api.supportsPasskeys).mockReturnValue(true)
  vi.mocked(api.listPasskeys).mockResolvedValue([first])
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
})
function display() {
  return render(
    <QueryClientProvider client={cache}>
      <PasskeySettings />
    </QueryClientProvider>,
  )
}
async function listed() {
  await screen.findByRole('list', { name: '등록된 패스키' })
}
function button(name: string | RegExp) {
  return screen.getByRole<HTMLButtonElement>('button', { name })
}
it('does not request credentials without a work session, including after logout', async () => {
  clearTokens()
  display()
  expect(screen.queryByRole('region')).toBeNull()
  expect(api.listPasskeys).not.toHaveBeenCalled()
  act(() => setTokens(session))
  await listed()
  act(() => clearTokens())
  expect(screen.queryByRole('region')).toBeNull()
  expect(api.listPasskeys).toHaveBeenCalledTimes(1)
})

it('lists credentials on unsupported browsers and protects the last credential', async () => {
  vi.mocked(api.supportsPasskeys).mockReturnValue(false)
  display()
  await listed()
  expect(screen.getByText(/마지막 패스키/)).toBeTruthy()
  expect(screen.getByText(/브라우저에서는 패스키를 사용할 수 없습니다/)).toBeTruthy()
  expect(button(/철회/).disabled).toBe(true)
  expect(button('패스키 추가').disabled).toBe(true)
  expect(screen.queryByRole('button', { name: /복구 코드/ })).toBeNull()
})

it('distinguishes list errors from empty accounts and allows a list retry', async () => {
  vi.mocked(api.listPasskeys).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
  display()
  await screen.findByRole('alert')
  expect(screen.queryByText(/첫 패스키를 등록하세요/)).toBeNull()
  fireEvent.click(button('목록 다시 불러오기'))
  await screen.findByText(/첫 패스키를 등록하세요/)
  expect(button('패스키 추가').disabled).toBe(true)
})

it('allows retry after cancellation, suppresses duplicate clicks and commits the new device session', async () => {
  const added = deferred<WorkSession>()
  vi.mocked(api.addPasskey)
    .mockRejectedValueOnce(new DOMException('cancelled', 'NotAllowedError'))
    .mockReturnValueOnce(added.promise)
  vi.mocked(api.listPasskeys).mockResolvedValueOnce([first]).mockResolvedValue([first, second])
  display()
  await listed()
  fireEvent.click(button('패스키 추가'))
  expect((await screen.findByRole('alert')).textContent).toContain('다시 시도')
  fireEvent.click(button('패스키 추가'))
  fireEvent.click(button('패스키 추가'))
  expect(api.addPasskey).toHaveBeenCalledTimes(2)
  await act(async () => added.resolve(fresh))
  await screen.findByText('패스키를 추가했습니다.')
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  expect(getAccessToken()).toBe(fresh.accessToken)
  expect(getRefreshToken()).toBe(fresh.refreshToken)
})

it('does not install a device session for another user', async () => {
  vi.mocked(api.addPasskey).mockResolvedValue(other)
  display()
  await listed()
  fireEvent.click(button('패스키 추가'))
  expect((await screen.findByRole('alert')).textContent).toContain('현재 계정')
  expect(getAccessToken()).toBe(session.accessToken)
})

it('cancels deletion locally, then revokes exactly the confirmed credential and refreshes the list', async () => {
  vi.mocked(api.listPasskeys).mockResolvedValueOnce([first, second]).mockResolvedValue([second])
  display()
  await listed()
  const name = `패스키 ${first.id.slice(-8)} 철회`
  fireEvent.click(button(name))
  fireEvent.click(button('취소'))
  expect(api.removePasskey).not.toHaveBeenCalled()
  fireEvent.click(button(name))
  fireEvent.click(button('확인 후 철회'))
  await screen.findByText(/마지막 패스키/)
  expect(api.removePasskey).toHaveBeenCalledWith(first.id, expect.any(AbortSignal))
  expect(button(/철회/).disabled).toBe(true)
})

it('refreshes the list after LAST_PASSKEY without replaying the approval', async () => {
  vi.mocked(api.listPasskeys).mockResolvedValueOnce([first, second]).mockResolvedValue([first])
  vi.mocked(api.removePasskey).mockRejectedValue({
    response: { status: 409, data: { code: 'LAST_PASSKEY' } },
  })
  display()
  await listed()
  fireEvent.click(button(`패스키 ${first.id.slice(-8)} 철회`))
  fireEvent.click(button('확인 후 철회'))
  expect((await screen.findByRole('alert')).textContent).toContain('마지막 패스키')
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  expect(button(/철회/).disabled).toBe(true)
  expect(api.removePasskey).toHaveBeenCalledTimes(1)
})

it('aborts account changes and ignores an old device session delivered after account switch', async () => {
  const result = deferred<WorkSession>()
  vi.mocked(api.addPasskey).mockReturnValue(result.promise)
  vi.mocked(api.listPasskeys).mockResolvedValueOnce([first]).mockResolvedValue([])
  display()
  await listed()
  fireEvent.click(button('패스키 추가'))
  act(() => setTokens(other))
  expect(vi.mocked(api.addPasskey).mock.calls[0][0]?.aborted).toBe(true)
  await act(async () => result.resolve(fresh))
  await screen.findByText(/첫 패스키를 등록하세요/)
  expect(screen.queryByRole('listitem')).toBeNull()
  expect(getAccessToken()).toBe(other.accessToken)
})
