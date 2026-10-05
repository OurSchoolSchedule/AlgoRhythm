import { describe, expect, it } from 'vitest'
import { applyCellMoves, cellStatusKind, changedTimetablePatches, dropRejection, periodsWithLunch } from './timetableBoard.js'

const byDay = {
  월: { 1: { id: 1, teacher: '김민지', subject: '국어' }, 2: null },
  화: { 1: { id: 2, teacher: '김민지', subject: '국어' }, 2: { id: 3, teacher: '박철수', subject: '수학' } },
  수: {},
  목: {},
  금: {},
}

describe('timetable board', () => {
  it('상태 문자열을 배지 종류로 나눈다', () => {
    expect(cellStatusKind('대타 대기')).toBe('wait')
    expect(cellStatusKind('변경됨')).toBe('change')
    expect(cellStatusKind('충돌')).toBe('conflict')
    expect(cellStatusKind('')).toBe('')
  })

  it('같은 교사 칸으로는 옮기지 못한다', () => {
    expect(dropRejection(byDay, { day: '월', period: 1 }, { day: '화', period: 1 })).toBe('이 교시에 같은 교사 수업이 있습니다')
    expect(dropRejection(byDay, { day: '월', period: 1 }, { day: '화', period: 2 })).toBe('')
    expect(dropRejection(byDay, { day: '월', period: 1 }, { day: '월', period: 2 }, '대체공휴일')).toBe('수업이 없는 날입니다')
  })

  it('옮긴 칸만 도착 교시의 설정 번호로 고친다', () => {
    const original = {
      월: { 1: { id: 10, periodSettingId: 101, subjectId: 3, teacherId: 7, academicYear: 2026, semester: 2 } },
      화: { 1: { id: 11, periodSettingId: 101, subjectId: 4, teacherId: 8 } },
      수: {},
      목: {},
      금: {},
    }
    const moved = applyCellMoves(original, [{ from: { day: '월', period: 1 }, to: { day: '화', period: 1 } }])
    const result = changedTimetablePatches(original, moved)
    expect(result.error).toBe('')
    expect(result.patches).toEqual([
      {
        timetableId: 11,
        payload: { periodSettingId: 101, dayOfWeek: 'MON', subjectId: 4, teacherSchoolUserId: 8 },
      },
      {
        timetableId: 10,
        payload: {
          periodSettingId: 101,
          dayOfWeek: 'TUE',
          academicYear: 2026,
          semester: 2,
          subjectId: 3,
          teacherSchoolUserId: 7,
        },
      },
    ])
  })

  it('빈 칸으로 옮기고 점심 행을 4교시와 5교시 사이에 둔다', () => {
    const moved = applyCellMoves(byDay, [{ from: { day: '월', period: 1 }, to: { day: '월', period: 2 } }])
    expect(moved['월'][1]).toBeNull()
    expect(moved['월'][2].subject).toBe('국어')
    expect(periodsWithLunch([1, 2, 3, 4, 5, 6, 7]).map((row) => row.kind)).toEqual([
      'period', 'period', 'period', 'period', 'lunch', 'period', 'period', 'period',
    ])
  })
})
