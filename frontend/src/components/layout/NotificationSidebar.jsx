import { useMemo } from 'react'
import { useNotifications, useActiveStore } from '@/hooks'
import NotificationActionButtons from '@/components/schedule/NotificationActionButtons.jsx'
import {
  localizeNotificationMessage,
  categoryLabel,
} from '@/constants/domainLabels.js'
import {
  getNotificationAction,
  filterActionableNotifications,
  resolvePosition,
} from '@/utils/notificationActions.js'

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

function NotificationItem({ notification, position }) {
  const tag = categoryLabel(notification.category)
  const hasAction = getNotificationAction(notification, position)

  return (
    <div style={{ marginBottom: 14 }}>
      {tag && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#faeeda',
            color: '#f09500',
            marginBottom: 6,
            display: 'inline-block',
          }}
        >
          {tag}
        </span>
      )}
      <p style={{ margin: '0 0 4px', fontSize: 14, color: '#2c2c2a', lineHeight: 1.5 }}>
        • {localizeNotificationMessage(notification.message)}
      </p>
      {notification.storeName && (
        <p style={{ margin: 0, fontSize: 13, color: '#888', paddingLeft: 12 }}>
          - {notification.storeName}
        </p>
      )}
      {hasAction && (
        <NotificationActionButtons notification={notification} position={position} />
      )}
    </div>
  )
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 */
export default function NotificationSidebar({ open, onClose }) {
  const { data: activeStore } = useActiveStore({ enabled: open })
  const position = resolvePosition(activeStore?.position)
  const { data: notifications = [], isLoading, isError } = useNotifications({
    enabled: open,
  })

  const actionable = useMemo(
    () => filterActionableNotifications(notifications, position),
    [notifications, position],
  )

  const actionableKeys = useMemo(
    () => new Set(actionable.map((n) => String(n.id ?? n.createdAt))),
    [actionable],
  )

  const grouped = useMemo(() => {
    const g = groupNotifications(notifications)
    for (const key of GROUP_ORDER) {
      g[key] = g[key].filter(
        (n) => !actionableKeys.has(String(n.id ?? n.createdAt)),
      )
    }
    return g
  }, [notifications, actionableKeys])

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

        <div
          className="hide-scrollbar"
          style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}
        >
          {isLoading && (
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>불러오는 중...</p>
          )}
          {isError && (
            <p style={{ margin: 0, fontSize: 13, color: '#d85a30' }}>
              알림을 불러오지 못했습니다.
            </p>
          )}

          {!isLoading && !isError && actionable.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#f09500',
                }}
              >
                처리 필요 ({actionable.length})
              </p>
              {actionable.map((item) => (
                <NotificationItem
                  key={`action-${item.id ?? item.createdAt}`}
                  notification={item}
                  position={position}
                />
              ))}
              <div
                style={{
                  height: 1,
                  background: '#e8e6e0',
                  margin: '4px 0 16px',
                }}
              />
            </section>
          )}

          {!isLoading && !isError && visibleGroups.length === 0 && actionable.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: '#b4b2a9' }}>
              새로운 알림이 없습니다.
            </p>
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
              {grouped[group].map((item) => (
                <NotificationItem
                  key={item.id ?? `${group}-${item.createdAt}-${item.message}`}
                  notification={item}
                  position={position}
                />
              ))}
            </div>
          ))}

          {!isLoading && !isError && notifications.length > 0 && actionable.length === 0 && (
            <p style={{ margin: '12px 0 0', fontSize: 11, color: '#b4b2a9', lineHeight: 1.5 }}>
              수락·거절 버튼은 보결/추가 근무 요청 알림이며, 로그인 계정 권한(교사·관리자)에
              따라 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
