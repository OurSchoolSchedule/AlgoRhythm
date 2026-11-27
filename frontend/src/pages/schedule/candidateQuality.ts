import type { ScheduleCandidate, TeachingSlot } from '@/types/generationJob'

export function candidateQuality(placements: ScheduleCandidate['placements']) {
  const subjects = new Map<string, { classId: string; subjectId: string; slots: TeachingSlot[] }>()
  const teacherDays = new Map<
    string,
    { teacherId: string; day: TeachingSlot['day']; periods: number[] }
  >()

  for (const { classId, subjectId, teacherId, slot } of placements) {
    const subjectKey = JSON.stringify([classId, subjectId])
    const subject = subjects.get(subjectKey) ?? {
      classId,
      subjectId,
      slots: [],
    }
    subject.slots.push(slot)
    subjects.set(subjectKey, subject)

    const teacherKey = JSON.stringify([teacherId, slot.day])
    const workload = teacherDays.get(teacherKey) ?? {
      teacherId,
      day: slot.day,
      periods: [],
    }
    workload.periods.push(slot.period)
    teacherDays.set(teacherKey, workload)
  }

  const repeatedSubjects = [...subjects.values()].filter((subject) => subject.slots.length >= 2)
  const concentrated = repeatedSubjects.filter(({ slots }) =>
    slots.every((s) => s.day === slots[0].day),
  )
  const longDays = [...teacherDays.values()].filter(({ periods }) => periods.length >= 6)
  return { eligibleSubjects: repeatedSubjects.length, concentrated, longDays }
}
