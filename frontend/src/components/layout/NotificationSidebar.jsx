import { useMemo } from 'react'
import { useNotifications, useActiveStore } from '@/hooks'
import NotificationActionButtons from '@/components/schedule/NotificationActionButtons.jsx'
import SubstituteRequestList from '@/components/schedule/SubstituteRequestList.jsx'
import {
  localizeNotificationMessage,
  categoryLabel,
} from '@/constants/domainLabels.js'
import {
  getNotificationAction,
  filterActionableNotifications,
  resolvePosition,
} from '@/utils/notificationActions.js'

export const NOTIFICATION_PANEL_WIDTH = 360

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
            fontSize: 'var(--font-micro)',
            lineHeight: '16px',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-warning-light)',
            color: 'var(--color-warning)',
            marginBottom: 6,
            display: 'inline-block',
          }}
        >
          {tag}
        </span>
      )}
      <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5 }}>
        {localizeNotificationMessage(notification.message)}
      </p>
      {notification.storeName && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {notification.storeName}
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
export default function NotificationSidebar({ open, onClose, userRole }) {
  const { data: activeStore } = useActiveStore({ enabled: open })
  const previewPosition = userRole === 'admin' ? 'ADMIN' : userRole === 'worker' ? 'TEACHER' : undefined
  const position = resolvePosition(activeStore?.position) ?? previewPosition
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
    <aside className="notification-panel" data-open={open ? 'true' : 'false'}>
      <div className="notification-panel-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 12px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text)',
            }}
          >
            알림
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="panel-close"
            aria-label="알림 닫기"
          >
            <svg
              width="16"
              height="16"
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
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>
          )}
          {isError && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>
              알림을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.
            </p>
          )}

          <SubstituteRequestList position={position} notifications={notifications} />

          {!isLoading && !isError && actionable.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--color-warning)',
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
                  background: 'var(--color-border)',
                  margin: '4px 0 16px',
                }}
              />
            </section>
          )}

          {!isLoading && !isError && visibleGroups.length === 0 && actionable.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
              새 알림이 없습니다. 요청이 오면 여기에 표시됩니다.
            </p>
          )}

          {visibleGroups.map((group, index) => (
            <div key={group}>
              {index > 0 && (
                <div
                  style={{
                    height: 1,
                    background: 'var(--color-border)',
                    margin: '4px 0 16px',
                  }}
                />
              )}
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--color-text)',
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
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              수락, 거절 버튼은 보결과 추가 근무 요청에 표시됩니다. 교사와 관리자 권한에 따라 달라집니다.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
