import { useNotifications } from '@/hooks'

export const NOTIFICATION_PANEL_WIDTH = 280
const PANEL_VERTICAL_INSET = 16

const GROUP_ORDER = ['오늘', '이번주', '이전']

function groupNotifications(list) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - 7)

  const groups = { 오늘: [], 이번주: [], 이전: [] }
  for (const n of list) {
    const t = n.createdAt ? new Date(n.createdAt) : null
    if (t && t >= startOfToday) groups['오늘'].push(n)
    else if (t && t >= startOfWeek) groups['이번주'].push(n)
    else groups['이전'].push(n)
  }
  return groups
}

function NotificationItem({ message, storeName }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: '0 0 4px', fontSize: 14, color: '#2c2c2a', lineHeight: 1.5 }}>
        • {message}
      </p>
      {storeName && (
        <p style={{ margin: 0, fontSize: 13, color: '#888', paddingLeft: 12 }}>- {storeName}</p>
      )}
    </div>
  )
}

export default function NotificationSidebar({ open, onClose }) {
  const { data: notifications = [], isLoading, isError } = useNotifications({
    enabled: open,
  })
  const grouped = groupNotifications(notifications)
  const visibleGroups = GROUP_ORDER.filter((g) => grouped[g].length > 0)
  return (
    <aside
      style={{
        width: open ? NOTIFICATION_PANEL_WIDTH : 0,
        minWidth: open ? NOTIFICATION_PANEL_WIDTH : 0,
        height: '100%',
        flexShrink: 0,
        overflow: 'hidden',
        padding: open ? `${PANEL_VERTICAL_INSET}px 0` : 0,
        boxSizing: 'border-box',
        transition:
          'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        style={{
          width: NOTIFICATION_PANEL_WIDTH,
          height: '100%',
          background: '#fff',
          borderRadius: '12px 0 0 12px',
          boxShadow: '-2px 0 12px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 12px',
          borderBottom: '0.5px solid #e8e6e0',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#888',
            letterSpacing: '-0.3px',
          }}
        >
          알람
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="알람 닫기"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        {isLoading && (
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>불러오는 중...</p>
        )}
        {isError && (
          <p style={{ margin: 0, fontSize: 13, color: '#d85a30' }}>알림을 불러오지 못했습니다.</p>
        )}
        {!isLoading && !isError && visibleGroups.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, color: '#b4b2a9' }}>새로운 알림이 없습니다.</p>
        )}
        {visibleGroups.map((group, index) => (
          <div key={group}>
            {index > 0 && (
              <div
                style={{
                  height: 1,
                  background: '#e8e6e0',
                  margin: '4px 0 16px',
                }}
              />
            )}
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 14,
                fontWeight: 700,
                color: '#2c2c2a',
              }}
            >
              {group}
            </p>
            {grouped[group].map((item, i) => (
              <NotificationItem
                key={`${group}-${i}`}
                message={item.message}
                storeName={item.storeName}
              />
            ))}
          </div>
        ))}
      </div>
      </div>
    </aside>
  )
}
