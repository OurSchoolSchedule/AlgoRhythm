import { expect } from 'vitest'
import { getDatedLessons } from '@/api/home'
import { getPeriodSettings } from '@/api/schoolSetting.js'
import { getMyTimetableByTerm, getSchoolTimetableByTerm } from '@/api/timetable.js'
import { issueDevToken, saveDevLoginTokens } from '@/api/auth.js'
import { getActiveStore } from '@/api/mypage.js'
import { publishCandidate } from '@/api/publications'
import type { GenerationJob, ScheduleCandidate } from '@/types/generationJob'
import type { TimetableDto } from '@/types/timetable.js'

// First complete teaching week in the disposable School42 seed.
const dates = [
  ['MON', '2026-11-23'],
  ['TUE', '2026-11-24'],
  ['WED', '2026-11-25'],
  ['THU', '2026-11-26'],
  ['FRI', '2026-11-27'],
] as const

function slot(day: string, period: number, teacher: number, subject: number, room: number) {
  return [day, period, teacher, subject, room].join('/')
}

function weeklySlot(row: TimetableDto) {
  return slot(row.dayOfWeek, row.periodNumber, row.teacherId, row.subjectId, row.schoolClassId)
}

function candidateSlot(row: ScheduleCandidate['placements'][number]) {
  return slot(
    row.slot.day,
    row.slot.period,
    Number(row.teacherId),
    Number(row.subjectId),
    Number(row.classId),
  )
}

function compare(label: string, actual: string[], expected: string[]) {
  // Include multiplicity. Keep a 672-row diff out of release logs.
  const sorted = [...expected].sort()
  const matches =
    actual.length === sorted.length && [...actual].sort().every((v, i) => v === sorted[i])
  console.info(`${label}: expected=${expected.length} actual=${actual.length} matches=${matches}`)
  expect.soft(matches, label).toBe(true)
}

export async function verifySchool42Publication(
  termId: number,
  job: GenerationJob,
  candidate: ScheduleCandidate,
) {
  // withLocalSchool has already checked the loopback host, school and admin identity.
  expect(termId).toBe(547001)
  expect(job.expectedPublishRev, 'Start with an unpublished School42 fixture').toBe(0)
  const receipt = await publishCandidate(termId, {
    jobId: job.jobId,
    candidateId: candidate.candidateId,
    expectedPublishRev: job.expectedPublishRev,
    effectiveFrom: dates[0][1],
  })
  expect(receipt.weeklyLessons).toBe(672)
  const week = { weekOf: dates[0][1], termId }
  console.info(
    `School42 publication: job=${job.jobId} candidate=${candidate.candidateId} version=${receipt.versionId} term=${termId} weekOf=${week.weekOf}`,
  )
  const expectedWeek = candidate.placements.map(candidateSlot)
  const periods = await getPeriodSettings()
  const periodNumbers = new Map<number, number>(periods.map((p) => [p.id, p.periodNumber]))
  const datedWeek: string[] = []
  for (const [day, date] of dates) {
    const rows = await getDatedLessons(termId, date, new AbortController().signal)
    for (const row of rows) {
      expect(row.versionId).toBe(receipt.versionId)
      expect(row.actual).toEqual(row.planned)
      const period = periodNumbers.get(row.actual.periodId)
      if (period === undefined) throw new Error(`Unknown period ID ${row.actual.periodId}`)
      datedWeek.push(slot(day, period, row.actual.teacherId, row.subjectId, row.classId))
    }
  }
  compare('v2 dated lessons', datedWeek, expectedWeek)
  const schoolWeek = await getSchoolTimetableByTerm(2026, 2, week)
  compare('school weekly grid', schoolWeek.map(weeklySlot), expectedWeek)

  const homeroom = candidate.placements.filter((p) => p.classId === '544006').map(candidateSlot)
  expect(homeroom).toHaveLength(32)
  compare('class 544006 weekly grid', schoolWeek.filter((row) => row.schoolClassId === 544006).map(weeklySlot), homeroom)

  saveDevLoginTokens(await issueDevToken('teacher42-04@example.invalid'))
  expect(await getActiveStore()).toMatchObject({ schoolId: 540001, position: 'TEACHER' })
  const mine = candidate.placements.filter((p) => p.teacherId === '542004').map(candidateSlot)
  expect(mine).toHaveLength(15)
  const teacherWeek = await getMyTimetableByTerm(2026, 2, week)
  compare('teacher weekly grid', teacherWeek.map(weeklySlot), mine)
}
