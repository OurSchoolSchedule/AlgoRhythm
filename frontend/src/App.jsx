import { useEffect, useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import NotificationSidebar from '@/components/layout/NotificationSidebar'
import AIFloatingChat from '@/components/common/AIFloatingChat'
import HomeView from '@/pages/home/HomeView'
import ScheduleCreateView from '@/pages/schedule/ScheduleCreateView'
import TimetableView from '@/pages/schedule/TimetableView'
import SubjectManageView from '@/pages/store/SubjectManageView'
import HistoryView, { AdminView } from '@/pages/history/HistoryView'
import { DevLoginView } from '@/pages/auth'
import { getAccessToken, clearTokens, clearPreviewUserRole, getPreviewUserRole, setOnAuthError } from '@/api'
import { useLogout, useActiveStore } from '@/hooks'
import { positionToUserRole } from '@/constants/domainLabels.js'
import { applyTheme, getStoredTheme } from '@/theme'

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken() || getPreviewUserRole()))
  const [alarmOpen, setAlarmOpen] = useState(false)
  const [currentView, setCurrentView] = useState('home')
  const [userRole, setUserRole] = useState(() => getPreviewUserRole() ?? 'admin')
  const logoutMutation = useLogout()
  const { data: activeStore } = useActiveStore({ enabled: authed && Boolean(getAccessToken()) })
  const storeRole = activeStore?.position ? positionToUserRole(activeStore.position) : null
  const [appliedStoreRole, setAppliedStoreRole] = useState(null)
  if (!getPreviewUserRole() && storeRole && storeRole !== appliedStoreRole) {
    setAppliedStoreRole(storeRole)
    setUserRole(storeRole)
  }

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
      <DevLoginView
        onSuccess={(role) => {
          if (role) setUserRole(role)
          setAuthed(true)
        }}
      />
    )
  }

  const navigate = (view) => {
    setCurrentView(view)
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView navigate={navigate} userRole={userRole} />
      case 'timetable':
        return <TimetableView navigate={navigate} userRole={userRole} />
      case 'schedule-create':
        return <ScheduleCreateView navigate={navigate} />
      case 'subject-manage':
        return <SubjectManageView />
      case 'history':
        return <HistoryView navigate={navigate} />
      case 'admin':
        return <AdminView navigate={navigate} />
      default:
        return <HomeView navigate={navigate} userRole={userRole} />
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-bg)',
        fontFamily: "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', sans-serif",
        overflow: 'hidden',
      }}
    >
      <TopNav
        navigate={navigate}
        currentView={currentView}
        userRole={userRole}
        alarmOpen={alarmOpen}
        onAlarmToggle={() => setAlarmOpen((open) => !open)}
        onLogout={handleLogout}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <main className={`hide-scrollbar app-main`}>
          <div className="app-content">
            {renderView()}
          </div>
        </main>

        <NotificationSidebar
          open={alarmOpen}
          onClose={() => setAlarmOpen(false)}
          userRole={userRole}
        />
      </div>

      <AIFloatingChat />
    </div>
  )
}
