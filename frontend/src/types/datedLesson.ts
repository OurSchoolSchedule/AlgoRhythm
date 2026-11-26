export interface HomeTerm {
  schoolId: number
  termId: number
  academicYear: number
  semester: number
}

export interface LessonAssignmentDto {
  teacherId: number // school_user.id
  periodId: number // period_setting.id
  cancelled?: boolean
}

export interface DatedLessonDto {
  id: number
  originId: number // v2 weekly_lesson.id
  termId: number
  versionId: number
  originDate: string
  date: string
  classId: number
  subjectId: number
  planned: LessonAssignmentDto
  actual: LessonAssignmentDto
  rev: number
}

export interface HomeLessonSelection {
  schoolId: number
  termId: number
  kind: 'SUBSTITUTE' | 'SWAP'
  date: string
  datedLessonId: number
  rev: number
  teacherId: number
}
