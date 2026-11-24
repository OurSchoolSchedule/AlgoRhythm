// @ts-check
/** @typedef {'light' | 'dark'} ResolvedTheme */
/** @typedef {ResolvedTheme | 'system'} ThemePreference */

const STORAGE_KEY = 'theme'

/** @returns {ThemePreference} */
export function getStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* private mode */
  }
  return 'system'
}

/** @param {ThemePreference} preference @returns {ResolvedTheme} */
export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** @param {ThemePreference} preference */
export function applyTheme(preference) {
  const theme = resolveTheme(preference)
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.backgroundColor = ''
  return theme
}

/** @param {ThemePreference} preference */
export function setThemePreference(preference) {
  localStorage.setItem(STORAGE_KEY, preference)
  return applyTheme(preference)
}
