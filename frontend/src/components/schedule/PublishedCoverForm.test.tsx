// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import client from '@/api/client'
import { clearTokens, setTokens } from '@/api/tokenStorage'
import PublishedCoverForm from './PublishedCoverForm'

const adapter = client.defaults.adapter

afterEach(() => {
  cleanup()
  clearTokens()
  client.defaults.adapter = adapter
})

it('binds public recruitment to the matching dated lesson and revision once', async () => {
  const date = '2026-11-30'
  const termId = 20
  const lesson = { weeklyLessonId: 10, periodSettingId: 31, teacherId: 28 }
  const target = { id: 52, originId: 10, termId, date, rev: 3, actual: { periodId: 31, teacherId: 28 } }
  const posted: unknown[] = []
  setTokens({ accessToken: 'test-admin', userId: 7 })
  client.defaults.adapter = async (config) => {
    let data
    switch (config.url) {
      case '/api/mypage/active-school':
        data = { schoolId: 2, position: 'ADMIN', employmentStatus: 'HIRED' }
        break
      case '/api/v2/terms/20/lessons':
        expect(config.params.date).toBe(date)
        data = [
          { ...target, id: 48, termId: 99 },
          { ...target, id: 49, actual: { ...target.actual, cancelled: true } },
          { ...target, id: 50, originId: 99 },
          { ...target, id: 51, actual: { ...target.actual, teacherId: 29 } },
          target,
        ]
        break
      case '/api/substitutes/requests':
        posted.push(JSON.parse(config.data))
        data = { id: 45 }
        break
      default:
        throw new Error(config.url)
    }
    return { status: 200, statusText: 'OK', data, headers: {}, config }
  }
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PublishedCoverForm termId={termId} lesson={lesson} date={date} periodLabel="3교시" />
    </QueryClientProvider>,
  )
  const field = await screen.findByLabelText('보결 모집 날짜') as HTMLInputElement
  expect(field.value).toBe(date)
  expect(field.readOnly).toBe(true)
  fireEvent.change(screen.getByPlaceholderText('사유 (선택)'), { target: { value: '출장' } })
  const send = screen.getByRole('button', { name: '보결 요청 보내기' }) as HTMLButtonElement
  fireEvent.click(send)
  await screen.findByText('보결 요청을 보냈습니다.')
  expect(send.disabled).toBe(true)
  expect(posted).toEqual([{ termId, datedLessonId: 52, expectedLessonRev: 3, substituteDate: date, note: '출장' }])
})
