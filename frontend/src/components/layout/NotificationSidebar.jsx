export const NOTIFICATION_PANEL_WIDTH = 280

const NOTIFICATIONS = [
  {
    group: '오늘',
    items: [
      { title: '4월 9일 8교시 보결 요청', teacher: '조상은 선생님' },
      { title: '4월 9일 8교시 보결 요청', teacher: '조상은 선생님' },
      { title: '4월 9일 8교시 보결 요청', teacher: '김민지 선생님' },
    ],
  },
  {
    group: '이번주',
    items: [
      { title: '4월 12일 3교시 장소 변경 알림', teacher: '1-3반' },
      { title: '4월 11일 시간표 확정 안내', teacher: '관리자' },
      { title: '4월 10일 5교시 보결 요청', teacher: '이철수 선생님' },
      { title: '4월 10일 2교시 시프트 교환', teacher: '박지은 선생님' },
    ],
  },
  {
    group: '이전',
    items: [{ title: '3월 28일 시간표 생성 완료', teacher: '관리자' }],
  },
]

function NotificationItem({ title, teacher }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: '0 0 4px', fontSize: 14, color: '#2c2c2a', lineHeight: 1.5 }}>
        • {title}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: '#888', paddingLeft: 12 }}>- {teacher}</p>
    </div>
  )
}

export default function NotificationSidebar({ open, onClose }) {
  return (
    <aside
      style={{
        width: open ? NOTIFICATION_PANEL_WIDTH + 24 : 0,
        minWidth: open ? NOTIFICATION_PANEL_WIDTH + 24 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition:
          'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
        padding: open ? '16px 16px 16px 0' : 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: NOTIFICATION_PANEL_WIDTH,
          height: '100%',
          background: '#fff',
          borderRadius: '12px 0 0 12px',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.06)',
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          {NOTIFICATIONS.map((section, index) => (
            <div key={section.group}>
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
                {section.group}
              </p>
              {section.items.map((item, i) => (
                <NotificationItem key={`${section.group}-${i}`} {...item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
