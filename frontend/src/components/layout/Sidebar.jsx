export const SIDEBAR_WIDTH = 220

export default function Sidebar({ open, navigate, currentView, userRole, setUserRole }) {
  const adminMainItems = [
    { id: 'home', label: '홈', icon: HomeIcon },
    { id: 'schedule-create', label: '시간표', icon: CalendarIcon },
    { id: 'subject-manage', label: '과목·수업 관리', icon: BookIcon },
    { id: 'history', label: '내역', icon: HistoryIcon },
  ]

  const adminBottomItems = [{ id: 'admin', label: '관리자 도구', icon: AdminIcon }]

  const workerItems = [
    { id: 'home', label: '홈', icon: HomeIcon },
    { id: 'history', label: '내역', icon: HistoryIcon },
  ]

  const mainItems = userRole === 'admin' ? adminMainItems : workerItems
  const bottomItems = userRole === 'admin' ? adminBottomItems : []

  const renderNavItem = (item) => {
    const Icon = item.icon
    const active = currentView === item.id
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.id)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          marginBottom: 4,
          textAlign: 'left',
          background: active ? '#e8f7ee' : 'transparent',
          color: active ? '#27a859' : '#444441',
          fontWeight: active ? 600 : 400,
          fontSize: 15,
          transition: 'background 0.12s',
        }}
      >
        <Icon size={20} active={active} />
        {item.label}
      </button>
    )
  }

  return (
    <aside
      style={{
        width: open ? SIDEBAR_WIDTH + 24 : 0,
        minWidth: open ? SIDEBAR_WIDTH + 24 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition:
          'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
        padding: open ? '16px 0 16px 16px' : 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          background: '#fff',
          borderRadius: '0 12px 12px 0',
          boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <nav style={{ flex: 1, padding: '20px 12px', overflowY: 'auto' }}>
          {mainItems.map(renderNavItem)}

          {bottomItems.length > 0 && (
            <>
              <div
                style={{
                  height: 1,
                  background: '#e8e6e0',
                  margin: '12px 8px',
                }}
              />
              {bottomItems.map(renderNavItem)}
            </>
          )}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '0.5px solid #e8e6e0' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['admin', 'worker'].map((role) => (
              <button
                key={role}
                onClick={() => setUserRole(role)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  fontSize: 11,
                  fontWeight: 500,
                  border: '0.5px solid',
                  cursor: 'pointer',
                  borderRadius: 6,
                  transition: 'all 0.15s',
                  background: userRole === role ? '#27a859' : 'transparent',
                  borderColor: userRole === role ? '#27a859' : '#d3d1c7',
                  color: userRole === role ? '#fff' : '#5f5e5a',
                }}
              >
                {role === 'admin' ? '관리자' : '일반'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#b4b2a9', margin: 0, textAlign: 'center' }}>
            2026 Team AlgoRhythm
          </p>
        </div>
      </div>
    </aside>
  )
}

function HomeIcon({ size = 18, active }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke={active ? '#27a859' : '#888'}
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M3 12L12 3l9 9" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function CalendarIcon({ size = 18, active }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke={active ? '#27a859' : '#888'}
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function BookIcon({ size = 18, active }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke={active ? '#27a859' : '#888'}
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}

function HistoryIcon({ size = 18, active }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke={active ? '#27a859' : '#888'}
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 105.96-7.95" />
      <polyline points="3 4 3 10 9 10" />
    </svg>
  )
}

function AdminIcon({ size = 18, active }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke={active ? '#27a859' : '#888'}
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      <circle cx="18" cy="8" r="1.5" fill={active ? '#27a859' : '#888'} stroke="none" />
    </svg>
  )
}
