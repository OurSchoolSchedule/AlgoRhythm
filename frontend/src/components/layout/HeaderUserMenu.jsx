import { useEffect, useId, useRef, useState } from 'react'
import { useNotifications } from '@/hooks'
import { getStoredTheme, setThemePreference } from '@/theme'

const THEME_OPTIONS = [
  { id: 'system', label: '시스템' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
]

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

const PROFILE = {
  admin: {
    label: '관리자',
    name: '관리자',
    initial: '관',
    subjects: '전체 과목 관리',
    homeroom: '없음',
  },
  worker: {
    label: '김민지 선생님',
    name: '김민지 선생님',
    initial: '김',
    subjects: '국어',
    homeroom: '2-3',
  },
}

function showDevRoleSwitch() {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('dev') === '1'
}

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

export default function HeaderUserMenu({ userRole, setUserRole, alarmOpen, onAlarmToggle, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [themePreference, setThemeChoice] = useState(() => getStoredTheme())
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const menuId = useId()
  const profile = PROFILE[userRole] ?? PROFILE.worker
  const devRoleSwitch = showDevRoleSwitch()
  const { data: notifications = [] } = useNotifications()
  const hasUnread = notifications.some((item) => item?.isRead === false)

  useEffect(() => {
    if (!profileOpen) return undefined

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [profileOpen])

  const onPanelKeyDown = (event) => {
    if (!panelRef.current) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveMenuFocus(panelRef.current, 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveMenuFocus(panelRef.current, -1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveMenuFocus(panelRef.current, 'first')
    } else if (event.key === 'End') {
      event.preventDefault()
      moveMenuFocus(panelRef.current, 'last')
    }
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <button
        type="button"
        className="icon-button"
        aria-label="알림"
        aria-pressed={alarmOpen}
        onClick={onAlarmToggle}
        style={{
          position: 'relative',
          background: alarmOpen ? 'var(--color-primary-50)' : 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          color: alarmOpen ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        }}
      >
        <BellIcon />
        {hasUnread && <span className="alarm-dot" />}
      </button>

      <button
        ref={triggerRef}
        type="button"
        className="icon-button"
        onClick={() => setProfileOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setProfileOpen(true)
            requestAnimationFrame(() => {
              panelRef.current?.querySelector('[role="menuitem"]')?.focus()
            })
          }
        }}
        aria-label={profile.label}
        aria-expanded={profileOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 0,
        }}
      >
        <span className="profile-avatar" aria-hidden="true">{profile.initial}</span>
        <span className="profile-label">{profile.label}</span>
      </button>

      {profileOpen && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label="사용자 정보"
          onKeyDown={onPanelKeyDown}
          className="profile-menu"
        >
          <div style={{ padding: '12px 12px 8px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {profile.name}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
              담당 과목 | {profile.subjects}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
              담당 학급 | {profile.homeroom}
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />

          <p style={{ margin: '4px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>화면 테마</p>
          {THEME_OPTIONS.map((option) => {
            const selected = themePreference === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setThemeChoice(option.id)
                  setThemePreference(option.id)
                }}
                style={{
                  fontWeight: selected ? 600 : 400,
                  color: selected ? 'var(--color-primary)' : 'var(--color-text)',
                }}
              >
                {option.label}
              </button>
            )
          })}

          <button type="button" role="menuitem" className="menu-item">
            시간대 선호도 제출
          </button>

          {devRoleSwitch && setUserRole && (
            <>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setUserRole('admin')
                  setProfileOpen(false)
                }}
                style={{ fontWeight: userRole === 'admin' ? 600 : 400, color: userRole === 'admin' ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                관리자 화면
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setUserRole('worker')
                  setProfileOpen(false)
                }}
                style={{ fontWeight: userRole === 'worker' ? 600 : 400, color: userRole === 'worker' ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                교사 화면
              </button>
            </>
          )}

          {onLogout && (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setProfileOpen(false)
                onLogout()
              }}
              style={{ color: 'var(--color-danger)' }}
            >
              로그아웃
            </button>
          )}
        </div>
      )}
    </div>
  )
}
