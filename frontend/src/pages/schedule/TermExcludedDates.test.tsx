// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import TermExcludedDates from './TermExcludedDates'

afterEach(cleanup)

it('기존 제외일을 유지하며 학기 안의 날짜만 중복 없이 추가하고 삭제한다', () => {
  function Editor({ end }: { end: string }) {
    const [dates, setDates] = useState(['2026-06-23'])
    return (
      <TermExcludedDates startDate="2026-03-02" endDate={end} value={dates} onChange={setDates} />
    )
  }
  const page = render(<Editor end="2026-07-20" />)
  const draft = screen.getByLabelText<HTMLInputElement>('정규 수업 제외일 (선택)')
  const add = screen.getByRole<HTMLButtonElement>('button', { name: '날짜 추가' })
  const selected = within(screen.getByRole('list', { name: '선택한 수업 제외일' }))
  fireEvent.change(draft, { target: { value: '2026-06-23' } })
  expect(screen.getByRole('alert').textContent).toContain('이미 추가')
  expect(add.disabled).toBe(true)
  fireEvent.change(draft, { target: { value: '2026-03-01' } })
  expect(screen.getByRole('alert').textContent).toContain('학기 기간')
  expect(add.disabled).toBe(true)
  fireEvent.change(draft, { target: { value: '2026-03-02' } })
  expect(draft.checkValidity()).toBe(false)
  expect(draft.validationMessage).toContain('날짜 추가')
  fireEvent.click(add)
  expect(draft.checkValidity()).toBe(true)
  expect(
    selected.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
  ).toEqual(['2026-03-02 제외일 삭제', '2026-06-23 제외일 삭제'])
  page.rerender(<Editor end="2026-06-22" />)
  expect(screen.getByRole('alert').textContent).toContain('2026-06-23')
  fireEvent.click(selected.getByRole('button', { name: '2026-06-23 제외일 삭제' }))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(selected.getAllByRole('listitem')).toHaveLength(1)
})
