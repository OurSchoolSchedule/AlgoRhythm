import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import AIFloatingChat from '@/components/common/AIFloatingChat'
import HomeView from '@/pages/home/HomeView'
import WorkerHomeView from '@/pages/home/WorkerHomeView'
import ScheduleCreateView from '@/pages/schedule/ScheduleCreateView'
import SubjectManageView from '@/pages/store/SubjectManageView'
import HistoryView, { AdminView } from '@/pages/history/HistoryView'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState('home')
  const [userRole, setUserRole] = useState('admin') // "admin" | "worker"

  const navigate = (view) => {
    setCurrentView(view)
    setSidebarOpen(false)
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
        height: '100vh',
        background: '#f8f8f6',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
        overflow: 'hidden',
      }}
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigate={navigate}
        currentView={currentView}
        userRole={userRole}
        setUserRole={setUserRole}
      />

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.18)',
            zIndex: 40,
          }}
        />
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#e8e4f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: '#534ab7',
              }}
            >
              {userRole === 'admin' ? '관' : '교'}
            </div>
            <span style={{ fontSize: 13, color: '#5f5e5a' }}>
              {userRole === 'admin' ? '관리자' : '김교사'} 님
            </span>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
          {renderView()}
        </main>
      </div>

      <AIFloatingChat />
    </div>
  )
}
