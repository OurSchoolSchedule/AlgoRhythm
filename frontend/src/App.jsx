import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import HeaderUserMenu from '@/components/layout/HeaderUserMenu'
import NotificationSidebar from '@/components/layout/NotificationSidebar'
import AIFloatingChat from '@/components/common/AIFloatingChat'
import HomeView from '@/pages/home/HomeView'
import WorkerHomeView from '@/pages/home/WorkerHomeView'
import ScheduleCreateView from '@/pages/schedule/ScheduleCreateView'
import SubjectManageView from '@/pages/store/SubjectManageView'
import HistoryView, { AdminView } from '@/pages/history/HistoryView'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [alarmOpen, setAlarmOpen] = useState(false)
  const [currentView, setCurrentView] = useState('home')
  const [userRole, setUserRole] = useState('admin') // "admin" | "worker"

  const navigate = (view) => {
    setCurrentView(view)
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return userRole === 'admin' ? (
          <HomeView navigate={navigate} />
        ) : (
          <WorkerHomeView navigate={navigate} />
        )
      case 'schedule-create':
        return <ScheduleCreateView navigate={navigate} />
      case 'subject-manage':
        return <SubjectManageView navigate={navigate} />
      case 'history':
        return <HistoryView navigate={navigate} />
      case 'admin':
        return <AdminView navigate={navigate} />
      default:
        return <HomeView navigate={navigate} />
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#f8f8f6',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          height: 56,
          background: '#fff',
          borderBottom: '0.5px solid #e8e6e0',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              color: '#444',
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: '#2c2c2a',
              letterSpacing: '-0.3px',
            }}
          >
            AlgoRhythm
          </span>
        </div>
        <HeaderUserMenu
          userRole={userRole}
          alarmOpen={alarmOpen}
          onAlarmToggle={() => setAlarmOpen((open) => !open)}
        />
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Sidebar
          open={sidebarOpen}
          navigate={navigate}
          currentView={currentView}
          userRole={userRole}
          setUserRole={setUserRole}
        />

        <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', minWidth: 0 }}>
          {renderView()}
        </main>

        <NotificationSidebar
          open={alarmOpen}
          onClose={() => setAlarmOpen(false)}
        />
      </div>

      <AIFloatingChat />
    </div>
  )
}
