import { useEffect, useRef, useState } from 'react'

function UserIcon({ size = 20, dark = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: dark ? '#2c2c2a' : '#e8e6e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill={dark ? '#fff' : '#888'}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    </div>
  )
}

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
    name: '관리자님',
    subjects: '전체 과목 관리',
    homeroom: '-',
  },
  worker: {
    label: '사용자',
    name: '사용자 선생님',
    subjects: '수학, 미적분 I, 미적분 II',
    homeroom: '3-2',
  },
}

export default function HeaderUserMenu({ userRole, alarmOpen, onAlarmToggle }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef(null)
  const profile = PROFILE[userRole] ?? PROFILE.worker

  useEffect(() => {
    if (!profileOpen) return

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

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
        aria-label="알림"
        aria-pressed={alarmOpen}
        onClick={onAlarmToggle}
        style={{
          background: alarmOpen ? '#e8f7ee' : 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          color: alarmOpen ? '#27a859' : '#444',
        }}
      >
        <BellIcon />
      </button>

      <button
        type="button"
        onClick={() => setProfileOpen((open) => !open)}
        aria-expanded={profileOpen}
        aria-haspopup="true"
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
        <UserIcon size={28} />
        <span style={{ fontSize: 14, color: '#2c2c2a', fontWeight: 500 }}>
          {profile.label}
        </span>
      </button>

      {profileOpen && (
        <div
          role="dialog"
          aria-label="사용자 정보"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: 280,
            background: '#fff',
            border: '0.5px solid #e8e6e0',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '28px 24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <UserIcon size={56} dark />
            <p
              style={{
                margin: '14px 0 16px',
                fontSize: 15,
                fontWeight: 600,
                color: '#2c2c2a',
              }}
            >
              {profile.name}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: '#5f5e5a', lineHeight: 1.5 }}>
              담당 과목 | {profile.subjects}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#5f5e5a', lineHeight: 1.5 }}>
              담당 학급 | {profile.homeroom}
            </p>
          </div>

          <div style={{ borderTop: '0.5px solid #e8e6e0', padding: '16px 24px 20px' }}>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 8,
                border: '0.5px solid #d3d1c7',
                background: '#fff',
                color: '#2c2c2a',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              시간대 선호도 제출
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
