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
  it.each([
    ['QUEUED', 'queued', '편성 대기 중'],
    ['RUNNING', 'running', '후보 생성 중'],
  ] as const)(
    '%s일 때 진행률을 추측하지 않으며 동작 감소 시 같은 문구와 정지 이미지를 쓴다',
    (state, phase, label) => {
      const progress = generationProgress({ jobId: '00042', state })
      expect(progress).toEqual({ phase, jobId: '00042' })
      const asset = '살금살금 걷는 노란 병아리-1.png'
      expect(loadingPresentation(progress, false)).toEqual({
        label,
        bar: { kind: 'indeterminate' },
        mascot: { asset, motion: 'walk-right' },
      })
      expect(loadingPresentation(progress, true)).toEqual({
        label,
        bar: { kind: 'none' },
        mascot: { asset, motion: 'still' },
      })
    },
  )
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
