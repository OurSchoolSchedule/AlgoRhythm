// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import CandidatePublication from './CandidatePublication'
import type { ScheduleCandidate, TeachingSlot } from '@/types/generationJob'

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
