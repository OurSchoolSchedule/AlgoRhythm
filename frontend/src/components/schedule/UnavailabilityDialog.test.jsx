// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import client from '@/api/client'
import { clearTokens, setTokens } from '@/api/tokenStorage'
import UnavailabilityDialog from './UnavailabilityDialog'

const adapter = client.defaults.adapter
afterEach(() => {
  cleanup()
  clearTokens()
  client.defaults.adapter = adapter
})

function openDialog({ bells, stored, failFirstSave = false }) {
  const writes = []
  setTokens({ accessToken: 'local-test', userId: 17 })
  client.defaults.adapter = async config => {
    let data
    if (config.url === '/api/mypage/active-school') {
      data = { schoolId: 2, position: 'TEACHER', employmentStatus: 'HIRED' }
    } else if (config.url === '/api/school-setting/periods') {
      data = bells.map(periodNumber => ({ id: periodNumber + 100, periodNumber }))
    } else if (config.url === '/api/me/unavailabilities' && config.method === 'get') {
      data = stored
    } else if (config.url === '/api/me/unavailabilities' && config.method === 'put') {
      const { unavailabilities } = JSON.parse(config.data)
      writes.push(unavailabilities)
      if (failFirstSave && writes.length === 1) throw Error('저장 실패')
      stored = unavailabilities
      data = stored
    } else {
      throw Error('Unexpected request ' + config.method + ' ' + config.url)
    }
    return { config, data, headers: {}, status: 200, statusText: 'OK' }
  }
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={cache}><UnavailabilityDialog onClose={() => {}} /></QueryClientProvider>)
  return writes
}

it('uses registered bells and retains hidden saved entries and reasons when a replacement is retried', async () => {
  const eighth = { dayOfWeek: 'TUE', periodNumber: 8, reason: '연수' }
  const hidden = { dayOfWeek: 'SAT', periodNumber: 3, reason: '기존 사유' }
  const writes = openDialog({ bells: [8, 1], stored: [eighth, hidden], failFirstSave: true })
  await screen.findByRole('button', { name: '화요일 8교시 근무 불가' })
  expect(screen.queryByRole('button', { name: /2교시/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '월요일 1교시 가능' }))
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  await screen.findByRole('status')
  expect(screen.getByRole('button', { name: '월요일 1교시 근무 불가' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  const expected = [eighth, hidden, { dayOfWeek: 'MON', periodNumber: 1 }]
  await waitFor(() => expect(writes).toEqual([expected, expected]))
})

it('clears the last saved block with one atomic empty replacement', async () => {
  const writes = openDialog({ bells: [8], stored: [{ dayOfWeek: 'FRI', periodNumber: 8, id: 81 }] })
  fireEvent.click(await screen.findByRole('button', { name: '금요일 8교시 근무 불가' }))
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  await waitFor(() => expect(writes).toEqual([[]]))
})

it('does not allow a write when the school has no registered bells', async () => {
  const writes = openDialog({ bells: [], stored: [] })
  await screen.findByText('학교에 등록된 교시가 없습니다.')
  expect(screen.getByRole('button', { name: '저장' }).disabled).toBe(true)
  expect(screen.queryByRole('table')).toBeNull()
  expect(writes).toHaveLength(0)
})
