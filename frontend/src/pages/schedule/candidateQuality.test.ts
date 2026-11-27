import { expect, it } from 'vitest'
import { candidateQuality } from './candidateQuality'
import type { TeachingSlot } from '@/types/generationJob'

const lesson = (
  period: number,
  day: TeachingSlot['day'] = 'MON',
  subjectId = 'a',
  classId = '1',
  teacherId = '1',
) => ({ classId, subjectId, teacherId, slot: { day, period } })

it('주 2차시 이상인 학급·과목을 교사와 무관하게 묶고 교사별 6차시 일수를 센다', () => {
  const values = [
    lesson(1),
    lesson(2),
    lesson(3, 'MON', 'b'),
    lesson(4, 'MON', 'b'),
    lesson(1, 'TUE', 'b'),
    lesson(5, 'MON', 'c'),
    lesson(7, 'MON', 'd'),
    lesson(3, 'TUE', 'a', '2'),
    lesson(6, 'MON', 'a', '1', '2'),
  ]
  const result = candidateQuality(values)
  expect(result.eligibleSubjects).toBe(2)
  expect(result.concentrated.map((r) => [r.classId, r.subjectId, r.slots.length])).toEqual([
    ['1', 'a', 3],
  ])
  expect(result.longDays).toEqual([{ teacherId: '1', day: 'MON', periods: [1, 2, 3, 4, 5, 7] }])
  expect(candidateQuality([])).toEqual({
    eligibleSubjects: 0,
    concentrated: [],
    longDays: [],
  })
})
