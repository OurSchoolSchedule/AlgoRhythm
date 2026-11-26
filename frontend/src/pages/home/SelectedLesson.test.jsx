// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import SelectedLesson from './SelectedLesson'

const cell = { period: 2, iso: '2026-11-26' }
const term = { schoolId: 5, termId: 42 }
const lesson = {
  termId: 42,
  lessonId: 901,
  originId: 4,
  rev: 2,
  date: cell.iso,
  classId: 8,
  subjectId: 9,
  planned: { teacherId: 11 },
  actual: { teacherId: 13, teacherName: '대체교사', periodNumber: 2 },
}

afterEach(cleanup)
function show(rows, admin = false) {
  const request = vi.fn()
  const home = {
    slotLessons: { state: rows.length ? 'ready' : 'empty', data: rows },
    classes: { data: [] },
    subjects: { data: [] },
    profile: { schoolUserId: { value: 13 } },
    access: {
      actions: { requestSubstitute: admin, requestSwap: !admin },
      queries: { datedLessons: true },
    },
  }
  render(<SelectedLesson home={home} term={term} cell={cell} weeklyRows={[]} onRequest={request} />)
  return request
}
it('requires an explicit class choice and carries the dated ID, revision and actual owner', () => {
  const request = show([lesson, { ...lesson, lessonId: 902, classId: 12 }])
  const swap = screen.getByRole('button', { name: '교환 요청하기' })
  expect(swap.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('이 교시의 수업'), { target: { value: 'dated-901' } })
  fireEvent.click(swap)
  expect(request).toHaveBeenCalledWith({
    schoolId: 5,
    termId: 42,
    kind: 'SWAP',
    date: cell.iso,
    datedLessonId: 901,
    rev: 2,
    teacherId: 13,
  })
  expect(screen.getByRole('button', { name: '보결 요청하기' }).disabled).toBe(true)
})
it.each([
  [[], '이 날짜와 교시에 조회된 실제 수업이 없습니다.'],
  [[{ ...lesson, actual: { ...lesson.actual, cancelled: true } }], '휴강이 확정된 수업입니다.'],
])('distinguishes an empty date from an explicit cancellation', (rows, reason) => {
  const request = show(rows, true)
  expect(screen.getByText(reason)).toBeTruthy()
  for (const action of screen.getAllByRole('button')) {
    expect(action.disabled).toBe(true)
    fireEvent.click(action)
  }
  expect(request).not.toHaveBeenCalled()
})
