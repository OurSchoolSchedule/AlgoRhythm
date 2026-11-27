// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import client from '@/api/client.js'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage.js'
import { queryKeys } from '@/hooks/queryKeys.js'
import ScheduleProgress from '@/components/schedule/ScheduleProgress'
import ScheduleCreateView from './ScheduleCreateView'
import CandidateGrid from './CandidateGrid'
import LessonChangesView from './LessonChangesView'

const base = '/api/v2/terms/547001'
const registered = { termId: 547001, academicYear: 2026, semester: 2, startDate: '2026-08-20', endDate: '2027-02-20' }
let terms: typeof registered[]
const job = {
  jobId: 'job-42',
  expectedPublishRev: 0,
  statusUrl: base + '/generations/job-42',
  state: 'QUEUED',
}
const candidate = {
  candidateId: 'c1',
  score: {
    wantsMet: 0,
    wantsTotal: 0,
    avoidsMet: 0,
    avoidsTotal: 0,
    teachersWithNoWantMet: 0,
  },
  placements: [
    {
      classId: '3',
      teacherId: '2',
      subjectId: '1',
      slot: { day: 'MON', period: 1 },
    },
  ],
}
const oldAdapter = client.defaults.adapter
let cache: QueryClient
const identity = () => ({ userId: 541000, generation: getSessionVersion() })
function mount(role = 'ADMIN', view = <ScheduleCreateView />) {
  cache.setQueryData(queryKeys.home.active(identity()), {
    schoolId: 540001,
    position: role,
    employmentStatus: 'HIRED',
  })
  return render(
    <QueryClientProvider client={cache}>
      {view}
    </QueryClientProvider>,
  )
}
function failure(config: InternalAxiosRequestConfig, status: number, data: unknown): never {
  throw new AxiosError('HTTP ' + status, undefined, config, undefined, {
    config,
    data,
    status,
    statusText: '',
    headers: {},
  })
}
function adapter(handler: (config: InternalAxiosRequestConfig) => [number, unknown]) {
  client.defaults.adapter = async (config) => {
    const [status, data] = handler(config)
    return { status, data, config, headers: {}, statusText: '' }
  }
}
async function register() {
  fireEvent.click(await screen.findByRole('button', { name: '새 학기 등록' }))
  fireEvent.change(screen.getByLabelText('시작일'), {
    target: { value: '2026-08-20' },
  })
  fireEvent.change(screen.getByLabelText('종료일'), {
    target: { value: '2027-02-20' },
  })
  fireEvent.click(screen.getByRole('button', { name: '새 학기 등록 확정' }))
}
beforeEach(() => {
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  terms = []
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  sessionStorage.clear()
  setTokens({ accessToken: 'local-test', userId: 541000 })
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = oldAdapter
  vi.unstubAllGlobals()
})

it('재직 교사는 직접 진입해도 편성·학기 등록 요청을 보낼 수 없다', () => {
  const request = vi.fn()
  client.defaults.adapter = request
  mount('TEACHER')
  expect(screen.getByRole('status').textContent).toContain('권한이 없습니다')
  expect(screen.queryByLabelText('시수표 엑셀 파일')).toBeNull()
  expect(request).not.toHaveBeenCalled()
})

it('학기 중복이면 기간을 보존하고 새로 조회된 목록에서 적용할 수 있다', async () => {
  let reads = 0
  adapter(config => {
    if (config.url !== '/api/v2/terms') return [200, []]
    if (config.method === 'get') return [200, ++reads === 1 ? [] : [registered]]
    return failure(config, 409, { code: 'TERM_EXISTS' })
  })
  mount()
  await register()
  expect((await screen.findByRole('alert')).textContent).toContain('목록에서 기존 학기를 선택')
  expect((screen.getByLabelText('시작일') as HTMLInputElement).value).toBe('2026-08-20')
  expect(await screen.findByRole('option', { name: '2026학년도 2학기' })).toBeTruthy()
})

