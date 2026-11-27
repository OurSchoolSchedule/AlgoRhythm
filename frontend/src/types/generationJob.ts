import type { DayOfWeek } from './common.js'

export interface TeachingSlot {
  day: DayOfWeek
  period: number
}

export type SchoolWeekday = Exclude<DayOfWeek, 'SAT' | 'SUN'>
export interface GradeLastPeriods {
  grade: number
  lastPeriods: Record<SchoolWeekday, number>
}

export type GenerationObjective = 'BALANCED' | 'MIN_TEACHER_GAPS' | 'PREFER_WANTS'

export interface GenerationRequest {
  objective?: GenerationObjective
  validatedLoadId: string
  teachingSlots?: TeachingSlot[]
  gradeLastPeriods?: GradeLastPeriods[]
  preferences?: {
    teacherId: string
    kind: 'WANT' | 'AVOID'
    anyOf: TeachingSlot[]
  }[]
}

export interface AcceptedGeneration {
  jobId: string
  expectedPublishRev: number
  state: 'QUEUED'
  statusUrl: string
}

export interface ScheduleCandidate {
  candidateId: string
  score: {
    teacherGapPeriods?: number | null
    wantsMet: number
    wantsTotal: number
    teachersWithNoWantMet: number
    avoidsMet: number
    avoidsTotal: number
  }
  placements: {
    teacherId: string
    subjectId: string
    classId: string
    slot: TeachingSlot
  }[]
}

interface GenerationResult {
  jobId: string
  expectedPublishRev: number
  validatedLoadId: string
  status: 'READY' | 'INFEASIBLE' | 'TIME_LIMIT_NO_SOLUTION'
  stopReason: 'SEARCH_EXHAUSTED' | 'TOP_FOUR_AT_BOUND' | 'CAPACITY' | 'TIME_LIMIT'
  detail: string | null
  elapsedMs: number
  candidates: ScheduleCandidate[]
}

export type GenerationJob = Pick<AcceptedGeneration, 'jobId' | 'expectedPublishRev'> & {
  objective?: GenerationObjective
  teachingSlots?: TeachingSlot[]
  gradeLastPeriods?: GradeLastPeriods[] | null
  classGrades?: Record<string, number> | null
  registeredPeriods?: number[]
} & (
    | { state: 'QUEUED' | 'RUNNING' | 'FAILED'; result: null }
    | { state: 'READY'; result: GenerationResult & { status: 'READY' } }
    | {
        state: 'INFEASIBLE' | 'TIME_LIMIT_NO_SOLUTION'
        result: GenerationResult | null
      }
  )
