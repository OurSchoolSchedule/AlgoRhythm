// Exercise a disposable School42 term through the same authenticated HTTP endpoints as the UI.
import assert from 'node:assert/strict'
import { readSheet } from 'read-excel-file/node'
import { readFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const origin = new URL(process.env.SCHOOL42_LOCAL_API || 'http://127.0.0.1:8080')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Use a disposable loopback API')
const termId = Number(process.env.SCHOOL42_TERM_ID || 547001)
assert.ok(Number.isSafeInteger(termId) && termId > 0, 'Supply a valid School42 term ID')
const base = '/api/v2/terms/' + termId
const fileName = 'teaching_load_42_homeroom_demo.xlsx'
const files = new URL('../public/school42-files/', import.meta.url)
const workbook = await readFile(new URL(fileName, files))
const conditions = JSON.parse(await readFile(new URL('generate_request_42_grade_demo.json', files), 'utf8'))
const admin = process.env.SCHOOL42_ADMIN_TOKEN
const teacher = process.env.SCHOOL42_TEACHER_TOKEN
assert.ok(admin && teacher, 'Supply local admin and teaching staff session tokens')
const form = () => {
  const body = new FormData()
  body.append('file', new Blob([workbook]), fileName)
  return body
}

async function api(path, token, method = 'GET', body, status = 200) {
  assert.ok(path.startsWith('/api/'))
  const headers = { Authorization: 'Bearer ' + token }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }
  const res = await fetch(new URL(path, origin), { method, headers, body, redirect: 'error' })
  const value = await res.json()
  assert.equal(res.status, status, method + ' ' + path + ' ' + (value.message || value.code || ''))
  return value
}

const term = (await api('/api/v2/terms', admin)).find(row => row.termId === termId)
assert.ok(term, 'The selected term must belong to the active school')
const fixtureStart = '2026-11-23'
const defaultStart = termId === 547001 && term.startDate <= fixtureStart && fixtureStart <= term.endDate
  ? fixtureStart : term.startDate
const effectiveFrom = process.env.SCHOOL42_EFFECTIVE_FROM || defaultStart
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) && effectiveFrom >= term.startDate && effectiveFrom <= term.endDate)
const school = await api('/api/school/me', admin)
assert.equal(school.schoolId, 540001, 'Use the disposable School42 school')

const validated = await api(base + '/load-imports/validate?forGeneration=true', admin, 'POST', form())
assert.equal(validated.totalPeriods, 671)
assert.equal(validated.demands.length, 251)
const [, ...roleRows] = await readSheet(workbook, '학급담당')
const classIds = new Map(roleRows.map(([grade, room, id]) => [grade + '-' + room, id]))
const names = new Map(roleRows.flatMap(([, , , head, headName, deputy, deputyName]) =>
  [[headName, head], [deputyName, deputy]]))
const subjects = new Map((await api('/api/school/subjects', admin)).map(row => [row.name, row.id]))
const [header, ...loadRows] = await readSheet(workbook, '시수표')
const expected = new Map()
for (const [name, subject, ...values] of loadRows) {
  for (const [index, hours] of values.slice(0, -1).entries()) {
    if (hours == null) continue
    const key = [classIds.get(header[index + 2]), names.get(name), subjects.get(subject)].join('/')
    assert.ok(!expected.has(key), 'Duplicate workbook assignment ' + key)
    expected.set(key, hours)
  }
}
assert.deepEqual(new Map(validated.demands.map(r => [[r.classId, r.teacherId, r.subjectId].join('/'), r.weeklyPeriods])), expected)
const assigned = await api(base + '/homerooms/import', admin, 'POST', form())
assert.equal(assigned.length, 21)
const staff = assigned.flatMap(r => [r.homeroomTeacher.schoolUserId, r.deputyTeacher.schoolUserId])
assert.equal(new Set(staff).size, 42)
assert.deepEqual(new Map(assigned.map(r => [r.classId, [r.homeroomTeacher.schoolUserId, r.deputyTeacher.schoolUserId]])),
  new Map(roleRows.map(([, , id, head, , deputy]) => [id, [head, deputy]])))
assert.deepEqual(await api(base + '/homerooms/import', admin, 'POST', form()), assigned)
assert.deepEqual(await api(base + '/homerooms', teacher), assigned)
await api(base + '/homerooms/import', teacher, 'POST', form(), 403)
const limits = new Map(conditions.gradeLastPeriods.map(r => [r.grade, r.lastPeriods]))
const grades = new Map(assigned.map(r => [String(r.classId), r.grade]))
const input = { ...conditions, validatedLoadId: validated.validatedLoadId }
const excess = structuredClone(input)
excess.gradeLastPeriods[0].lastPeriods.MON = 5
const blocked = await api(base + '/generations', admin, 'POST', excess, 400)
assert.match(blocked.message, /초과/)
await api(base + '/generations', admin, 'POST', { ...input, gradeLastPeriods: input.gradeLastPeriods.slice(1) }, 400)
await api(base + '/generations', admin, 'POST', { ...input, teachingSlots: [{ day: 'SAT', period: 1 }] }, 400)

const job = await api(base + '/generations', admin, 'POST', input, 202)
let done
const deadline = Date.now() + 100000
do {
  assert.ok(Date.now() < deadline, 'Timed out waiting for generation')
  await sleep(350)
  done = await api(job.statusUrl, admin)
} while (['RUNNING', 'QUEUED'].includes(done.state))
assert.equal(done.state, 'READY', done.result?.detail)
assert.deepEqual(done.gradeLastPeriods, conditions.gradeLastPeriods)
const roster = await api('/api/schools/' + school.schoolId + '/roster?termId=' + termId, admin)
const teachingIds = new Map(roster.filter(r => r.schoolUserId && r.teachingSchoolUserId)
  .map(r => [r.schoolUserId, r.teachingSchoolUserId]))
