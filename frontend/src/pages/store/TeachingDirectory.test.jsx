// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it } from 'vitest'
import client from '@/api/client'
import { clearTokens, setTokens } from '@/api/tokenStorage'
import { useHomeSession } from '@/hooks/useHomeSession'
import TeachingDirectory from './TeachingDirectory'

const originalAdapter = client.defaults.adapter
afterEach(() => {
  cleanup()
  client.defaults.adapter = originalAdapter
  clearTokens()
})

it('keeps namesakes separate and sends the selected catalog ID when a filtered subject is deleted', async () => {
  const school = {
    schoolId: 7,
    name: '테스트 학교',
    position: 'ADMIN',
    employmentStatus: 'HIRED',
  }
  const term = { schoolId: 7, termId: 23, academicYear: 2026, semester: 2 }
  let subjects = [
    { id: 10, name: '수학' },
    { id: 11, name: '수학 연습' },
  ]
  const deletions = []
  const teachers = [
    {
      rosterId: 1,
      schoolUserId: 8,
      displayName: '김민지',
      subjectIds: [10],
      grades: [1, 3],
    },
    {
      rosterId: 2,
      schoolUserId: null,
      displayName: '김민지',
      subjectIds: [10],
      grades: [],
    },
  ]
  client.defaults.adapter = async (config) => {
    let data
    if (config.url === '/api/mypage/active-school') data = school
    else if (config.url === '/api/v2/terms/23/teaching-directory')
      data = { ...term, loadId: 6, subjects, teachers }
    else if (
      config.method === 'delete' &&
      config.url === '/api/school/subjects/11'
    ) {
      deletions.push(config.url)
      subjects = subjects.filter((s) => s.id !== 11)
    } else throw new Error('Unexpected request ' + config.url)
    return { data, config, headers: {}, status: 200, statusText: 'OK' }
  }
  setTokens({ accessToken: 'local-fixture', userId: 3 })
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function View() {
    const session = useHomeSession()
    return <TeachingDirectory term={term} session={session} />
  }
  render(
    <QueryClientProvider client={cache}>
      <View />
    </QueryClientProvider>,
  )
  await screen.findByText('수학 연습')
  fireEvent.click(screen.getByRole('button', { name: '교사별' }))
  const first = screen.getByText('김민지 (명부 1)').closest('li')
  const second = screen.getByText('김민지 (명부 2)').closest('li')
  expect(within(first).getByText('1학년, 3학년')).toBeTruthy()
  expect(within(second).getByText('배정된 학년 없음')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '과목별' }))
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '연습' } })
  fireEvent.click(screen.getByRole('button', { name: '삭제' }))
  await waitFor(() =>
    expect(screen.getByText('검색 결과가 없습니다.')).toBeTruthy(),
  )
  expect(deletions).toEqual(['/api/school/subjects/11'])
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
  expect(screen.getByText('수학')).toBeTruthy()
})
