// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import client from '@/api/client.js'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage.js'
import { queryKeys } from '@/hooks/queryKeys.js'
import AIFloatingChat from './AIFloatingChat'

const term = {
  termId: 72,
  academicYear: 2026,
  semester: 2,
  startDate: '2026-09-01',
  endDate: '2027-02-28',
  excludedDates: ['2026-11-24'],
}
const otherTerm = {
  termId: 71,
  academicYear: 2026,
  semester: 1,
  startDate: '2026-03-02',
  endDate: '2026-07-31',
}
const assigned = { userId: 42, schoolUserId: 8, username: '담당 교사' }
const cover = { userId: 43, schoolUserId: 9, username: '공강 교사' }
const source = '2026-11-25'
const other = '2026-11-26'
const original = client.defaults.adapter
let cache, calls, commands

function ownedDay(date) {
  return {
    id: date === source ? 130 : 140,
    termId: term.termId,
    date,
    rev: 3,
    originDate: date,
    actual: { teacherId: assigned.schoolUserId, periodId: 20 },
    subjectId: 12,
    classId: 13,
  }
}
function proposal(intentType, more = {}) {
  return {
    draftToken: null,
    intentType,
    description: '현재 요청을 확인하세요.',
    preview: { userId: assigned.userId, schoolId: 5, termId: term.termId, ...more },
  }
}
beforeEach(() => {
  calls = []
  commands = new Map()
  sessionStorage.clear()
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  setTokens({ accessToken: 'local-test', userId: assigned.userId })
  client.defaults.adapter = async (config) => {
    const url = config.url
    const body = config.data ? JSON.parse(config.data) : undefined
    calls.push({ url, body, params: config.params })
    let data
    let status = 200
    if (url === '/api/mypage/active-school')
      data = { schoolId: 5, position: 'TEACHER', employmentStatus: 'HIRED' }
    else if (url === '/api/v2/terms') data = [term, otherTerm]
    else if (url === '/api/school/teachers') data = [assigned, cover]
    else if (url === '/api/school-setting/periods') data = [{ id: 20, periodNumber: 2 }]
    else if (url === '/api/school/subjects') data = [{ id: 12, name: '수학' }]
    else if (url === '/api/school/classes') data = [{ id: 13, grade: 2, classNumber: 1 }]
    else if (url === '/api/voice-commands/preview') data = await commands.get(body.text)
    else if (url === '/api/v2/terms/72/lessons') {
      const owned = ownedDay(config.params.date)
      data = [
        owned,
        { ...owned, id: 210, actual: { ...owned.actual, teacherId: cover.schoolUserId } },
      ]
    } else if (url.endsWith('/candidates'))
      data = config.params.kind === 'SWAP' ? [210] : [cover.schoolUserId]
    else if (config.method === 'post' && url.includes('/lesson-changes')) {
      status = 201
      const receipt = {
        id: 90,
        termId: term.termId,
        requester: assigned.schoolUserId,
        responder: cover.schoolUserId,
        firstId: body.firstId,
        firstRev: body.firstRev,
        rev: 0,
        state: 'PENDING',
      }
      data =
        body.kind === 'SWAP'
          ? { ...receipt, kind: 'SWAP', secondId: body.secondId, secondRev: body.secondRev }
          : [{ ...receipt, kind: 'SUBSTITUTE', secondId: null, secondRev: null }]
    } else throw new Error('예상 밖의 요청 ' + url)
    return { status, statusText: 'OK', headers: {}, config, data }
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = original
})
function mountAssistant() {
  return render(
    <QueryClientProvider client={cache}>
      <AIFloatingChat />
    </QueryClientProvider>,
  )
}
async function open() {
  const ui = mountAssistant()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'AI 도우미 열기' }).disabled).toBe(false),
  )
  fireEvent.click(screen.getByRole('button', { name: 'AI 도우미 열기' }))
  await screen.findByRole('option', { name: '2026학년도 2학기' })
  return ui
}
async function ask(text, reply, result) {
  commands.set(text, reply)
  fireEvent.change(screen.getByRole('textbox', { name: '도우미에 보낼 질문' }), {
    target: { value: text },
  })
  fireEvent.click(screen.getByRole('button', { name: '명령 보내기' }))
  if (result) await screen.findByText(result)
}
function queriedDates() {
  return calls.filter((c) => c.url.endsWith('/lessons')).map((c) => c.params.date)
}