const unavailable = new Set((await api('/api/school/unavailabilities', admin)).map(row =>
  [teachingIds.get(row.schoolUserId) ?? row.schoolUserId, row.dayOfWeek, row.periodNumber].join('/')))
const slots = new Set(done.teachingSlots.map(s => s.day + '/' + s.period))
function verify(placements) {
  const teacherSlots = new Set(), classSlots = new Set(), totals = new Map()
  for (const p of placements) {
    const slot = p.slot.day + '/' + p.slot.period
    const classId = String(p.classId), grade = grades.get(classId)
    assert.ok(slots.has(slot) && p.slot.period <= limits.get(grade)[p.slot.day], 'Outside grade schedule')
    assert.ok(!unavailable.has(p.teacherId + '/' + slot), 'Teacher unavailable in ' + slot)
    assert.equal(teacherSlots.has(p.teacherId + '/' + slot), false, 'Teacher collision')
    assert.equal(classSlots.has(classId + '/' + slot), false, 'Class collision')
    teacherSlots.add(p.teacherId + '/' + slot)
    classSlots.add(classId + '/' + slot)
    const key = [p.classId, p.teacherId, p.subjectId].join('/')
    totals.set(key, 1 + (totals.get(key) || 0))
  }
  assert.deepEqual(totals, expected)
}
const candidates = done.result.candidates
assert.ok(candidates.length >= 1 && candidates.length <= 4)
for (const candidate of candidates) verify(candidate.placements)
const published = await api(base + '/publications', admin, 'POST', {
  jobId: job.jobId, candidateId: candidates[0].candidateId, effectiveFrom, expectedPublishRev: job.expectedPublishRev,
}, 201)
assert.equal(published.weeklyLessons, validated.totalPeriods)

const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const weekday = date => new Date(date + 'T00:00:00Z').getUTCDay()
const shift = (date, offset) => new Date(Date.parse(date + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10)
const key = (room, teacherId, subjectId, period) => [room, teacherId, subjectId, period].join('/')
const selected = candidates[0].placements
const periods = new Map((await api('/api/school-setting/periods', admin)).map(p => [p.id, p.periodNumber]))
const user = await api('/api/mypage/teacher/profile', teacher)
const directory = await api('/api/school/teachers?termId=' + termId, admin)
const member = directory.find(row => row.userId === user.userId)
assert.ok(member, 'The teacher session must be linked to a School42 teaching identity')
const teachingMemberId = teachingIds.get(member.schoolUserId) ?? member.schoolUserId
const teacherLessons = selected.filter(p => Number(p.teacherId) === teachingMemberId).length
assert.ok(teacherLessons > 0, 'Select a School42 teacher with weekly lessons')
const weekPath = '/year/' + term.academicYear + '/semester/' + term.semester + '?termId=' + termId + '&weekOf='
const excluded = new Set(term.excludedDates)
let datedLessons = 0
let datedTeacherLessons = 0
const firstMonday = shift(effectiveFrom, -((weekday(effectiveFrom) + 6) % 7))
for (let monday = firstMonday; monday <= term.endDate; monday = shift(monday, 7)) {
  const [schoolWeek, teacherWeek] = await Promise.all([
    api('/api/timetable' + weekPath + monday, admin),
    api('/api/timetable/me' + weekPath + monday, teacher),
  ])
  for (let offset = 0; offset < 7; offset++) {
    const date = shift(monday, offset)
    if (date < effectiveFrom) continue  // Earlier days can still use a previous version.
    const day = days[weekday(date)]
    const template = excluded.has(date) || date > term.endDate ? [] : selected.filter(p => p.slot.day === day)
    const sortedSlots = template.map(p => key(p.classId, p.teacherId, p.subjectId, p.slot.period)).sort()
    const dated = await api(base + '/lessons?date=' + date, teacher)
    assert.ok(dated.every(r => r.date === date && r.versionId === published.versionId && !r.actual.cancelled))
    assert.deepEqual(dated.map(r => key(r.classId, r.actual.teacherId, r.subjectId, periods.get(r.actual.periodId))).sort(),
      sortedSlots, 'Dated lessons ' + date)
    const dayRows = schoolWeek.filter(r => r.dayOfWeek === day)
    assert.deepEqual(dayRows.map(r => key(r.schoolClassId, r.teacherId, r.subjectId, r.periodNumber)).sort(),
      sortedSlots, 'School week ' + date)
    const own = dayRows.filter(r => r.teacherId === teachingMemberId)
    assert.deepEqual(teacherWeek.filter(r => r.dayOfWeek === day), own, 'Teacher week ' + date)
    datedLessons += dated.length
    datedTeacherLessons += own.length
  }
}
console.log(JSON.stringify({ termId, effectiveFrom, endDate: term.endDate, assignments: expected.size,
  classrooms: assigned.length, staff: staff.length, candidates: candidates.length, lessons: published.weeklyLessons,
  teacherLessons,
  datedLessons, datedTeacherLessons, excludedDatesChecked: [...excluded].filter(d => d >= effectiveFrom),
  version: published.versionId, outsideGrade: 0, teacherCollisions: 0, classCollisions: 0,
  unavailableViolations: 0, excessMessage: blocked.message }, null, 2))
