import { useEffect, useState } from 'react'
import SchoolWorkspace from '@/components/layout/SchoolWorkspace'
import ServiceFooter from '@/components/layout/ServiceFooter'
import { DevLoginView } from '@/pages/auth'
import {
  getAccessToken,
  clearTokens,
  clearPreviewUserRole,
  getPreviewUserRole,
  setOnAuthError,
} from '@/api'
import { useLogout } from '@/hooks'
import { applyTheme, getStoredTheme } from '@/theme'

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken() || getPreviewUserRole()))
  const logoutMutation = useLogout()

  useEffect(() => {
    setOnAuthError(() => setAuthed(false))
    return () => setOnAuthError(null)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        clearTokens()
        clearPreviewUserRole()
        setAuthed(false)
      },
    })
  }

  if (!authed) {
    return (
      <div className="auth-layout">
        <DevLoginView onSuccess={() => setAuthed(true)} />
        <ServiceFooter />
      </div>
    )
  }
  return <SchoolWorkspace onLogout={handleLogout} />
}
