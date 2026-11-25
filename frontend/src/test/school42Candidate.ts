import type { ScheduleCandidate, TeachingSlot } from '@/types/generationJob'
import type { ValidatedLoad } from '@/types/loadValidation'

type Demand = Omit<ValidatedLoad['demands'][number], 'sourceCell'>
type Placement = ScheduleCandidate['placements'][number]

const assignment = ({ teacherId, subjectId, classId }: Demand | Placement) =>
  JSON.stringify([teacherId, subjectId, classId])

function add(counts: Map<string, number>, key: string, n = 1) {
  counts.set(key, (counts.get(key) ?? 0) + n)
}

// Compare every teacher/subject/class triple, including placements absent from the load.
export function auditCandidate(
  demands: readonly Demand[],
  placements: readonly Placement[],
  slots: readonly TeachingSlot[],
) {
  const expected = new Map<string, number>()
  const actual = new Map<string, number>()
  const teacherSlots = new Map<string, number>()
  const classSlots = new Map<string, number>()
  const allowed = new Set(slots.map(({ day, period }) => JSON.stringify([day, period])))
  const outsideTeachingSlots: Placement[] = []
  for (const demand of demands) add(expected, assignment(demand), demand.weeklyPeriods)
  for (const p of placements) {
    const { day, period } = p.slot
    add(actual, assignment(p))
    add(teacherSlots, JSON.stringify([p.teacherId, day, period]))
    add(classSlots, JSON.stringify([p.classId, day, period]))
    if (!allowed.has(JSON.stringify([day, period]))) outsideTeachingSlots.push(p)
  }
  const periodMismatches = [...new Set([...expected.keys(), ...actual.keys()])]
    .filter((key) => expected.get(key) !== actual.get(key))
    .map((key) => ({
      assignment: key,
      expected: expected.get(key) ?? 0,
      actual: actual.get(key) ?? 0,
    }))
  return {
    periods: placements.length,
    periodMismatches,
    teacherConflicts: [...teacherSlots].filter(([, count]) => count > 1),
    classConflicts: [...classSlots].filter(([, count]) => count > 1),
    outsideTeachingSlots,
  }
}