it('등록된 학기를 선택하고 파일 오류를 수정해 선택한 조건의 후보 표를 검토한 뒤 게시 충돌을 처리한다', async () => {
  const selected = {
    termId: 204,
    academicYear: 2025,
    semester: 2,
    startDate: '2025-08-20',
    endDate: '2026-02-20',
  }
  terms = [registered, selected]
  const selectedBase = `/api/v2/terms/${selected.termId}`
  const accepted = { ...job, statusUrl: selectedBase + '/generations/' + job.jobId }
  const slots = ['MON', 'TUE', 'WED', 'THU', 'FRI'].flatMap((day) =>
    [1, 2].map((period) => ({ day, period })),
  )
  const gradeLastPeriods = [
    { grade: 1, lastPeriods: { MON: 2, TUE: 2, WED: 2, THU: 2, FRI: 1 } },
    { grade: 2, lastPeriods: { MON: 1, TUE: 2, WED: 2, THU: 2, FRI: 2 } },
    { grade: 3, lastPeriods: { MON: 2, TUE: 2, WED: 0, THU: 2, FRI: 2 } },
  ]
  let uploads = 0,
    publications = 0,
    jobReads = 0,
    lessonReads = 0
  adapter((config) => {
    const url = config.url
    if (url === '/api/v2/terms') {
      expect(config.method).toBe('get')
      return [200, terms]
    }
    if (url === '/api/school-setting/periods')
      return [200, [{ periodNumber: 1 }, { periodNumber: 2 }]]
    if (url === '/api/school/classes') {
      expect(config.params.academicYear).toBe(2025)
      return [200, [
        { id: 3, grade: 1, classNumber: 1 },
        { id: 4, grade: 2, classNumber: 1 },
        { id: 5, grade: 3, classNumber: 1 },
      ]]
    }
    if (url === '/api/school/subjects') return [200, [{ id: 1, name: '수학' }]]
    if (url === '/api/school/members') return [200, [{ schoolUserId: 2, username: '김민지A' }]]
    if (url === selectedBase + '/load-imports/validate') {
      if (++uploads === 1)
        return failure(config, 422, {
          code: 'INVALID_LOAD',
          message: '시수표 확인',
          fieldErrors: [
            {
              sheet: '시수표',
              row: 2,
              column: 'C',
              cell: 'C2',
              code: 'INVALID_HOURS',
              message: '잘못된 시수',
            },
          ],
        })
      return [
        200,
        {
          sheet: '시수표',
          validatedLoadId: 'load-42',
          totalPeriods: 1,
          demands: [{ teacherId: '2', classId: '3', subjectId: '1', weeklyPeriods: 1 }],
        },
      ]
    }
    if (url === selectedBase + '/generations') {
      expect(JSON.parse(config.data)).toEqual({
        validatedLoadId: 'load-42',
        preferences: [{ teacherId: '2', kind: 'WANT', anyOf: [{ day: 'MON', period: 1 }] }],
        objective: 'PREFER_WANTS',
        gradeLastPeriods,
        teachingSlots: slots,
      })
      return [202, accepted]
    }
    if (url === accepted.statusUrl) {
      jobReads++
      return [
        200,
        {
          ...accepted,
          state: 'READY',
          teachingSlots: slots,
          gradeLastPeriods,
          classGrades: { 3: 1, 4: 2, 5: 3 },
          registeredPeriods: [1, 2],
          objective: 'PREFER_WANTS',
          result: { status: 'READY', candidates: [candidate] },
        },
      ]
    }
    if (url === selectedBase + '/publications') {
      publications++
      expect(JSON.parse(config.data)).toEqual({
        jobId: job.jobId,
        candidateId: 'c1',
        expectedPublishRev: 0,
        effectiveFrom: '2025-11-24',
      })
      return failure(config, 409, {
        code: 'STALE_PUBLICATION',
        message: '게시 버전 변경',
        currentRev: 1,
      })
    }
    if (url === selectedBase + '/lessons') lessonReads++
    return [200, []]
  })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: /학기 설정$/ }))
  const picker = within(await screen.findByRole('dialog'))
  const option = picker.getByRole('option', { name: '2025학년도 2학기' }) as HTMLOptionElement
  fireEvent.change(picker.getByLabelText('등록된 학기'), { target: { value: option.value } })
  fireEvent.click(picker.getByRole('button', { name: '선택한 학기 적용' }))
  await screen.findByRole('button', { name: /2025학년도 2학기 · 학기 설정/ })
  const file = await screen.findByLabelText('시수표 엑셀 파일')
  fireEvent.change(file, {
    target: { files: [new File(['workbook'], 'school.xlsx')] },
  })
  const form = (file as HTMLInputElement).form!
  fireEvent.submit(form)
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toMatch(/시수표 · C2.*2행.*C열.*INVALID_HOURS/)
  fireEvent.submit(form)
  await screen.findByText(/검증 완료 · 배정 1건/)
  const generate = (await screen.findByRole('button', { name: '후보 생성' })) as HTMLButtonElement
  const matrix = within(screen.getByRole('table', { name: '학년별 요일별 마지막 교시' }))
  expect(matrix.getAllByRole('combobox')).toHaveLength(15)
  expect(matrix.queryByLabelText(/토요일|일요일/)).toBeNull()
  fireEvent.change(matrix.getByLabelText('1학년 금요일 마지막 교시'), { target: { value: '1' } })
  fireEvent.change(matrix.getByLabelText('2학년 월요일 마지막 교시'), { target: { value: '1' } })
  fireEvent.change(matrix.getByLabelText('3학년 수요일 마지막 교시'), { target: { value: '0' } })
  expect((matrix.getByLabelText('1학년 금요일 마지막 교시') as HTMLSelectElement).value).toBe('1')
  const grade1 = within(matrix.getByRole('rowheader', { name: '1학년' }).closest('tr')!)
  const grade3 = within(matrix.getByRole('rowheader', { name: '3학년' }).closest('tr')!)
  expect(grade1.getByText('9칸 / 1차시')).toBeTruthy()
  expect(grade3.getByText('8칸 / 0차시')).toBeTruthy()
  fireEvent.click(screen.getByText('교사별 시간 선호 (선택)'))
  fireEvent.click(screen.getByRole('button', { name: '선호 추가' }))
  fireEvent.change(screen.getByLabelText('후보 평가 기준 (선택)'), { target: { value: 'PREFER_WANTS' } })
  expect(generate.disabled).toBe(true)
  fireEvent.click(await screen.findByRole('checkbox', { name: /학급별 공강/ }))
  expect(generate.disabled).toBe(false)
  fireEvent.click(generate)
  const candidates = await screen.findAllByRole('radio')
  expect(candidates).toHaveLength(1)
  fireEvent.click(candidates[0])
  const grid = within(await screen.findByRole('table', { name: '선택한 학급의 주간 배치' }))
  const lesson = within(grid.getByRole('button'))
  expect(await lesson.findByText('수학')).toBeTruthy()
  expect(await lesson.findByText('김민지A')).toBeTruthy()
  const secondRow = grid.getByRole('rowheader', { name: '2교시' }).closest('tr')!
  expect(within(secondRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    '공강', '공강', '공강', '공강', '수업 없음',
  ])
  fireEvent.change(screen.getByLabelText('학급'), { target: { value: '4' } })
  const secondGradeRow = screen.getByRole('rowheader', { name: '2교시' }).closest('tr')!
  expect(within(secondGradeRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    '수업 없음', '공강', '공강', '공강', '공강',
  ])
  fireEvent.change(screen.getByLabelText('게시 적용일'), {
    target: { value: '2025-11-24' },
  })
  const publish = screen.getByRole('button', {
    name: '선택한 후보 게시 확정',
  }) as HTMLButtonElement
  fireEvent.click(publish)
  await screen.findByRole('button', { name: '후보 다시 생성 준비' })
  expect(screen.getByRole('alert').textContent).toMatch(/최신 작업 READY.*서버 버전 1/)
  expect(jobReads).toBe(2)
  expect(lessonReads).toBe(1)
  expect(publish.disabled).toBe(true)
  expect((candidates[0] as HTMLInputElement).checked).toBe(false)
  expect(publications).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: '후보 다시 생성 준비' }))
  await waitFor(() => expect(screen.queryByRole('radio')).toBeNull())
  expect(publications).toBe(1)
})

