// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import client from '@/api/client'
import SchoolJoinForm from './SchoolJoinForm'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('shows both renamed teachers after a conflict and waits for a fresh confirmation', async () => {
  const initial = { schoolId: 42, schoolName: '시연고', baseName: '김민지', displayName: '김민지', confirmation: 'v1' }
  const changed = { ...initial, displayName: '김민지B', renamedFrom: '김민지', renamedTo: '김민지A', confirmation: 'v2' }
  vi.spyOn(client, 'post').mockResolvedValue({ data: initial })
  const submit = vi.fn()
    .mockRejectedValueOnce({ response: { status: 409, data: { code: 'NAME_CONFIRMATION_REQUIRED', proposal: changed } } })
    .mockResolvedValueOnce({ schoolId: 42 })
  const done = vi.fn()
  render(<QueryClientProvider client={new QueryClient()}>
    <SchoolJoinForm initialCode="S42" initialName="김민지" submit={submit} onComplete={done} />
  </QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: '학교·이름 확인' }))
  fireEvent.click(await screen.findByRole('button', { name: '학교 가입 요청' }))
  await screen.findByText('기존 김민지 교사의 표시 이름도 김민지A로 변경됩니다.')
  expect(screen.getByText('김민지B')).toBeTruthy()
  expect(done).not.toHaveBeenCalled()
  expect(submit).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '학교 가입 요청' }))
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
  expect(submit.mock.calls.map(([body]) => body.nameConfirmation)).toEqual(['v1', 'v2'])
})
