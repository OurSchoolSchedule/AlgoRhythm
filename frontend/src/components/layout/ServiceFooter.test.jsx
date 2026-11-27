// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '@/App'
import { clearPreviewUserRole, setPreviewUserRole } from '@/api/tokenStorage'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(() => {
  cleanup()
  clearPreviewUserRole()
  vi.unstubAllGlobals()
})

it.each(['로그인', '업무 홈'])('%s 화면에 공개된 문의 주소를 한 번 표시한다', (view) => {
  if (view === '업무 홈') setPreviewUserRole('worker')
  const ui = render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  )
  ui.getByRole('heading', { name: view === '업무 홈' ? '업무 홈' : '우리학교 시간표' })
  const footer = within(ui.getByRole('contentinfo'))
  footer.getByText('© Algorhythm')
  footer.getByText('서비스 문의')
  const email = 'aaaalgorhthm@gmail.com'
  expect(footer.getByRole('link', { name: email }).getAttribute('href')).toBe(`mailto:${email}`)
  expect(footer.queryByText('개발자 연락처')).toBeNull()
})
