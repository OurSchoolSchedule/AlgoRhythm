import { beforeAll, describe, expect, it } from 'vitest'
import { homeAccess, homeWeekAccess } from '@/utils/homeAccess'
import { toHomeProfile } from '@/utils/homeContract'
import { readSchool42 } from './school42Fixture'
import { auditCandidate } from './school42Candidate'

let demo: Awaited<ReturnType<typeof readSchool42>>
beforeAll(async () => {
  demo = await readSchool42()
})
const clean = {
  periods: 672,
  periodMismatches: [],
  teacherConflicts: [],
  classConflicts: [],
  outsideTeachingSlots: [],
}

describe('School42 원본 시수표와 후보', () => {
  it('42명·21학급·35과목·252개 배정의 합이 주 672차시이고 교사별 명부·반별 총량과 일치한다', () => {
    expect(new Set(demo.roster.map((t) => t.schoolUserId)).size).toBe(42)
    expect(new Set(demo.classes).size).toBe(21)
    expect(demo.subjects.size).toBe(35)
    expect(demo.demands).toHaveLength(252)
    expect(
      new Set(demo.demands.map((d) => JSON.stringify([d.teacherId, d.subjectId, d.classId]))).size,
    ).toBe(252)
    expect(demo.demands.reduce((sum, d) => sum + d.weeklyPeriods, 0)).toBe(672)
    for (const teacher of demo.roster) {
      const assigned = demo.demands.filter((d) => d.teacherId === teacher.schoolUserId)
      expect(
        assigned.reduce((n, d) => n + d.weeklyPeriods, 0),
        teacher.name,
      ).toBe(teacher.hours)
    }
    for (const room of demo.classes) {
      expect(
        demo.demands.filter((d) => d.classId === room).reduce((n, d) => n + d.weeklyPeriods, 0),
        room,
      ).toBe(32)
    }
  })

  it('예시 주간표와 서로 다른 유효 배치 모두 같은 시수·교사 및 학급 중복 기준을 통과한다', () => {
    expect(auditCandidate(demo.demands, demo.example, demo.slots)).toEqual(clean)
    // Both Friday slots are open in the demo seed. Exchanging them preserves all lesson counts.
    const alternate = demo.example.map((p) => ({
      ...p,
      slot:
        p.slot.day === 'FRI' && [5, 6].includes(p.slot.period)
          ? { ...p.slot, period: 11 - p.slot.period }
          : p.slot,
    }))
    expect(alternate).not.toEqual(demo.example)
    expect(auditCandidate(demo.demands, alternate, demo.slots)).toEqual(clean)
  })

  it('총량이 같아도 누락·추가된 배정과 교사·학급 충돌을 검출한다', () => {
    const [first, second, ...rest] = demo.example
    const report = auditCandidate(demo.demands, [first, first, ...rest], demo.slots)
    expect(report.periods).toBe(672)
    expect(report.periodMismatches).toHaveLength(2)
    expect(report.teacherConflicts).toHaveLength(1)
    expect(report.classConflicts).toHaveLength(1)
    const unexpected = auditCandidate(
      demo.demands,
      [{ ...first, subjectId: '미배정', slot: { day: 'SUN', period: 1 } }, second, ...rest],
      demo.slots,
    )
    expect(unexpected.periodMismatches).toHaveLength(2)
    expect(unexpected.outsideTeachingSlots).toHaveLength(1)
  })

  it.each([false, true])('명부에 담임이 있어도 서버 담임 반환 여부(%s)로만 전환한다', (linked) => {
    const teacher = demo.roster.find((t) => t.schoolUserId === '542004')!
    expect(teacher.homeroom).toBe('1-6')
    const room = { classId: 544006, academicYear: 2026, grade: 1, classNumber: 6 }
    const member = {
      userId: 541004,
      schoolUserId: 542004,
      subjects: [],
      homeroomClasses: linked ? [room] : [],
    }
    const profile = toHomeProfile(
      member.userId,
      2026,
      { state: 'success', data: { userId: member.userId, username: teacher.name } },
      { state: 'success', data: [member] },
    )
    const access = homeAccess(true, {
      schoolId: 540001,
      position: 'TEACHER',
      employmentStatus: 'HIRED',
    })
    const week = homeWeekAccess(access, profile.homerooms, room.classId)
    expect(week.canSwitchHomeroom).toBe(linked)
    expect(week.selection).toEqual(
      linked ? { view: 'homeroom', classId: room.classId } : { view: 'mine' },
    )
  })
})
