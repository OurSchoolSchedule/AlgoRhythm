// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeacherPreferences from './TeacherPreferences'
import type { GenerationRequest, TeachingSlot } from '@/types/generationJob'

vi.mock('@/hooks/useHomeSession', () => ({ useHomeSession: () => ({}) }))
vi.mock('@/hooks/homeReads', () => ({
  useHomeDirectory: () => ({ data: [{ schoolUserId: 1, username: '한교사' }] }),
}))
afterEach(cleanup)
const slots: TeachingSlot[] = [
  { day: 'MON', period: 1 },
  { day: 'TUE', period: 1 },
  { day: 'TUE', period: 3 },
]
const term = {
  termId: 1,
  schoolId: 2,
  academicYear: 2026,
  semester: 2,
  startDate: '2026-08-17',
  endDate: '2026-12-31',
}
const receipt = {
  validatedLoadId: 'valid',
  sheet: 'sheet',
  dataRows: 1,
  totalPeriods: 1,
  demands: [
    {
      teacherId: '1',
      subjectId: '2',
      classId: '3',
      weeklyPeriods: 1,
      sourceCell: 'A1',
    },
  ],
}

describe.each(['WANT', 'AVOID'] as const)('%s', (kind) => {
  it('교시별 2건과 두 교시 묶음 1건을 구분하고 기존 묶음의 모든 교시를 표시한다', () => {
    const outgoing = vi.fn()
    function Editor() {
      const [value, setValue] = useState<NonNullable<GenerationRequest['preferences']>>([
        { teacherId: '1', kind, anyOf: [slots[1], slots[2]] },
      ])
      return (
        <TeacherPreferences
          {...{ term, receipt, slots }}
          preferences={value}
          onChange={(v) => {
            setValue(v)
            outgoing(v)
          }}
        />
      )
    }
    render(<Editor />)
    fireEvent.click(screen.getByText('교사별 시간 선호 (선택)'))
    expect(screen.getByText(/화요일 1교시 또는 화요일 3교시/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('선호 유형'), {
      target: { value: kind },
    })
    const add = screen.getByRole('button', {
      name: '선호 추가',
    }) as HTMLButtonElement
    fireEvent.click(add)
    expect(add.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('선호 요일'), {
      target: { value: 'TUE' },
    })
    fireEvent.click(add)
    fireEvent.change(screen.getByLabelText('선호 입력 방식'), {
      target: { value: 'group' },
    })
    expect(
      screen.getByText(kind === 'WANT' ? /하나라도 수업이 배정/ : /하나라도 비면/),
    ).toBeTruthy()
    const group = within(screen.getByRole('group', { name: '함께 평가할 교시 선택' }))
    fireEvent.click(group.getByLabelText('화요일 1교시'))
    expect(add.disabled).toBe(true)
    fireEvent.click(group.getByLabelText('화요일 3교시'))
    expect(add.disabled).toBe(true)
    fireEvent.click(group.getByLabelText('화요일 3교시'))
    fireEvent.click(group.getByLabelText('월요일 1교시'))
    fireEvent.click(add)
    expect(outgoing.mock.lastCall?.[0].map((p: { anyOf: TeachingSlot[] }) => p.anyOf)).toEqual([
      [slots[1], slots[2]],
      [slots[0]],
      [slots[1]],
      [slots[0], slots[1]],
    ])
    fireEvent.click(
      screen.getByRole('button', {
        name: /월요일 1교시 또는 화요일 1교시 .*삭제/,
      }),
    )
    expect(outgoing.mock.lastCall?.[0]).toHaveLength(3)
  })
})
