// Only the deployed fields that determine loader state are required here.
type TerminalState = 'READY' | 'INFEASIBLE' | 'TIME_LIMIT_NO_SOLUTION' | 'FAILED'
export interface GenerationProgressDto {
  jobId: string
  state: 'QUEUED' | 'RUNNING' | TerminalState
}

export type ScheduleProgress =
  | { phase: 'uploading'; percent: number | null }
  | { phase: 'validating' }
  | { phase: 'validated'; validatedLoadId: string | null }
  | { phase: 'queued' | 'running'; jobId: string }
  | { phase: 'finished'; outcome: TerminalState; jobId: string }
  | { phase: 'validation-error'; error: unknown }

type Bytes = number | null | undefined

export function uploadProgress(loaded?: Bytes, total?: Bytes): ScheduleProgress {
  if (
    typeof loaded !== 'number' ||
    !Number.isSafeInteger(loaded) ||
    loaded < 0 ||
    typeof total !== 'number' ||
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    loaded > total
  ) {
    return { phase: 'uploading', percent: null }
  }
  if (loaded === total) return { phase: 'validating' }
  return { phase: 'uploading', percent: Math.floor((loaded / total) * 100) }
}

// A response to validation can also arrive when no measurable upload event was reported.
export function validatedProgress(dto: { validatedLoadId?: string | null }): ScheduleProgress {
  return { phase: 'validated', validatedLoadId: dto.validatedLoadId ?? null }
}

export function generationProgress({ jobId, state }: GenerationProgressDto): ScheduleProgress {
  switch (state) {
    case 'QUEUED':
      return { phase: 'queued', jobId }
    case 'RUNNING':
      return { phase: 'running', jobId }
    default:
      return { phase: 'finished', outcome: state, jobId }
  }
}

const terminalLabels: Record<TerminalState, string> = {
  READY: '후보 생성 완료',
  INFEASIBLE: '조건을 충족하는 시간표 없음',
  TIME_LIMIT_NO_SOLUTION: '제한 시간 내 후보 없음',
  FAILED: '후보 생성 실패',
}

const phaseLabels = {
  uploading: '시수표 업로드 중',
  validating: '시수표 검증 중',
  validated: '시수표 검증 완료',
  'validation-error': '시수표 검증 실패',
  queued: '편성 대기 중',
  running: '후보 생성 중',
}

export type ProgressBar =
  | { kind: 'determinate'; percent: number }
  | { kind: 'indeterminate' | 'none' }

export interface LoaderPresentation {
  label: string
  bar: ProgressBar
  mascot: { asset: '살금살금 걷는 노란 병아리-1.png'; motion: 'walk-right' | 'still' } | null
}

export function loadingPresentation(
  progress: ScheduleProgress,
  reducedMotion: boolean,
): LoaderPresentation {
  const label =
    progress.phase === 'finished' ? terminalLabels[progress.outcome] : phaseLabels[progress.phase]
  if (
    progress.phase === 'finished' ||
    progress.phase === 'validated' ||
    progress.phase === 'validation-error'
  ) {
    return { label, bar: { kind: 'none' }, mascot: null }
  }
  const bar: ProgressBar =
    progress.phase === 'uploading' && progress.percent !== null
      ? { kind: 'determinate', percent: progress.percent }
      : { kind: reducedMotion ? 'none' : 'indeterminate' }
  return {
    label,
    bar,
    mascot: {
      asset: '살금살금 걷는 노란 병아리-1.png',
      motion: reducedMotion ? 'still' : 'walk-right',
    },
  }
}