it('학년 설정이 없는 과거 작업은 공통 슬롯과 주말을 보존하고 등록된 교시만 표시한다', () => {
  render(<CandidateGrid
    slots={[{ day: 'MON', period: 1 }, { day: 'SAT', period: 3 }]}
    registeredPeriods={[1, 3, 5]}
    placements={[]}
    room="3"
    subjectName={String}
    teacherName={String}
  />)
  const table = within(screen.getByRole('table', { name: '선택한 학급의 주간 배치' }))
  expect(table.getByRole('columnheader', { name: '토요일' })).toBeTruthy()
  expect(table.queryByRole('columnheader', { name: '일요일' })).toBeNull()
  expect(table.queryByRole('rowheader', { name: '2교시' })).toBeNull()
  const third = table.getByRole('rowheader', { name: '3교시' }).closest('tr')!
  expect(within(third).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
    '수업 없음', '수업 없음', '수업 없음', '수업 없음', '수업 없음', '공강',
  ])
  const fifth = table.getByRole('rowheader', { name: '5교시' }).closest('tr')!
  expect(within(fifth).getAllByText('수업 없음')).toHaveLength(6)
})

it.each([false, true])(
  '업로드·검증·편성 진행 상태는 한 번만 읽고 모션 설정을 따른다 (%s)',
  (reduced) => {
    vi.stubGlobal('matchMedia', () => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { container, rerender } = render(
      <ScheduleProgress progress={{ phase: 'uploading', percent: 43 }} />,
    )
    expect(screen.getByRole('status').textContent).toContain('43%')
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
    expect(container.querySelector('.work-track')?.getAttribute('data-motion')).toBe(
      reduced ? 'still' : 'walk-right',
    )
    for (const progress of [
      { phase: 'uploading', percent: null },
      { phase: 'validating' },
      { phase: 'queued', jobId: 'x' },
      { phase: 'running', jobId: 'x' },
    ] as const) {
      rerender(<ScheduleProgress progress={progress} />)
      expect(screen.getAllByRole('status')).toHaveLength(1)
      expect(screen.getByRole('status').textContent).not.toMatch(/%/)
      expect(!!container.querySelector('[data-mode="indeterminate"]')).toBe(!reduced)
    }
    rerender(<ScheduleProgress progress={{ phase: 'finished', jobId: 'x', outcome: 'FAILED' }} />)
    expect(screen.getByRole('status').textContent).toContain('후보 생성 실패')
    expect(container.querySelector('img')).toBeNull()
  },
)

it('학교 총합이 같아도 초과 학급을 차단하고, 파일을 교체하면 공강 동의를 다시 받는다', async () => {
  const loads = [
    [31, 33],
    [30, 32],
    [30, 32],
  ]
  let submissions = 0
  adapter((config) => {
    if (config.url === '/api/v2/terms') {
      if (config.method === 'get') return [200, terms]
      terms = [registered]
      return [201, { termId: registered.termId }]
    }
    if (config.url === '/api/school-setting/periods')
      return [200, [1, 2, 3, 5, 6, 7, 8].map((periodNumber) => ({ periodNumber }))]
    if (config.url === '/api/school/classes')
      return [200, [{ id: 1, grade: 1, classNumber: 1 }, { id: 2, grade: 1, classNumber: 2 }]]
    if (config.url === base + '/load-imports/validate') {
      const hours = loads.shift()!
      return [
        200,
        {
          sheet: '시수표',
          validatedLoadId: 'load-' + loads.length,
          totalPeriods: hours[0] + hours[1],
          demands: hours.map((weeklyPeriods, i) => ({
            teacherId: '2',
            subjectId: '1',
            classId: String(i + 1),
            weeklyPeriods,
          })),
        },
      ]
    }
    if (config.url === base + '/generations') submissions++
    return [200, []]
  })
  mount()
  await register()
  const file = await screen.findByLabelText('시수표 엑셀 파일')
  async function upload(name: string) {
    fireEvent.change(file, { target: { files: [new File(['load'], name)] } })
    expect(screen.queryByRole('checkbox', { name: /학급별 공강/ })).toBeNull()
    fireEvent.submit((file as HTMLInputElement).form!)
    await screen.findByText(/검증 완료 · 배정 2건/)
    const monday = await screen.findByLabelText('1학년 월요일 마지막 교시')
    expect(within(monday).queryByRole('option', { name: '4' })).toBeNull()
    for (const d of ['화', '수', '금']) {
      fireEvent.change(screen.getByLabelText('1학년 ' + d + '요일 마지막 교시'), { target: { value: '7' } })
    }
  }
  await upload('31+33.xlsx')
  const gradeLoads = () => within(screen.getByRole('table', { name: '학년별 요일별 마지막 교시' }))
  expect(gradeLoads().getByText('32칸 / 31차시')).toBeTruthy()
  expect(gradeLoads().getByText('-1 공강')).toBeTruthy()
  expect(gradeLoads().getByText('32칸 / 33차시')).toBeTruthy()
  expect(gradeLoads().getByText('+1 초과')).toBeTruthy()
  expect(screen.getByText(/33차시 · 1차시 초과/)).toBeTruthy()
  expect((screen.getByRole('button', { name: '후보 생성' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  await upload('30+32.xlsx')
  expect(gradeLoads().getByText('-2 공강')).toBeTruthy()
  expect(gradeLoads().getByText('일치')).toBeTruthy()
  const generate = screen.getByRole('button', { name: '후보 생성' }) as HTMLButtonElement
  expect(generate.disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /학급별 공강/ }))
  expect(generate.disabled).toBe(false)
  await upload('30+32-copy.xlsx')
  expect((screen.getByRole('checkbox', { name: /학급별 공강/ }) as HTMLInputElement).checked).toBe(
    false,
  )
  expect(submissions).toBe(0)
})

it.each(['lost-response', 'conflict'] as const)(
  '관리자 승인 화면은 응답 손실은 같은 키로 재전송하고 충돌은 재조회한다 (%s)',
  async (outcome) => {
    const day = '2026-11-23'
    const row = {
      id: 81,
      termId: 547001,
      kind: 'SUBSTITUTE',
      firstId: 51,
      firstRev: 2,
      secondId: null,
      secondRev: null,
      requester: 1,
      responder: 19,
      state: 'ACCEPTED',
      rev: 1,
    }
    const keys: string[] = []
    const bodies: string[] = []
    let reads = 0
    adapter((config) => {
      if (config.url === '/api/v2/terms') {
        if (config.method === 'get') return [200, terms]
        terms = [registered]
        return [201, { termId: 547001 }]
      }
      if (config.url === base + '/lesson-changes') {
        reads++
        return [200, [row]]
      }
      if (config.url === '/api/school/members')
        return [200, [{ schoolUserId: 1, userId: 541000, username: '관리자' }]]
      if (config.url === base + '/lesson-changes/81/approval') {
        keys.push(String(config.headers['Idempotency-Key']))
        bodies.push(config.data)
        if (outcome === 'conflict')
          return failure(config, 409, {
            code: 'STALE_LESSON',
            currentRev: 3,
            message: '담당자 변경',
          })
        if (keys.length === 1) throw new AxiosError('응답 손실', AxiosError.ERR_NETWORK, config)
        row.state = 'APPROVED'
        return [
          200,
          {
            requestId: 81,
            requestRev: 2,
            state: 'APPROVED',
            lessons: [{ id: 51, termId: 547001, rev: 3 }],
          },
        ]
      }
      return [200, []]
    })
    const page = mount()
    await register()
    await screen.findByLabelText('시수표 엑셀 파일')
    page.rerender(
      <QueryClientProvider client={cache}>
        <LessonChangesView initialDate={day} />
      </QueryClientProvider>,
    )
    const approve = await screen.findByRole('button', { name: '승인 확정' })
    fireEvent.click(approve)
    if (outcome === 'lost-response') {
      const retry = await screen.findByRole('button', { name: '같은 승인 다시 전송' })
      expect(keys).toHaveLength(1)
      fireEvent.click(retry)
      await screen.findByText(/신청 #81 승인 완료 · 날짜 수업 1건/)
      expect(keys).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/), keys[0]])
      expect(bodies[0]).toBe(bodies[1])
    } else {
      await screen.findByText(/변경 충돌 \(409\).*서버 버전 3.*다시 선택/)
      expect(keys).toHaveLength(1)
      expect(screen.queryByRole('button', { name: '같은 승인 다시 전송' })).toBeNull()
    }
    expect(reads).toBeGreaterThan(1)
  },
)

it('교환 후보가 없는 날에도 다른 날짜를 열고 그날 교환 가능한 교사와 수업만 선택한다', async () => {
  const sourceDate = '2026-11-23'
  const targetDate = '2026-11-24'
  const members = [
    { userId: 541000, schoolUserId: 10, displayName: '신청 교사' },
    { userId: 541001, schoolUserId: 11, displayName: '교환 가능 교사' },
    { userId: 541002, schoolUserId: 12, displayName: '교환 불가 교사' },
  ].map((member) => ({ ...member, position: 'TEACHER', employmentStatus: 'HIRED' }))
  function lesson(id: number, date: string, teacherId: number, periodId: number) {
    const assignment = { teacherId, periodId }
    return {
      id, termId: registered.termId, versionId: 1, rev: 2, date,
      originId: id + 100, originDate: date, classId: 4, subjectId: 15,
      planned: assignment, actual: assignment,
    }
  }
  const rows = [
    lesson(51, sourceDate, 10, 1),
    lesson(52, targetDate, 11, 2),
    lesson(53, targetDate, 11, 3),
    lesson(54, targetDate, 12, 4),
  ]
  adapter((config) => {
    if (config.url === '/api/v2/terms') return [200, [registered]]
    if (config.url === '/api/school/teachers') return [200, members]
    if (config.url === base + '/lessons')
      return [200, rows.filter((row) => row.date === config.params.date)]
    if (config.url === base + '/lesson-changes/51/candidates' && config.params.kind === 'SWAP')
      return [200, config.params.firstRev === 2 && config.params.date === targetDate ? [52] : []]
    return [200, []]
  })
  mount('TEACHER', <LessonChangesView initialDate={sourceDate} />)
  const source = await screen.findByRole('combobox', { name: '내가 담당하는 수업' })
  await within(source).findByRole('option', { name: /신청 교사/ })
  fireEvent.change(source, { target: { value: '51/2' } })

  const swap = within(screen.getByRole('form', { name: '교환 신청' }))
  const teacher = swap.getByRole<HTMLSelectElement>('combobox', { name: '상대 교사' })
  const submit = swap.getByRole<HTMLButtonElement>('button', { name: '교환 신청' })
  await swap.findByText(/이 날짜에 교환 가능한 수업이 없습니다/)
  expect(teacher.options).toHaveLength(1)
  fireEvent.click(swap.getByLabelText('다른 날짜의 수업 선택'))
  const date = swap.getByLabelText('교환 상대 수업 날짜')
  fireEvent.change(date, { target: { value: targetDate } })
  await within(teacher).findByRole('option', { name: '교환 가능 교사' })
  expect(within(teacher).queryByRole('option', { name: '교환 불가 교사' })).toBeNull()
  fireEvent.change(teacher, { target: { value: '11' } })
  const target = swap.getByRole<HTMLSelectElement>('combobox', { name: /교환할 상대 수업/ })
  expect(Array.from(target.options, (option) => option.value)).toEqual(['', '52/2'])
  fireEvent.change(target, { target: { value: '52/2' } })
  expect(submit.disabled).toBe(false)
  expect(swap.getByLabelText('교환 미리보기').textContent).toContain(targetDate)

  fireEvent.change(date, { target: { value: sourceDate } })
  await swap.findByText(/이 날짜에 교환 가능한 수업이 없습니다/)
  expect(teacher.value).toBe('')
  expect(target.options).toHaveLength(1)
  expect(submit.disabled).toBe(true)
  fireEvent.change(date, { target: { value: targetDate } })
  await within(teacher).findByRole('option', { name: '교환 가능 교사' })
  expect(teacher.value).toBe('')
  expect(target.value).toBe('')
  expect(swap.queryByLabelText('교환 미리보기')).toBeNull()
})
