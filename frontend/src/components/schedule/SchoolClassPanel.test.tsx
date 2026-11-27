// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import client from '@/api/client'
import { clearTokens, setTokens } from '@/api/tokenStorage'
import ClassRoles from '@/pages/roster/ClassRoles'
import SchoolClassPanel from './SchoolClassPanel'

const oldAdapter = client.defaults.adapter
afterEach(() => {
  cleanup()
  clearTokens()
  sessionStorage.clear()
  client.defaults.adapter = oldAdapter
})

it('shows the imported teaching memberships by class ID and selected term, including a warm classroom cache', async () => {
  const school = { schoolId: 42, name: '시연고', position: 'ADMIN', employmentStatus: 'HIRED' }
  const terms = [
    { termId: 22, academicYear: 2026, semester: 2, startDate: '2026-08-01', endDate: '2026-12-31' },
    { termId: 11, academicYear: 2026, semester: 1, startDate: '2026-03-02', endDate: '2026-07-20' },
  ]
  const classes = [2, 1].map((id) => ({
    id,
    academicYear: 2026,
    grade: 1,
    classNumber: id,
    homeroomTeacherName: '기본 담임',
  }))
  const teacher = (schoolUserId: number, displayName: string) => ({ schoolUserId, displayName })
  let imported = false
  const roles = () =>
    [1, 2].map((classId) => ({
      classId,
      academicYear: 2026,
      grade: 1,
      classNumber: classId,
      homeroomTeacher: teacher(10 + classId, imported ? '담임' + classId : '기존' + classId),
      deputyTeacher: imported ? teacher(20 + classId, '부담임' + classId) : null,
    }))
  setTokens({ accessToken: 'local-test', userId: 7 })
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.defaults.adapter = async (config) => {
    let data
    switch (config.url) {
      case '/api/mypage/active-school':
      case '/api/school/me':
        data = school
        break
      case '/api/v2/terms':
        data = terms
        break
      case '/api/school/classes':
        expect(config.params.academicYear).toBe(2026)
        data = classes
        break
      case '/api/school/members':
        data = []
        break
      case '/api/v2/terms/22/homerooms':
        data = roles()
        break
      case '/api/v2/terms/22/homerooms/import':
        expect(config.method).toBe('post')
        imported = true
        data = roles()
        break
      case '/api/v2/terms/11/homerooms':
        data = classes.map((c) => ({
          classId: c.id,
          homeroomTeacher: teacher(80, '1학기 교사'),
          deputyTeacher: null,
        }))
        break
      default:
        throw Error('Unexpected ' + config.url)
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  render(
    <QueryClientProvider client={cache}>
      <SchoolClassPanel />
      <ClassRoles scope={{ schoolId: 42, termId: 22 }} />
    </QueryClientProvider>,
  )
  const choose = await screen.findByLabelText('대상 학기')
  fireEvent.change(choose, { target: { value: '22' } })
  await screen.findByRole('region', { name: '학급 목록' })
  const table = () => within(screen.getByRole('region', { name: '학급 목록' }))
  await table().findByRole('cell', { name: '기존2' })
  fireEvent.change(screen.getByLabelText('학급 담당 파일 (.xlsx)'), {
    target: { files: [new File(['test'], '학급담당.xlsx')] },
  })
  fireEvent.click(screen.getByRole('button', { name: '담임·부담임 적용' }))
  await table().findByRole('cell', { name: '부담임2' })
  expect(table().getByRole('row', { name: /1-2 담임2 부담임2/ })).toBeTruthy()
  expect(table().getByRole('row', { name: /1-1 담임1 부담임1/ })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('대상 학기'), { target: { value: '11' } })
  await waitFor(() => expect(table().getAllByRole('cell', { name: '1학기 교사' })).toHaveLength(2))
  expect(table().queryByRole('cell', { name: '부담임2' })).toBeNull()
  expect(table().getAllByRole('cell', { name: '미배정' })).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('대상 학기'), { target: { value: '22' } })
  await waitFor(() => expect(table().getByRole('row', { name: /1-1 담임1 부담임1/ })).toBeTruthy())
})
