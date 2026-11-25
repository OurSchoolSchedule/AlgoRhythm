import { useEffect, useState } from 'react'
import SchoolWorkspace from '@/components/layout/SchoolWorkspace'
import { RosterReviewContext } from '@/pages/roster/RosterReviewContext'
import RosterGate from '@/pages/roster/RosterGate'
import ServiceFooter from '@/components/layout/ServiceFooter'
import { EmailEntryView } from '@/pages/auth'
import {
  getAccessToken,
  hasPendingSchool,
  clearTokens,
  clearPreviewUserRole,
  getPreviewUserRole,
  setOnAuthError,
} from '@/api'
import { useLogout } from '@/hooks'
import { applyTheme, getStoredTheme } from '@/theme'

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean((getAccessToken() && !hasPendingSchool()) || getPreviewUserRole()))
  const [entryVersion, setEntryVersion] = useState(0)
  const logoutMutation = useLogout()

  useEffect(() => {
    setOnAuthError(() => {
      setAuthed(false)
      setEntryVersion((version) => version + 1)
    })
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
        <EmailEntryView key={entryVersion} onSuccess={() => setAuthed(true)} />
        <ServiceFooter />
      </div>
    )
  }
  return <RosterGate onLogout={handleLogout}>
    {review => <RosterReviewContext.Provider value={review}>
      <SchoolWorkspace onLogout={handleLogout} />
    </RosterReviewContext.Provider>}
  </RosterGate>
}
