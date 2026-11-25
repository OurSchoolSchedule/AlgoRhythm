import type { HomeTerm } from './datedLesson'

export type RosterScope = Pick<HomeTerm, 'schoolId' | 'termId'>
export interface Assignment {
  assignmentRecorded?: boolean
  subjects: { subjectId: number; subjectName: string }[]
  homeroomClass: {
    classId: number
    academicYear: number
    grade: number
    classNumber: number
  } | null
}
export interface RosterEntry {
  rosterId: number
  authEmail: string
  displayName: string
  schoolId: number
  schoolUserId: number | null
  status: 'LINKED' | 'UNLINKED' | 'PENDING'
  employmentStatus: string | null
  term: Assignment & { termId: number }
}
export interface RosterChange {
  authEmail: string
  rows: number[]
  action: 'ADD' | 'UPDATE' | 'UNCHANGED'
  before: RosterEntry | null
  after: Assignment & { displayName: string }
}
export interface CellIssue {
  code: string
  sheet: string | null
  row: number | null
  column: string | null
  cell: string | null
  message: string
}
export interface RosterCounts {
  add: number
  update: number
  unchanged: number
  errors: number
}
export interface RosterReceipt {
  previewId: string
  fileSha256: string
  counts: RosterCounts
}
export interface RosterPreview {
  previewId: string | null
  fileSha256: string
  counts: RosterCounts
  changes: RosterChange[]
  errors: CellIssue[]
}
