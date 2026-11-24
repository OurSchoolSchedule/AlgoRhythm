import type { DatedLessonDto } from './datedLesson'
import type { GenerationJob } from './generationJob'

export interface PublicationRequest {
  jobId: string
  candidateId: string
  effectiveFrom: string
  expectedPublishRev: number
}

export interface PublicationReceipt {
  versionId: number
  publishRev: number
  weeklyLessons: number
}

// A schedule conflict can omit the revision or explicitly return null.
export interface PublicationConflict {
  code?: string
  message?: string
  currentRev?: number | null
  activeJobId?: string | null
}

export type PublicationRecovery =
  | 'reselect-candidate'
  | 'regenerate'
  | 'revalidate-load'
  | 'review-dated-lessons'
  | 'review-publication'

export interface PublicationRefresh {
  job?: GenerationJob
  lessons?: DatedLessonDto[]
  failures: { source: 'timetables' | 'lessons' | 'job'; error: unknown }[]
}

export type PublicationOutcome = { request: PublicationRequest; refresh: PublicationRefresh } & (
  | { phase: 'published'; receipt: PublicationReceipt }
  | { phase: 'conflict'; problem: PublicationConflict; recovery: PublicationRecovery }
)

export type PublicationState =
  | { phase: 'idle' }
  | { phase: 'publishing'; request: PublicationRequest }
  | { phase: 'error'; error: Error; request: PublicationRequest }
  | PublicationOutcome
