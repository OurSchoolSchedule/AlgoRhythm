// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import CandidatePublication from './CandidatePublication'
import CandidateTimetable from './CandidateTimetable'
import type { GenerationJob, ScheduleCandidate, TeachingSlot } from '@/types/generationJob'

afterEach(cleanup)

vi.mock('@/hooks/useHomeSession', () => ({ useHomeSession: () => ({}) }))
vi.mock('@/hooks/homeReads', () => ({
  useHomeDirectory: () => ({ data: [{ schoolUserId: 1, username: '교사명' }] }),
}))
vi.mock('@/hooks/useSchoolCatalog', () => ({
  useSchoolClasses: () => ({ data: [{ id: 1, grade: 1, classNumber: 1 }] }),
  useSubjects: () => ({ data: [{ id: 1, name: '국어' }] }),
}))

it('정렬을 바꾸거나 상세 내역을 확인해도 선택한 후보의 번호와 게시 ID를 지킨다', () => {
  const term = {
    schoolId: 1,
    termId: 1,
    academicYear: 2026,
    semester: 2,
    startDate: '2026-08-01',
    endDate: '2027-01-01',
  }
  const publish = vi.fn().mockResolvedValue({ phase: 'published' })
  const score = {
    wantsMet: 0,
    wantsTotal: 1,
    teachersWithNoWantMet: 1,
    avoidsMet: 0,
    avoidsTotal: 0,
  }
  const candidate = (candidateId: string, days: TeachingSlot['day'][]): ScheduleCandidate => ({
    candidateId,
    score,
    placements: days.map((day, i) => ({
      classId: '1',
      subjectId: '1',
      teacherId: '1',
      slot: { day, period: i + 1 },
    })),
  })
  const candidates = [candidate('first', Array(6).fill('MON')), candidate('second', ['MON', 'TUE'])]
  render(
    <CandidatePublication
      term={term}
      candidates={candidates}
      publication={{ state: { phase: 'idle' }, publish, isPublishing: false }}
      onRestart={vi.fn()}
    />,
  )
  const radios = () => screen.getAllByRole<HTMLInputElement>('radio')
  expect(radios().map((r) => r.value)).toEqual(['first', 'second'])
  fireEvent.click(radios()[0])
  for (const choice of ['concentrated', 'longDays']) {
    fireEvent.change(screen.getByLabelText('후보 정렬'), { target: { value: choice } })
    expect(radios().map((r) => r.value)).toEqual(['second', 'first'])
    expect(radios()[1].checked).toBe(true)
  }
  expect(screen.getByText(/1학년 1반 · 국어 · 월요일 1·2·3·4·5·6교시/)).toBeTruthy()
  expect(screen.getByText(/교사명 · 월요일 1·2·3·4·5·6교시/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '선택한 후보 게시 확정' }))
  expect(publish).toHaveBeenCalledWith({ candidateId: 'first', effectiveFrom: expect.any(String) })
})

it('후보별 교사 시간표는 학년을 가로질러 교사 ID로 조회하고 보기를 바꿔도 선택을 유지한다', () => {
  const first: ScheduleCandidate = {
    candidateId: 'first',
    score: { wantsMet: 0, wantsTotal: 0, teachersWithNoWantMet: 0, avoidsMet: 0, avoidsTotal: 0 },
    placements: [
      { teacherId: '7', classId: '11', subjectId: '1', slot: { day: 'MON', period: 1 } },
      { teacherId: '7', classId: '21', subjectId: '2', slot: { day: 'MON', period: 2 } },
      { teacherId: '8', classId: '21', subjectId: '1', slot: { day: 'TUE', period: 1 } },
    ],
  }
  const job: GenerationJob = {
    jobId: '1',
    expectedPublishRev: 0,
    state: 'READY',
    result: {
      jobId: '1',
      expectedPublishRev: 0,
      validatedLoadId: '1',
      status: 'READY',
      stopReason: 'TOP_FOUR_AT_BOUND',
      detail: null,
      elapsedMs: 1000,
      candidates: [first],
    },
    teachingSlots: [
      { day: 'MON', period: 1 },
      { day: 'MON', period: 2 },
      { day: 'TUE', period: 1 },
    ],
    classGrades: { 11: 1, 21: 2 },
    gradeLastPeriods: [
      { grade: 1, lastPeriods: { MON: 1, TUE: 1, WED: 1, THU: 1, FRI: 1 } },
      { grade: 2, lastPeriods: { MON: 2, TUE: 1, WED: 1, THU: 1, FRI: 1 } },
    ],
  }
  const props = {
    job,
    className: (id: string) => (id === '11' ? '1학년 1반' : '2학년 1반'),
    subjectName: (id: string) => (id === '1' ? '국어' : '독서'),
    rosterTeacherIds: ['7', '9'],
    teacherName: (id: string) => (id === '9' ? '박교사' : '김교사'),
  }
  const { rerender } = render(<CandidateTimetable candidate={first} {...props} />)
  const panel = () => within(screen.getByRole('tabpanel'))
  const classTab = screen.getByRole('tab', { name: '학급별 조회' })
  const teacherTab = screen.getByRole('tab', { name: '교사별 조회' })
  const mondaySecond = () =>
    within(panel().getByRole('rowheader', { name: '2교시' }).closest('tr')!).getAllByRole('cell')[0]
  expect(mondaySecond().textContent).toBe('수업 없음')
  fireEvent.change(panel().getByLabelText('학급'), { target: { value: '21' } })
  fireEvent.keyDown(classTab, { key: 'ArrowRight' })
  expect(teacherTab.getAttribute('aria-selected')).toBe('true')
  expect(panel().getByRole('table', { name: '선택한 교사의 주간 배치' })).toBeTruthy()
  expect(panel().getByRole('button', { name: '국어 1학년 1반' })).toBeTruthy()
  expect(panel().getByRole('button', { name: '독서 2학년 1반' })).toBeTruthy()
  expect(panel().getByText('주 2차시')).toBeTruthy()
  fireEvent.change(panel().getByLabelText('교사'), { target: { value: '9' } })
  expect(panel().getByRole('option', { name: '박교사' })).toBeTruthy()
  expect(panel().getByText('주 0차시')).toBeTruthy()
  expect(panel().queryByRole('button')).toBeNull()
  fireEvent.change(panel().getByLabelText('교사'), { target: { value: '8' } })
  expect(panel().getByRole('option', { name: '김교사 · #8' })).toBeTruthy()
  expect(panel().getByText('주 1차시')).toBeTruthy()
  expect(mondaySecond().textContent).toBe('공강')
  fireEvent.click(classTab)
  expect((panel().getByLabelText('학급') as HTMLSelectElement).value).toBe('21')
  fireEvent.click(teacherTab)
  expect((panel().getByLabelText('교사') as HTMLSelectElement).value).toBe('8')
  const next = { ...first, candidateId: 'second', placements: [first.placements[1]] }
  rerender(<CandidateTimetable candidate={next} {...props} />)
  expect((panel().getByLabelText('교사') as HTMLSelectElement).value).toBe('7')
  expect(panel().getAllByRole('button')).toHaveLength(1)
  expect(mondaySecond().textContent).toContain('독서')
})
