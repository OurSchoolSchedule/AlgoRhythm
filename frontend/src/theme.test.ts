import { readFileSync } from 'node:fs'
import { parse } from 'postcss'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { getStoredTheme, resolveTheme, setThemePreference } from './theme.js'
import type { ResolvedTheme, ThemePreference } from './theme.js'

const stylesheet = parse(readFileSync(new URL('./index.css', import.meta.url), 'utf8'))
function declarations(selector: string) {
  const values = new Map<string, string>()
  stylesheet.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls((decl) => {
        values.set(decl.prop, decl.value)
      })
    }
  })
  return values
}

describe('theme preference', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([false, true])('resolves system mode and applies data-theme (dark OS = %s)', (dark) => {
    const storage = new Map<string, string>()
    const attributes = new Map<string, string>()
    vi.stubGlobal('window', { matchMedia: () => ({ matches: dark }) })
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    })
    vi.stubGlobal('document', {
      documentElement: { style: {}, setAttribute: attributes.set.bind(attributes) },
    })

    const system = dark ? 'dark' : 'light'
    expect(getStoredTheme()).toBe('system')
    const choices: ThemePreference[] = ['light', 'dark', 'system']
    for (const preference of choices) {
      const expected = preference === 'system' ? system : preference
      expect(setThemePreference(preference)).toBe(expected)
      expect(getStoredTheme()).toBe(preference)
      expect(attributes.get('data-theme')).toBe(expected)
    }
    expectTypeOf(resolveTheme).returns.toEqualTypeOf<ResolvedTheme>()
  })
})

describe('timetable state tokens', () => {
  const light = declarations(':root')
  const dark = declarations("[data-theme='dark']")
  it.each([
    ['--timetable-today-bg', '--color-primary-subtle'],
    ['--timetable-selection-ring', '--color-primary-text'],
    ['--keyboard-focus-ring', '--color-info-text'],
  ])('%s follows the light and dark palettes', (token, palette) => {
    expect(light.get(token)).toBe('var(' + palette + ')')
    expect(light.get(palette)).toBeTruthy()
    expect(dark.get(palette)).toBeTruthy()
    expect(dark.get(palette)).not.toBe(light.get(palette))
  })

  it('keeps today, selection and keyboard focus on independent layers', () => {
    for (const selector of [
      '.tt-headcell.is-today',
      '.tt-slot.is-today:not(.has-subject)',
      '.tt-slot.is-today.has-subject::before',
    ]) {
      expect(declarations(selector).get('background')).toBe('var(--timetable-today-bg)')
    }
    expect(declarations('.tt-slot.is-selected::after').get('border')).toContain(
      'var(--timetable-selection-ring)',
    )
    expect(declarations('.tt-slot:focus-visible').get('outline')).toContain(
      'var(--keyboard-focus-ring)',
    )
  })
})
