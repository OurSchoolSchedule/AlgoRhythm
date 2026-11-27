import type { DatedLessonDto } from './datedLesson'

export type NewLessonChange = { firstId: number; firstRev: number } & (
  | { kind: 'SUBSTITUTE'; substituteTeacherId: number }
  | { kind: 'SWAP'; secondId: number; secondRev: number }
)

export type LessonChange = {
  id: number
  termId: number
  requester: number // school_user.id
  responder: number
  firstId: number
  firstRev: number
  rev: number
  state: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED' | 'WITHDRAWN'
} & (
  | { kind: 'SUBSTITUTE'; secondId: null; secondRev: null }
  | { kind: 'SWAP'; secondId: number; secondRev: number }
)

export interface ChangeDecision {
  accept: boolean
  expectedRequestRev: number
}

export interface ChangeApproval {
  expectedRequestRev: number
  expectedLessonRev: number
  expectedSecondRev?: number
}

export interface ApprovedChange {
  requestId: number
  state: 'APPROVED'
  requestRev: number
  lessons: DatedLessonDto[]
}

export interface ChangeConflict {
  code?: string
  message?: string
  currentRev?: number | null
  activeJobId?: string | null
}

export type ChangeOutcome =
  | { phase: 'created' | 'responded'; change: LessonChange; count?: number }
  | { phase: 'approved'; receipt: ApprovedChange }
  | { phase: 'conflict'; problem: ChangeConflict }

export type ChangeResult = ChangeOutcome & { refreshError: unknown | null }
