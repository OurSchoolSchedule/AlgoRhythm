// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it } from 'vitest'
import CoverTeacherGrid from './CoverTeacherGrid'

it('shows only candidate membership IDs with their distinct term subjects and allows independent selections', () => {
  const subject = { subjectId: 1, subjectName: '수학' }
  const teacher = {
    userId: 101,
    schoolUserId: 1,
    displayName: '김서윤',
    username: '계정 이름',
    subjects: [subject],
    rosterSubjects: [subject, { subjectId: 2, subjectName: '물리' }],
    homeroomClasses: [],
  }
  const teachers = [
    teacher,
    { ...teacher, schoolUserId: 2, displayName: '수업 중' },
    { ...teacher, schoolUserId: 3, subjects: [], rosterSubjects: [] },
  ]
  function Form({ candidates }: { candidates: number[] }) {
    const [ids, setIds] = useState<number[]>([])
    return (
      <CoverTeacherGrid
        teachers={teachers}
        candidateIds={candidates}
        selectedIds={ids}
        onChange={setIds}
      />
    )
  }
  const view = render(<Form candidates={[1, 3]} />)
  expect(screen.queryByRole('checkbox', { name: /수업 중/ })).toBeNull()
  const math = screen.getByRole<HTMLInputElement>('checkbox', { name: '김서윤-수학, 물리' })
  const other = screen.getByRole<HTMLInputElement>('checkbox', { name: '김서윤-담당 과목 미등록' })
  expect([math.value, other.value]).toEqual(['1', '3'])
  fireEvent.click(math)
  fireEvent.click(other)
  fireEvent.click(math)
  expect([math.checked, other.checked]).toEqual([false, true])
  view.rerender(<Form candidates={[1]} />)
  expect(screen.queryByRole('checkbox', { name: /미등록/ })).toBeNull()
})
