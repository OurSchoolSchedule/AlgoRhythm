// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import client from '@/api/client.js'
import { clearTokens, getSessionVersion, setTokens } from '@/api/tokenStorage.js'
import { queryKeys } from '@/hooks/queryKeys.js'
import ScheduleProgress from '@/components/schedule/ScheduleProgress'
import ScheduleCreateView from './ScheduleCreateView'
import LessonChangesView from './LessonChangesView'

const base = '/api/v2/terms/547001'
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
function mount(role = 'ADMIN') {
  cache.setQueryData(queryKeys.home.active(identity()), {
    schoolId: 540001,
    position: role,
    employmentStatus: 'HIRED',
  })
  return render(
    <QueryClientProvider client={cache}>
      <ScheduleCreateView />
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
function register() {
  fireEvent.click(screen.getByText('새 학기 등록', { selector: 'summary' }))
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

it('이미 등록된 학기는 필드를 보존하고 학교의 기존 ID 연결로 안내한다', async () => {
  adapter((config) => failure(config, 409, { code: 'TERM_OVERLAP' }))
  mount()
  register()
  expect((await screen.findByRole('alert')).textContent).toContain('학기 ID로 연결')
  expect((screen.getByLabelText('시작일') as HTMLInputElement).value).toBe('2026-08-20')
  expect(screen.getByRole('button', { name: '학기 연결' })).toBeTruthy()
})

it('학기 등록과 셀 오류 수정 후 후보 한 개를 표시하고 게시 충돌에서 재선택 없이 재전송하지 않는다', async () => {
  let uploads = 0,
    publications = 0,
    jobReads = 0,
    lessonReads = 0
  adapter((config) => {
    const url = config.url
    if (url === '/api/v2/terms') return [201, { termId: 547001 }]
    if (url === '/api/school-setting/periods') return [200, [{ periodNumber: 1 }]]
    if (url === base + '/load-imports/validate') {
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
    if (url === base + '/generations') {
      expect(JSON.parse(config.data)).toEqual({
        validatedLoadId: 'load-42',
        preferences: [],
        objective: 'BALANCED',
        teachingSlots: ['MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({ day, period: 1 })),
      })
      return [202, job]
    }
    if (url === job.statusUrl) {
      jobReads++
      return [
        200,
        {
          ...job,
          state: 'READY',
          result: { status: 'READY', candidates: [candidate] },
        },
      ]
    }
    if (url === base + '/publications') {
      publications++
      expect(JSON.parse(config.data)).toEqual({
        jobId: job.jobId,
        candidateId: 'c1',
        expectedPublishRev: 0,
        effectiveFrom: '2026-11-23',
      })
      return failure(config, 409, {
        code: 'STALE_PUBLICATION',
        message: '게시 버전 변경',
        currentRev: 1,
      })
    }
    if (url === base + '/lessons') lessonReads++
    return [200, []]
  })
  mount()
  register()
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
  expect(generate.disabled).toBe(true)
  fireEvent.click(await screen.findByRole('checkbox', { name: /학급별 공강/ }))
  expect(generate.disabled).toBe(false)
  fireEvent.click(generate)
  const candidates = await screen.findAllByRole('radio')
  expect(candidates).toHaveLength(1)
  fireEvent.click(candidates[0])
  fireEvent.change(screen.getByLabelText('게시 적용일'), {
    target: { value: '2026-11-23' },
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
    if (config.url === '/api/v2/terms') return [201, { termId: 547001 }]
    if (config.url === '/api/school-setting/periods')
      return [200, Array.from({ length: 7 }, (_, i) => ({ periodNumber: i + 1 }))]
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
  register()
  const file = await screen.findByLabelText('시수표 엑셀 파일')
  async function upload(name: string) {
    fireEvent.change(file, { target: { files: [new File(['load'], name)] } })
    expect(screen.queryByRole('checkbox', { name: /학급별 공강/ })).toBeNull()
    fireEvent.submit((file as HTMLInputElement).form!)
    await screen.findByText(/검증 완료 · 배정 2건/)
    await screen.findByLabelText('월요일 마지막 교시')
    for (const d of ['화', '수', '금']) {
      fireEvent.change(screen.getByLabelText(d + '요일 마지막 교시'), { target: { value: '6' } })
    }
  }
  await upload('31+33.xlsx')
  expect(screen.getByText(/33차시 · 1차시 초과/)).toBeTruthy()
  expect((screen.getByRole('button', { name: '후보 생성' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  await upload('30+32.xlsx')
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
      if (config.url === '/api/v2/terms') return [201, { termId: 547001 }]
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
    register()
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
