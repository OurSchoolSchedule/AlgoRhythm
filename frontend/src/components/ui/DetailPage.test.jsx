// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { DetailTabs } from './DetailPage'
import WeeklyTimetableGrid from '@/components/schedule/WeeklyTimetableGrid'

afterEach(cleanup)

it('방향키·Home·End로 관리 탭을 바꾸면 선택과 키보드 포커스가 함께 이동한다', () => {
  function Tabs() {
    const [value, setValue] = useState('교사')
    return (
      <DetailTabs
        label="관리 항목"
        items={['교사', '학급', '설정']}
        value={value}
        onChange={setValue}
        panelId="admin-tools"
      />
    )
  }
  const ui = render(<Tabs />)
  const list = within(ui.getByRole('tablist', { name: '관리 항목' }))
  const teacher = list.getByRole('tab', { name: '교사' })
  const room = list.getByRole('tab', { name: '학급' })
  const settings = list.getByRole('tab', { name: '설정' })
  teacher.focus()
  for (const [key, target] of [
    ['ArrowRight', room],
    ['End', settings],
    ['ArrowRight', teacher],
    ['ArrowLeft', settings],
    ['Home', teacher],
  ]) {
    fireEvent.keyDown(document.activeElement, { key })
    expect(document.activeElement).toBe(target)
    expect(list.getByRole('tab', { selected: true })).toBe(target)
    expect(list.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toEqual([target])
  }
})

it('오늘 열과 선택된 수업이 같은 칸에서도 독립적으로 표시된다', () => {
  const timetable = { periods: [1], byDay: { 월: { 1: { subject: '미술' } } } }
  const days = [
    { key: '월', dayNum: 23, isToday: true },
    { key: '화', dayNum: 24, isToday: false },
  ]
  const ui = render(<WeeklyTimetableGrid timetable={timetable} days={days} selectedKey="월-1" />)
  const board = within(ui.getByRole('region', { name: '주간 시간표 격자' }))
  const art = board.getByRole('button', { name: '월요일 1교시 · 미술', pressed: true })
  expect(art.classList.contains('is-today')).toBe(true)
  expect(art.classList.contains('is-selected')).toBe(true)
  ui.rerender(<WeeklyTimetableGrid timetable={timetable} days={days} selectedKey="화-1" />)
  expect(art.getAttribute('aria-pressed')).toBe('false')
  expect(art.classList.contains('is-today')).toBe(true)
  expect(board.getByRole('button', { name: '화요일 1교시 · 공강', pressed: true })).toBeTruthy()
})
