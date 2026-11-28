import { describe, expect, it } from 'vitest'
import {
  generationProgress,
  loadingPresentation,
  uploadProgress,
  validatedProgress,
} from './scheduleProgress'

describe('실제 전송량과 서버 검증', () => {
  it.each([
    [24, undefined],
    [undefined, 100],
    [0, 0],
    [-1, 100],
    [101, 100],
    [NaN, 100],
    [5, Infinity],
  ])('전송량 %s, 전체 %s로 비율을 확정할 수 없으면 불확정 막대를 사용한다', (loaded, total) => {
    const state = uploadProgress(loaded, total)
    expect(state).toEqual({ phase: 'uploading', percent: null })
    expect(loadingPresentation(state, false).bar).toEqual({ kind: 'indeterminate' })
  })
  it('알려진 바이트만으로 전송률을 계산하고 전송 100%와 서버 검증 완료를 구분한다', () => {
    expect(uploadProgress(0, 100)).toEqual({ phase: 'uploading', percent: 0 })
    expect(loadingPresentation(uploadProgress(42, 100), false).bar).toEqual({
      kind: 'determinate',
      percent: 42,
    })
    expect(uploadProgress(9999, 10000)).toEqual({ phase: 'uploading', percent: 99 })
    const waiting = uploadProgress(10000, 10000)
    expect(waiting).toEqual({ phase: 'validating' })
    expect(loadingPresentation(waiting, false)).toMatchObject({
      label: '시수표 검증 중',
      bar: { kind: 'indeterminate' },
    })
    expect(validatedProgress({ validatedLoadId: '00042' })).toEqual({
      phase: 'validated',
      validatedLoadId: '00042',
    })
    expect(validatedProgress({ validatedLoadId: null })).toEqual({
      phase: 'validated',
      validatedLoadId: null,
    })
    expect(validatedProgress({})).toEqual({ phase: 'validated', validatedLoadId: null })
    expect(loadingPresentation(uploadProgress(42, 100), true).bar).toEqual({
      kind: 'determinate',
      percent: 42,
    })
    expect(
      loadingPresentation({ phase: 'validation-error', error: 'INVALID_CELL' }, false).bar.kind,
    ).toBe('none')
  })
})

describe('편성 및 마스코트 표시 상태', () => {
  it('대기 상태는 0%, 탐색 중에는 서버의 예상 진행률만 표시한다', () => {
    const queued = generationProgress({ jobId: '00042', state: 'QUEUED' })
    expect(loadingPresentation(queued, false).bar).toEqual({ kind: 'determinate', percent: 0 })
    const running = { jobId: '00042', state: 'RUNNING' as const }
    const progress = generationProgress({ ...running, estimatedProgressPercent: 65 })
    expect(loadingPresentation(progress, false).bar).toEqual({ kind: 'determinate', percent: 65 })
    expect(loadingPresentation(progress, true).mascot?.motion).toBe('still')
    for (const invalid of [undefined, null, 100, -1, NaN, 1.2]) {
      const unknown = generationProgress({ ...running, estimatedProgressPercent: invalid })
      expect(loadingPresentation(unknown, false).bar.kind).toBe('indeterminate')
      expect(loadingPresentation(unknown, true).bar.kind).toBe('none')
    }
  })
  it.each(['READY', 'INFEASIBLE', 'TIME_LIMIT_NO_SOLUTION', 'FAILED'] as const)(
    '%s 종료 사유를 보존하고 진행 표시를 끝낸다',
    (state) => {
      const progress = generationProgress({ jobId: '00042', state })
      expect(progress).toEqual({ phase: 'finished', outcome: state, jobId: '00042' })
      expect(loadingPresentation(progress, false)).toMatchObject({
        bar: { kind: 'none' },
        mascot: null,
      })
    },
  )
})
