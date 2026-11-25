import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme, getStoredTheme } from '@/theme'
import GuidePage from './GuidePage'

const syncTheme = () => applyTheme(getStoredTheme())
syncTheme()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme)
window.addEventListener('storage', syncTheme)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GuidePage />
  </StrictMode>,
)
