import type { DayOfWeek } from './common.js'

export interface TeachingSlot {
  day: DayOfWeek
  period: number
}

export interface GenerationRequest {
  validatedLoadId: string
  teachingSlots?: TeachingSlot[]
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

export type GenerationJob = Pick<AcceptedGeneration, 'jobId' | 'expectedPublishRev'> &
  (
    | { state: 'QUEUED' | 'RUNNING' | 'FAILED'; result: null }
    | { state: 'READY'; result: GenerationResult & { status: 'READY' } }
    | {
        state: 'INFEASIBLE' | 'TIME_LIMIT_NO_SOLUTION'
        result: GenerationResult | null
      }
  )
