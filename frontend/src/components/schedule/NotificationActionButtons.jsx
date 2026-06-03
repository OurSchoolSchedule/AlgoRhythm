import {
  useRespondShiftSwap,
  useApproveShiftSwap,
  useRespondExtraShift,
  useApproveExtraShift,
} from '@/hooks'
import { getNotificationAction } from '@/utils/notificationActions.js'

const btnBase = {
  flex: 1,
  padding: '7px 0',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
}

/**
 * @param {Object} props
 * @param {import('@/types/notification.js').NotificationResponseDto} props.notification
 * @param {'OWNER'|'STAFF'|undefined} props.position active-store 기준
 */
export default function NotificationActionButtons({ notification, position }) {
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

  const isManager =
    action.kind === 'shift-swap-approve' || action.kind === 'extra-shift-approve'

  const onPrimary = () => {
    if (action.kind === 'shift-swap-respond') {
      respondSwap.mutate({ requestId: action.requestId, payload: { action: 'ACCEPT' } })
    } else if (action.kind === 'extra-shift-respond') {
      respondExtra.mutate({ requestId: action.requestId, payload: { action: 'ACCEPT' } })
    } else if (action.kind === 'shift-swap-approve') {
      approveSwap.mutate({ requestId: action.requestId, payload: { action: 'APPROVE' } })
    } else if (action.kind === 'extra-shift-approve') {
      approveExtra.mutate({
        requestId: action.requestId,
        payload: { responseId: action.responseId, action: 'approve' },
      })
    }
  }

  const onSecondary = () => {
    if (action.kind === 'shift-swap-respond') {
      respondSwap.mutate({ requestId: action.requestId, payload: { action: 'REJECT' } })
    } else if (action.kind === 'extra-shift-respond') {
      respondExtra.mutate({ requestId: action.requestId, payload: { action: 'REJECT' } })
    } else if (action.kind === 'shift-swap-approve') {
      approveSwap.mutate({ requestId: action.requestId, payload: { action: 'REJECT' } })
    } else if (action.kind === 'extra-shift-approve') {
      approveExtra.mutate({
        requestId: action.requestId,
        payload: { responseId: action.responseId, action: 'reject' },
      })
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={pending}
          onClick={onPrimary}
          style={{ ...btnBase, border: 'none', background: '#27a859', color: '#fff' }}
        >
          {isManager ? '승인' : '수락'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onSecondary}
          style={{
            ...btnBase,
            border: '0.5px solid #d3d1c7',
            background: '#fff',
            color: '#5f5e5a',
          }}
        >
          거절
        </button>
      </div>
      {err && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#d85a30' }}>
          처리에 실패했습니다.
        </p>
      )}
    </div>
  )
}
