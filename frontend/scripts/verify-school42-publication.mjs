// Exercise a disposable School42 term through the same authenticated HTTP endpoints as the UI.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const origin = new URL(process.env.SCHOOL42_LOCAL_API || 'http://127.0.0.1:8080')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Use a disposable loopback API')
const base = '/api/v2/terms/547001'
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

const validated = await api(base + '/load-imports/validate?forGeneration=true', admin, 'POST', form())
assert.equal(validated.totalPeriods, 671)
assert.equal(validated.demands.length, 251)
const expected = new Map(validated.demands.map(r => [[r.classId, r.teacherId, r.subjectId].join('/'), r.weeklyPeriods]))
const assigned = await api(base + '/homerooms/import', admin, 'POST', form())
assert.equal(assigned.length, 21)
const staff = assigned.flatMap(r => [r.homeroomTeacher.schoolUserId, r.deputyTeacher.schoolUserId])
assert.equal(new Set(staff).size, 42)
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
const slots = new Set(done.teachingSlots.map(s => s.day + '/' + s.period))
function verify(placements) {
  const teacherSlots = new Set(), classSlots = new Set(), totals = new Map()
  for (const p of placements) {
    const slot = p.slot.day + '/' + p.slot.period
    const classId = String(p.classId), grade = grades.get(classId)
    assert.ok(slots.has(slot) && p.slot.period <= limits.get(grade)[p.slot.day], 'Outside grade schedule')
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
  jobId: job.jobId, candidateId: candidates[0].candidateId, effectiveFrom: '2026-11-23', expectedPublishRev: job.expectedPublishRev,
}, 201)
const week = '/year/2026/semester/2?termId=547001&weekOf=2026-11-23'
const rows = await api('/api/timetable' + week, admin)
verify(rows.map(r => ({ classId: r.schoolClassId, subjectId: r.subjectId, teacherId: r.teacherId, slot: { day: r.dayOfWeek, period: r.periodNumber } })))
assert.equal(published.weeklyLessons, rows.length)
const mine = await api('/api/timetable/me' + week, teacher)
assert.ok(mine.length)
const ids = new Set(mine.map(r => r.teacherId))
assert.equal(ids.size, 1)
assert.deepEqual(mine.map(r => r.weeklyLessonId).sort(), rows.filter(r => ids.has(r.teacherId)).map(r => r.weeklyLessonId).sort())
console.log(JSON.stringify({ assignments: expected.size, classrooms: assigned.length, staff: staff.length, candidates: candidates.length,
  lessons: rows.length, teacherLessons: mine.length, version: published.versionId,
  outsideGrade: 0, teacherCollisions: 0, classCollisions: 0, excessMessage: blocked.message }, null, 2))
