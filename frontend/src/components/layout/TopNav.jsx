import { useEffect, useId, useRef, useState } from 'react'
import HeaderUserMenu from '@/components/layout/HeaderUserMenu.jsx'

const MAIN_ITEMS = [
  { id: 'home', label: '홈' },
  { id: 'timetable', label: '시간표' },
  { id: 'history', label: '내역' },
]

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
        {placement === 'bottom' ? '관리' : '관리 ▾'}
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
  setUserRole,
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
            setUserRole={setUserRole}
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
            {item.label}
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
