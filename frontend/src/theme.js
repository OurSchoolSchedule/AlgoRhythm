const STORAGE_KEY = 'theme'

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* private mode */
  }
  return 'system'
}

export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(preference) {
  const theme = resolveTheme(preference)
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.backgroundColor = ''
  return theme
}

export function setThemePreference(preference) {
  localStorage.setItem(STORAGE_KEY, preference)
  return applyTheme(preference)
}
