import { useEffect, useId, useRef, useState } from 'react'
import HeaderUserMenu from '@/components/layout/HeaderUserMenu.jsx'

const MAIN_ITEMS = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'timetable', label: '시간표', icon: 'timetable' },
  { id: 'todos', label: '할 일', icon: 'todos' },
  { id: 'history', label: '내역', icon: 'history' },
]

function TabIcon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    )
  }
  if (name === 'timetable') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="1.5" />
        <path d="M4 9h16M8 3.5V6.5M16 3.5V6.5" />
      </svg>
    )
  }
  if (name === 'todos') {
    return (
      <svg {...common}>
        <path d="M9 7h10M9 12h10M9 17h10" />
        <path d="M4.5 7.2 5.6 8.3 7.4 6.2M4.5 12.2 5.6 13.3 7.4 11.2M4.5 17.2 5.6 18.3 7.4 16.2" />
      </svg>
    )
  }
  if (name === 'history') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5l3 2" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </svg>
  )
}

const ADMIN_ITEMS = [
  { id: 'subject-manage', label: '과목·수업 관리' },
  { id: 'admin', label: '관리자 도구' },
]

function moveMenuFocus(menu, direction) {
  const items = [...menu.querySelectorAll('[role="menuitem"]')]
  if (items.length === 0) return
  const current = items.indexOf(document.activeElement)
  const next = direction === 'first'
    ? 0
    : direction === 'last'
      ? items.length - 1
      : (current + direction + items.length) % items.length
  items[next]?.focus()
}

function AdminMenu({ open, onToggle, onClose, onSelect, currentView, placement }) {
  const menuId = useId()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const active = currentView === 'subject-manage' || currentView === 'admin'

  useEffect(() => {
    if (!open) return undefined

    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) onClose()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus()
  }, [open])

  const onMenuKeyDown = (event) => {
    if (!menuRef.current) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveMenuFocus(menuRef.current, 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveMenuFocus(menuRef.current, -1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveMenuFocus(menuRef.current, 'first')
    } else if (event.key === 'End') {
      event.preventDefault()
      moveMenuFocus(menuRef.current, 'last')
    }
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        flex: placement === 'bottom' ? 1 : undefined,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={placement === 'top' ? 'nav-link' : 'bottom-tab'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-current={active ? 'page' : undefined}
        onClick={onToggle}
        onKeyDown={(event) => {
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
            event.preventDefault()
            onToggle()
          }
        }}
      >
        {placement === 'bottom' ? (
          <>
            <TabIcon name="admin" />
            <span>관리</span>
          </>
        ) : '관리 ▾'}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="관리"
          className={placement === 'bottom' ? 'dropdown-panel dropdown-panel-bottom' : 'dropdown-panel dropdown-panel-top'}
          onKeyDown={onMenuKeyDown}
        >
          {ADMIN_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopNav({
  navigate,
  currentView,
  userRole,
  alarmOpen,
  onAlarmToggle,
  onLogout,
}) {
  const isAdmin = userRole === 'admin'
  const [adminMenu, setAdminMenu] = useState(null)

  const go = (view) => {
    setAdminMenu(null)
    navigate(view)
  }

  return (
    <>
      <header className="top-nav">
        <button type="button" className="logo-button" onClick={() => go('home')}>
          <span className="logo-full">우리학교 시간표</span>
          <span className="logo-short">시간표</span>
        </button>

        <nav className="top-nav-links" aria-label="주요 메뉴">
          {MAIN_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-link"
              aria-current={currentView === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <AdminMenu
              placement="top"
              open={adminMenu === 'top'}
              onToggle={() => setAdminMenu((value) => (value === 'top' ? null : 'top'))}
              onClose={() => setAdminMenu(null)}
              onSelect={go}
              currentView={currentView}
            />
          )}
        </nav>

        <div style={{ marginLeft: 'auto' }}>
          <HeaderUserMenu
            userRole={userRole}
            alarmOpen={alarmOpen}
            onAlarmToggle={onAlarmToggle}
            onLogout={onLogout}
          />
        </div>
      </header>

      <nav className="bottom-tabs" aria-label="주요 메뉴">
        {MAIN_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="bottom-tab"
            aria-current={currentView === item.id ? 'page' : undefined}
            onClick={() => go(item.id)}
          >
            <TabIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        {isAdmin && (
          <AdminMenu
            placement="bottom"
            open={adminMenu === 'bottom'}
            onToggle={() => setAdminMenu((value) => (value === 'bottom' ? null : 'bottom'))}
            onClose={() => setAdminMenu(null)}
            onSelect={go}
            currentView={currentView}
          />
        )}
      </nav>
    </>
  )
}
