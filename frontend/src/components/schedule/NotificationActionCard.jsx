import {
  useRespondShiftSwap,
  useApproveShiftSwap,
  useRespondExtraShift,
  useApproveExtraShift,
} from '@/hooks'
import {
  DOMAIN,
  localizeNotificationMessage,
  categoryLabel,
} from '@/constants/domainLabels.js'
import { getNotificationAction } from '@/utils/notificationActions.js'

const btnBase = {
  flex: 1,
  padding: '6px 0',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
}

/**
 * @param {Object} props
 * @param {import('@/types/notification.js').NotificationResponseDto} props.notification
 * @param {'OWNER'|'STAFF'} props.position
 * @param {boolean} [props.compact]
 */
export default function NotificationActionCard({ notification, position, compact = false }) {
  const action = getNotificationAction(notification, position)
  const respondSwap = useRespondShiftSwap()
  const approveSwap = useApproveShiftSwap()
  const respondExtra = useRespondExtraShift()
  const approveExtra = useApproveExtraShift()

  const pending =
    respondSwap.isPending ||
    approveSwap.isPending ||
    respondExtra.isPending ||
    approveExtra.isPending

  const err =
    respondSwap.error ||
    approveSwap.error ||
    respondExtra.error ||
    approveExtra.error

  if (!action) return null

  const onAccept = () => {
    if (action.kind === 'shift-swap-respond') {
      respondSwap.mutate({ requestId: action.requestId, payload: { action: 'ACCEPT' } })
    } else if (action.kind === 'extra-shift-respond') {
      respondExtra.mutate({ requestId: action.requestId, payload: { action: 'ACCEPT' } })
    }
  }

  const onReject = () => {
    if (action.kind === 'shift-swap-respond') {
      respondSwap.mutate({ requestId: action.requestId, payload: { action: 'REJECT' } })
    } else if (action.kind === 'extra-shift-respond') {
      respondExtra.mutate({ requestId: action.requestId, payload: { action: 'REJECT' } })
    }
  }

  const onApprove = () => {
    if (action.kind === 'shift-swap-approve') {
      approveSwap.mutate({ requestId: action.requestId, payload: { action: 'APPROVE' } })
    } else if (action.kind === 'extra-shift-approve') {
      approveExtra.mutate({
        requestId: action.requestId,
        payload: { responseId: action.responseId, action: 'approve' },
      })
    }
  }

  const onManagerReject = () => {
    if (action.kind === 'shift-swap-approve') {
      approveSwap.mutate({ requestId: action.requestId, payload: { action: 'REJECT' } })
    } else if (action.kind === 'extra-shift-approve') {
      approveExtra.mutate({
        requestId: action.requestId,
        payload: { responseId: action.responseId, action: 'reject' },
      })
    }
  }

  const isManager =
    action.kind === 'shift-swap-approve' || action.kind === 'extra-shift-approve'
  const tag = categoryLabel(notification.category)

  return (
    <div
      style={{
        marginTop: compact ? 8 : 10,
        background: '#faeeda',
        borderRadius: 8,
        padding: compact ? '10px 12px' : '12px 14px',
      }}
    >
      {tag && (
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#f09500' }}>
          {tag}
        </p>
      )}
      {!compact && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#633806', lineHeight: 1.5 }}>
          {localizeNotificationMessage(notification.message)}
        </p>
      )}
      {notification.storeName && (
        <p style={{ margin: '0 0 8px', fontSize: 11, color: '#888' }}>
          {DOMAIN.school}: {notification.storeName}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {isManager ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={onApprove}
              style={{ ...btnBase, border: 'none', background: '#27a859', color: '#fff' }}
            >
              승인
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onManagerReject}
              style={{
                ...btnBase,
                border: '0.5px solid #d3d1c7',
                background: '#fff',
                color: '#888',
              }}
            >
              거절
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={onAccept}
              style={{ ...btnBase, border: 'none', background: '#27a859', color: '#fff' }}
            >
              수락
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onReject}
              style={{
                ...btnBase,
                border: '0.5px solid #d3d1c7',
                background: '#fff',
                color: '#888',
              }}
            >
              거절
            </button>
          </>
        )}
      </div>
      {err && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#d85a30' }}>
          처리에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}
    </div>
  )
}
