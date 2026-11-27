import { expect, it } from 'vitest'
import { operatingReason, type OperatingDay } from './operatingWeek'

it('uses the published class ID, grade windows and common sparse slots', () => {
  const day: OperatingDay = {
    date: '2026-06-08',
    status: 'OPEN',
    versionId: 42,
    periods: [1, 3, 4],
    gradePeriods: { 1: [1, 3], 2: [1, 3, 4] },
    classGrades: { 101: 1, 202: 2 },
  }
  expect(operatingReason(day, 101, 4)).toBe('운영 교시 밖')
  expect(operatingReason(day, 101, 3)).toBe('')
  expect(operatingReason(day, 202, 4)).toBe('')
  expect(operatingReason(day, null, 2)).toBe('운영 교시 밖')
  expect(operatingReason({ ...day, status: 'EXCLUDED' }, 101, 1)).toBe('수업 제외일')
  expect(operatingReason({ ...day, status: 'OUTSIDE_TERM' }, 101, 3)).toBe('학기 기간 밖')
  expect(operatingReason({ ...day, periods: null }, 101, 4)).toBe('')
})
