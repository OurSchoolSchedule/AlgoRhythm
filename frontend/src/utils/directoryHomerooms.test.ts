import { expect, it } from 'vitest'
import type { HomeMemberDto } from '@/types/home'
import { directoryHomerooms } from './directoryHomerooms'

const legacy = { classId: 544006, academicYear: 2026, grade: 1, classNumber: 6 }
const assigned = { ...legacy, classId: 544003, classNumber: 3 }
const member: HomeMemberDto = {
  userId: 541004, schoolUserId: 542004, subjects: [],
  homeroomClasses: [legacy, { ...legacy, academicYear: 2025, classId: 1 }],
  rosterLinked: false, rosterAssignmentTermId: null, rosterHomeroomClass: null,
}
const term = 547001

it('uses only the selected academic year for a membership without a linked roster', () => {
  expect(directoryHomerooms(member, 2026, null)).toEqual([legacy])
  expect(directoryHomerooms(member, 2026, term)).toEqual([legacy])
  expect(directoryHomerooms(member, null, term)).toBeUndefined()
  expect(directoryHomerooms(member, 2027, term)).toEqual([])
})

it('keeps term not selected and term not recorded distinct from a confirmed empty assignment', () => {
  const linked = { ...member, rosterLinked: true }
  expect(directoryHomerooms(linked, 2026, null)).toBeUndefined()
  expect(directoryHomerooms(linked, 2026, term)).toBeUndefined()
  expect(directoryHomerooms({ ...linked, rosterAssignmentTermId: term }, 2026, term)).toEqual([])
})

it('uses only the assigned class and discards a response for a different term or academic year', () => {
  const linked = { ...member, rosterLinked: true, rosterAssignmentTermId: term, rosterHomeroomClass: assigned }
  expect(directoryHomerooms(linked, 2026, term)).toEqual([assigned])
  expect(directoryHomerooms(linked, 2026, term + 1)).toBeUndefined()
  expect(directoryHomerooms(linked, 2025, term)).toBeUndefined()
})

it('does not infer an empty assignment from an ambiguous older directory response', () => {
  const older = { ...member, rosterLinked: undefined, rosterAssignmentTermId: undefined, rosterSubjects: [] }
  expect(directoryHomerooms(older, 2026, term)).toBeUndefined()
  expect(directoryHomerooms({ ...older, rosterHomeroomClass: assigned }, 2026, term)).toEqual([assigned])
})

it('uses the resolved class list including rooms added after a term import', () => {
  const linked = { ...member, rosterLinked: true, homeroomAssignmentTermId: term, termHomeroomsApplied: false }
  expect(directoryHomerooms(linked, 2026, term)).toEqual([legacy])
  expect(directoryHomerooms(linked, 2026, term + 1)).toBeUndefined()
})

it('returns all primary assignments for this term and leaves deputies separate', () => {
  const other = { ...assigned, classId: 8 }
  const linked = {
    ...member, rosterLinked: true, homeroomAssignmentTermId: term,
    homeroomClasses: [legacy, assigned], deputyHomeroomClasses: [other],
  }
  expect(directoryHomerooms(linked, 2026, term)).toEqual([legacy, assigned])
  expect(directoryHomerooms({ ...linked, homeroomClasses: [] }, 2026, term)).toEqual([])
})
