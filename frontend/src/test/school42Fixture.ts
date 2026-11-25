import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readSheet } from 'read-excel-file/node'
import type { GenerationRequest, ScheduleCandidate, TeachingSlot } from '@/types/generationJob'
import type { ValidatedLoad } from '@/types/loadValidation'

const fixture = (file: string) => resolve('src/test/fixtures/school42', file)

// The two synthetic CSVs have a UTF-8 BOM and unquoted cells.
async function csv(file: string) {
  const text = await readFile(fixture(file), 'utf8')
  return text
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(','))
}

export async function readSchool42() {
  const [bytes, requestJson, rosterRows, weekRows] = await Promise.all([
    readFile(fixture('teaching_load_42.xlsx')),
    readFile(fixture('generate_request.json'), 'utf8'),
    csv('teacher_roster.csv'),
    csv('example_week.csv'),
  ])
  const [header, ...rows] = await readSheet(bytes, '시수표')
  const classes = header.slice(2, -1).map(String)
  const subjects = new Set<string>()
  const roster = rosterRows.slice(1).map(([name, subject, hours, homeroom, schoolUserId]) => ({
    name,
    subject,
    hours: Number(hours),
    homeroom: homeroom || null,
    schoolUserId,
  }))
  const teacherIds = new Map(roster.map((t) => [t.name, t.schoolUserId]))
  function teacherId(name: string) {
    const id = teacherIds.get(name)
    if (!id) throw new Error(`명부에서 교사를 찾을 수 없습니다: ${name}`)
    return id
  }
  // Offline identifiers for subjects/classes are the workbook labels. Teacher IDs come from the roster.
  const demands: Omit<ValidatedLoad['demands'][number], 'sourceCell'>[] = []
  for (const [teacher, subject, ...cells] of rows) {
    const total = cells.pop()
    let hours = 0
    for (const [index, count] of cells.entries()) {
      if (count === null || count === 0) continue
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
        throw new Error('시수표의 숫자 셀을 확인하세요.')
      subjects.add(String(subject))
      demands.push({
        teacherId: teacherId(String(teacher)),
        subjectId: String(subject),
        classId: classes[index],
        weeklyPeriods: count,
      })
      hours += count
    }
    if (hours !== total) throw new Error(`시수표 행 합계 불일치: ${teacher} / ${subject}`)
  }

  const [weekHeader, ...week] = weekRows
  const days: Record<string, TeachingSlot['day']> = {
    월: 'MON',
    화: 'TUE',
    수: 'WED',
    목: 'THU',
    금: 'FRI',
  }
  const example: ScheduleCandidate['placements'] = []
  for (const [day, period, ...cells] of week) {
    for (const [index, cell] of cells.entries()) {
      const [subject, teacher] = cell.split(' · ')
      example.push({
        teacherId: teacherId(teacher),
        subjectId: subject,
        classId: weekHeader[index + 2],
        slot: { day: days[day], period: Number(period) },
      })
    }
  }
  const request: GenerationRequest = JSON.parse(requestJson)
  if (!request.teachingSlots?.length) throw new Error('데모 요청에 수업 교시가 없습니다.')
  return {
    bytes,
    request,
    slots: request.teachingSlots,
    roster,
    classes,
    subjects,
    demands,
    example,
  }
}
