// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GuidePage from './GuidePage'
import { guideHash, guideLocation, guideSteps } from './guideSteps'

beforeEach(() => {
  window.history.replaceState(null, '', '/guide')
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Unexpected request')
    }),
  )
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {
    throw new Error('Unexpected request')
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

it('opens without authentication or a query provider, with only a static example', () => {
  render(<GuidePage />)
  expect(screen.getByRole('heading', { name: '내 시간표 확인' })).toBeTruthy()
  expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('progressbar').getAttribute('max')).toBe(
    String(guideSteps.teacher.length),
  )
  expect(screen.getByRole('img').getAttribute('src')).toMatch(/week.*webp/)
  expect(fetch).not.toHaveBeenCalled()
  expect(XMLHttpRequest.prototype.open).not.toHaveBeenCalled()
})

it('supports switching roles, forward/backward navigation and the mobile contents selector', async () => {
  render(<GuidePage />)
  fireEvent.click(screen.getByRole('link', { name: '관리자' }))
  await screen.findByRole('heading', { name: '시수표 검증' })
  fireEvent.click(screen.getByRole('link', { name: '다음' }))
  const heading = await screen.findByRole('heading', { name: '학년별 마지막 교시' })
  expect(document.activeElement).toBe(heading)
  fireEvent.click(screen.getByRole('link', { name: '다음' }))
  await screen.findByRole('heading', { name: '후보 생성과 비교' })
  fireEvent.click(screen.getByRole('button', { name: '이전' }))
  await screen.findByRole('heading', { name: '학년별 마지막 교시' })
  fireEvent.click(screen.getByRole('button', { name: '이전' }))
  await screen.findByRole('heading', { name: '시수표 검증' })
  fireEvent.change(screen.getByRole('combobox', { name: '단계 선택' }), {
    target: { value: 'approve' },
  })
  await screen.findByRole('heading', { name: '보결·교환 승인' })
  const nav = screen.getByRole('navigation')
  expect(within(nav).getByRole('link', { current: 'step' }).getAttribute('href')).toBe(
    '#admin/approve',
  )
  window.history.back()
  await waitFor(() => expect(screen.getByRole('heading', { name: '시수표 검증' })).toBeTruthy())
  expect(fetch).not.toHaveBeenCalled()
  expect(XMLHttpRequest.prototype.open).not.toHaveBeenCalled()
})

it('restores a saved step and provides a way home after the last step', () => {
  const last = guideSteps.teacher.at(-1)!
  window.history.replaceState(null, '', '/guide' + guideHash('teacher', last))
  render(<GuidePage />)
  expect(screen.getByRole('heading', { name: last.title })).toBeTruthy()
  const pager = screen.getByRole('group', { name: '단계 이동' })
  expect(within(pager).getByRole('link', { name: '서비스로 돌아가기' }).getAttribute('href')).toBe(
    '/',
  )
})

it('keeps each role’s contents aligned with real local captures and handles unknown steps', () => {
  const images = Object.keys(import.meta.glob('./examples/*.webp')).map((s) =>
    s.slice('./examples/'.length, -5),
  )
  for (const [role, steps] of Object.entries(guideSteps)) {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length)
    for (const step of steps) {
      expect(images).toContain(step.id)
      expect(guideLocation('#' + role + '/' + step.id).step).toEqual(step)
      expect(step.alt && step.action && step.result).toBeTruthy()
    }
  }
  expect(guideLocation('#admin/removed').step.id).toBe('validate')
  expect(guideLocation('#unknown').step.id).toBe('week')
  expect(guideSteps.teacher.map((s) => s.id)).not.toContain('approve')
})
