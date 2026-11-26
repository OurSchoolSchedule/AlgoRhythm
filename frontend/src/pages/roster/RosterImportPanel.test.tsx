// @vitest-environment jsdom
import { createHash, webcrypto } from 'node:crypto'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import client from '@/api/client'
import { setTokens, clearTokens } from '@/api/tokenStorage'
import RosterImportPanel from './RosterImportPanel'

const scope = '/api/schools/42/roster'
const imports = scope + '/terms/11/imports'
const hash = createHash('sha256').update('fixture').digest('hex')
const counts = { add: 1, update: 0, unchanged: 0, errors: 0 }
const accepted = { previewId: 'preview-1', fileSha256: hash, counts, errors: [], changes: [] }
const saved = {
  rosterId: 8,
  schoolId: 42,
  authEmail: 'math@example.invalid',
  displayName: '김수학',
  term: { termId: 11, subjects: [{ subjectId: 2, subjectName: '수학' }], homeroomClass: null },
}
const old = client.defaults.adapter
let cache: QueryClient
let position: string,
  employment: string,
  previewStatus: number,
  confirmStatus: number,
  confirmed: boolean
let result: unknown
let posts: string[]

beforeEach(() => {
  // jsdom has no native dialog methods. Browser coverage exercises the real dialog.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  vi.stubGlobal('crypto', webcrypto)
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  position = 'ADMIN'
  employment = 'HIRED'
  previewStatus = 200
  confirmStatus = 200
  confirmed = false
  result = accepted
  posts = []
  setTokens({ accessToken: 'test-access', userId: 7 })
  client.defaults.adapter = async (config) => {
    const school = { schoolId: 42, name: '시연고', position, employmentStatus: employment }
    let status = 200
    let data: unknown
    if (config.method === 'post') posts.push(config.url!)
    switch (config.url) {
      case '/api/v2/terms':
        data = [{ termId: 11, academicYear: 2026, semester: 2, startDate: '2026-08-01', endDate: '2026-12-31' }]
        break
      case '/api/mypage/active-school':
        data = school
        break
      case '/api/mypage/admin/schools':
        data = [school]
        break
      case scope:
        data = confirmed ? [saved] : []
        break
      case imports + '/preview':
        expect(config.data).toBeInstanceOf(FormData)
        expect(config.data.get('file').name).toBe('교사.xlsx')
        status = previewStatus
        data = result
        break
      case imports + '/preview-1/confirm':
        expect(JSON.parse(config.data)).toEqual({ fileSha256: hash })
        status = confirmStatus
        if (status === 200) confirmed = true
        data = confirmed ? accepted : { error: 'STALE_ROSTER', message: '명부가 변경되었습니다.' }
        break
      default:
        throw new Error('Unexpected request ' + config.url)
    }
    const response = { data, status, statusText: String(status), headers: {}, config }
    if (config.validateStatus && !config.validateStatus(status))
      throw new AxiosError('요청 실패', undefined, config, null, response)
    return response
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  sessionStorage.clear()
  vi.unstubAllGlobals()
  client.defaults.adapter = old
})
function open() {
  return render(
    <QueryClientProvider client={cache}>
      <RosterImportPanel />
    </QueryClientProvider>,
  )
}
async function chooseTerm() {
  fireEvent.click(await screen.findByRole('button', { name: '2026학년도 2학기 변경' }))
  expect((screen.getByLabelText('등록된 학기') as HTMLSelectElement).value).toBe('11')
  fireEvent.click(screen.getByRole('button', { name: '선택한 학기 적용' }))
  await screen.findByText('이 학기에 등록된 교사가 없습니다.')
}
function file(contents = 'fixture') {
  const f = new File([contents], '교사.xlsx')
  // jsdom File does not implement Blob.arrayBuffer().
  Object.defineProperty(f, 'arrayBuffer', {
    value: async () => new TextEncoder().encode(contents).buffer,
  })
  return f
}
function select(f: File) {
  fireEvent.change(screen.getByLabelText('명부 파일 (.xlsx)'), { target: { files: [f] } })
}
function validate() {
  fireEvent.click(screen.getByRole('button', { name: '파일 검증 및 미리보기' }))
}
const confirm = () => screen.getByRole<HTMLButtonElement>('button', { name: '명부 등록 확정' })
it.each([
  ['TEACHER', 'HIRED'],
  ['ADMIN', 'ON_LEAVE'],
])('권한 없는 %s/%s에게 업로드를 제공하지 않는다', async (role, status) => {
  position = role
  employment = status
  open()
  await waitFor(() => expect(cache.isFetching()).toBe(0))
  expect(screen.queryByLabelText('대상 학교')).toBeNull()
  expect(screen.queryByLabelText('명부 파일 (.xlsx)')).toBeNull()
  expect(
    cache
      .getQueryCache()
      .findAll()
      .some((q) => q.queryKey[0] === 'school-roster'),
  ).toBe(false)
})
it('파일 단위 오류와 셀 위치를 안내하고 같은 파일명의 수정본을 검증한다', async () => {
  open()
  await chooseTerm()
  select(file())
  previewStatus = 422
  result = {
    code: 'INVALID_ROSTER_SHEET',
    message: '병합을 해제하세요.',
    errors: [
      {
        sheet: '교사명부',
        row: 3,
        column: 'B',
        cell: 'B3',
        code: 'MERGED_CELL',
        message: '병합 오류',
      },
    ],
  }
  validate()
  await screen.findByText('교사명부 · B3')
  expect(screen.getByText('병합을 해제하세요.')).toBeTruthy()
  expect(confirm().disabled).toBe(true)
  select(file())
  expect(screen.queryByText('교사명부 · B3')).toBeNull()
  previewStatus = 200
  result = accepted
  validate()
  await screen.findByRole('button', { name: '명부 등록 확정' })
  expect(confirm().disabled).toBe(false)
})
it('해시가 다른 파일은 확정하지 않고, 서버 409는 미리보기를 폐기한다', async () => {
  open()
  await chooseTerm()
  select(file('changed'))
  validate()
  fireEvent.click(await screen.findByRole('button', { name: '명부 등록 확정' }))
  await screen.findByText(/검증 후 파일이 바뀌었습니다/)
  expect(posts).toEqual([imports + '/preview'])
  select(file())
  validate()
  await screen.findByRole('button', { name: '명부 등록 확정' })
  confirmStatus = 409
  fireEvent.click(confirm())
  await screen.findByText(/명부가 변경되었습니다/)
  expect(screen.queryByRole('button', { name: '명부 등록 확정' })).toBeNull()
})
it('연속 클릭은 한 번만 확정하고 해당 학교의 다른 학기와 관련 캐시를 갱신한다', async () => {
  const otherTerm = ['school-roster', 42, 12],
    otherSchool = ['school-roster', 99, 11],
    members = ['store', 'teachers']
  for (const key of [otherTerm, otherSchool, members]) cache.setQueryData(key, [])
  open()
  await chooseTerm()
  select(file())
  validate()
  const submit = await screen.findByRole('button', { name: '명부 등록 확정' })
  act(() => {
    submit.click()
    submit.click()
  })
  await screen.findByText(/명부 확정 완료/)
  expect(screen.getByText('등록된 교사 1명 보기')).toBeTruthy()
  expect(posts.filter((s) => s.endsWith('/confirm'))).toHaveLength(1)
  expect(cache.getQueryState(otherTerm)?.isInvalidated).toBe(true)
  expect(cache.getQueryState(members)?.isInvalidated).toBe(true)
  expect(cache.getQueryState(otherSchool)?.isInvalidated).toBe(false)
})