it('uses the active term, resolves an explicit date conflict, and discards reviewed recipients on a date change', async () => {
  await open()
  await ask('수요일 보결', proposal('COVER_OPTIONS', { date: source, dateFromText: true }))
  const lesson = await screen.findByLabelText('내 수업', { exact: true })
  expect(calls.find((c) => c.url.endsWith('/preview')).body).toEqual({
    text: '수요일 보결',
    lang: 'ko',
    schoolId: 5,
    termId: 72,
  })
  fireEvent.change(lesson, { target: { value: '130/3' } })
  const candidate = await screen.findByRole('checkbox', { name: '공강 교사' })
  fireEvent.click(candidate)
  fireEvent.click(screen.getByRole('button', { name: '요청 내용 확인' }))
  expect(screen.getByText(/요청 수업 2026-11-25/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('요청 날짜'), { target: { value: other } })
  expect(screen.queryByRole('button', { name: '확인하고 요청 보내기' })).toBeNull()
  expect(queriedDates()).toEqual([source])
  fireEvent.click(screen.getByRole('button', { name: /선택 날짜 사용/ }))
  await waitFor(() =>
    expect(screen.getByLabelText('내 수업', { exact: true }).options[1]?.value).toBe('140/3'),
  )
  expect(queriedDates()).toEqual([source, other])
  await ask(
    '수요일 명령 다시',
    proposal('COVER_OPTIONS', { date: source, dateFromText: true, dateConflict: true }),
  )
  await screen.findByRole('button', { name: /문장 날짜 사용/ })
  expect(calls.filter((c) => c.url.endsWith('/preview')).at(-1).body.requestDate).toBe(other)
  fireEvent.click(screen.getByRole('button', { name: /문장 날짜 사용/ }))
  expect(screen.getByLabelText('요청 날짜').value).toBe(source)
  expect(screen.getByLabelText('업무 학기').value).toBe('72')
  expect(screen.queryByRole('button', { name: '확인하고 요청 보내기' })).toBeNull()
  expect(calls.some((c) => c.url.endsWith('/substitutes'))).toBe(false)
})
it('submits only the explicitly reviewed source and target dates with their dated lesson IDs', async () => {
  await open()
  await ask(
    '이틀의 수업을 교환',
    proposal('SWAP_OPTIONS', {
      date: source,
      dateFromText: true,
      targetDate: other,
      targetDateFromText: true,
    }),
  )
  expect((await screen.findByLabelText('요청 날짜')).value).toBe(source)
  expect(screen.getByLabelText('상대 수업 날짜').value).toBe(other)
  fireEvent.change(await screen.findByLabelText('내 수업', { exact: true }), {
    target: { value: '130/3' },
  })
  fireEvent.click(await screen.findByRole('radio', { name: /2026-11-26/ }))
  fireEvent.click(screen.getByRole('button', { name: '요청 내용 확인' }))
  expect(screen.getByText(/요청 수업 2026-11-25/)).toBeTruthy()
  expect(screen.getByText(/상대 수업 공강 교사 · 2026-11-26/)).toBeTruthy()
  expect(calls.some((c) => c.url.endsWith('/lesson-changes'))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '확인하고 요청 보내기' }))
  await screen.findByText(/접수 완료/)
  expect(calls.find((c) => c.url.endsWith('/lesson-changes')).body).toEqual({
    kind: 'SWAP',
    firstId: 130,
    firstRev: 3,
    firstDate: source,
    secondId: 210,
    secondRev: 3,
    secondDate: other,
  })
})
it('shows date-free guidance, and never reads a substitute day for an excluded or outside day', async () => {
  await open()
  await ask(
    '사용법',
    { intentType: 'GUIDE', description: '수업을 고르는 방법입니다.', preview: {} },
    '수업을 고르는 방법입니다.',
  )
  expect(screen.queryByLabelText('요청 날짜')).toBeNull()
  expect(screen.queryByRole('button', { name: '실행' })).toBeNull()
  await ask(
    '시험일 내 시간표',
    proposal('MY_WEEK', { range: 'DAY', date: term.excludedDates[0], dateFromText: true }),
    /정규 수업 제외일입니다/,
  )
  await ask(
    '학기 밖 내 시간표',
    proposal('MY_WEEK', { range: 'DAY', date: '2027-03-01', dateFromText: true }),
    '업무 학기 기간 밖의 날짜입니다.',
  )
  expect(queriedDates()).toEqual([])
})
it('ignores a pending preview from the previous term while preserving the written question', async () => {
  await open()
  let finish
  const response = new Promise((resolve) => {
    finish = resolve
  })
  await ask('월요일 1교시 근무 불가', response, '명령을 확인하고 있습니다.')
  const termPicker = screen.getByLabelText('업무 학기')
  fireEvent.change(termPicker, { target: { value: '71' } })
  await act(async () =>
    finish({
      draftToken: 'old',
      intentType: 'AVAILABILITY_ADD',
      description: '이전 제안',
      preview: {},
    }),
  )
  expect(
    within(screen.getByRole('dialog')).getByText('월요일 1교시 근무 불가', { selector: 'p' }),
  ).toBeTruthy()
  expect(screen.queryByText('이전 제안')).toBeNull()
  expect(screen.queryByRole('button', { name: '실행' })).toBeNull()
  expect(queriedDates()).toEqual([])
})

it('restores only user text across same-school roster checks and clears it on closing or changing schools', async () => {
  const ui = await open()
  const command = '근무 불가 등록 질문'
  const question = '아직 보내지 않은 질문'
  await ask(
    command,
    {
      intentType: 'AVAILABILITY_ADD',
      draftToken: 'prior-token',
      description: '이전 실행 제안',
      preview: {},
    },
    '이전 실행 제안',
  )
  fireEvent.change(screen.getByLabelText('도우미에 보낼 질문'), { target: { value: question } })
  fireEvent.change(screen.getByLabelText('업무 학기'), { target: { value: '71' } })
  ui.unmount()
  const restored = mountAssistant()
  expect((await screen.findByLabelText('업무 학기')).value).toBe('71')
  expect(screen.getByText(command)).toBeTruthy()
  expect(screen.getByLabelText('도우미에 보낼 질문').value).toBe(question)
  expect(screen.queryByRole('button', { name: '실행' })).toBeNull()
  expect(screen.queryByText('이전 실행 제안')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '질문 닫기' }))
  fireEvent.click(screen.getByRole('button', { name: 'AI 도우미 열기' }))
  expect(screen.queryByText(command)).toBeNull()
  expect(screen.getByLabelText('도우미에 보낼 질문').value).toBe('')
  fireEvent.change(screen.getByLabelText('도우미에 보낼 질문'), { target: { value: question } })
  restored.unmount()
  cache.setQueryData(
    queryKeys.home.active({ userId: assigned.userId, generation: getSessionVersion() }),
    { schoolId: 6, position: 'TEACHER', employmentStatus: 'HIRED' },
  )
  mountAssistant()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'AI 도우미 열기' }))
  expect(screen.getByLabelText('도우미에 보낼 질문').value).toBe('')
})
