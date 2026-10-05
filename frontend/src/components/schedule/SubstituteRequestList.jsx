import { useSubstituteRequests, useRespondExtraShift, useApproveExtraShift } from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const DAY_LABEL = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' }

function responseIdFor(request, notifications) {
  const match = (notifications ?? []).find(
    (item) => item.substituteRequestId === request.id && item.substituteResponseId,
  )
  return match?.substituteResponseId ?? null
}

/**
 * OPEN 보결 중 알림에 없는 건을 보여 준다.
 * 관리자 승인은 알림의 substituteResponseId가 있을 때만 한다.
 */
export default function SubstituteRequestList({ position, notifications = [] }) {
  const query = useSubstituteRequests('OPEN')
  const respond = useRespondExtraShift()
  const approve = useApproveExtraShift()
  const covered = new Set(
    (notifications ?? [])
      .filter((item) => item.substituteRequestId && getCovered(item, position))
      .map((item) => item.substituteRequestId),
  )
  const rows = (query.data ?? []).filter((item) => !covered.has(item.id))
  const pending = respond.isPending || approve.isPending

  if (query.isLoading) {
    return <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>보결 요청을 불러오는 중...</p>
  }
  if (query.isError) {
    return (
      <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--color-danger)' }}>
        {getApiErrorMessage(query.error, '보결 목록을 불러오지 못했습니다.')}{' '}
        <button type="button" className="history-link" onClick={() => query.refetch()}>다시 시도</button>
      </p>
    )
  }
  if (rows.length === 0) return null

  return (
    <div>
      {rows.map((item) => {
        const responseId = position === 'ADMIN' ? responseIdFor(item, notifications) : null
        const label = [
          item.substituteDate,
          DAY_LABEL[item.dayOfWeek],
          item.periodNumber != null ? `${item.periodNumber}교시` : '',
          item.note,
        ].filter(Boolean).join(' · ')
        return (
          <div key={item.id} className="home-row">
            <p className="home-item-title">보결 · {label}</p>
            <p className="home-item-meta">{item.status}</p>
            {position === 'TEACHER' && (
              <ActionPair
                pending={pending}
                primary="수락"
                onPrimary={() => respond.mutate({ requestId: item.id, payload: { action: 'ACCEPT' } })}
                onSecondary={() => respond.mutate({ requestId: item.id, payload: { action: 'REJECT' } })}
              />
            )}
            {position === 'ADMIN' && responseId != null && (
              <ActionPair
                pending={pending}
                primary="승인"
                onPrimary={() => approve.mutate({ responseId, payload: { action: 'APPROVE' } })}
                onSecondary={() => approve.mutate({ responseId, payload: { action: 'REJECT' } })}
              />
            )}
            {position === 'ADMIN' && responseId == null && (
              <p className="home-item-meta">승인에 필요한 응답 번호가 알림에 없습니다.</p>
            )}
          </div>
        )
      })}
      {(respond.isError || approve.isError) && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>
          {getApiErrorMessage(respond.error || approve.error, '처리에 실패했습니다.')}
        </p>
      )}
    </div>
  )
}

function getCovered(notification, position) {
  if (position === 'TEACHER' && notification.type === 'SUBSTITUTE_REQUEST_INVITE') return true
  if (position === 'ADMIN' && notification.type === 'SUBSTITUTE_NOTIFY_ADMIN' && notification.substituteResponseId) {
    return true
  }
  return false
}

function ActionPair({ pending, primary, onPrimary, onSecondary }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button type="button" className="action-button" disabled={pending} onClick={onPrimary} style={primaryStyle}>{primary}</button>
      <button type="button" className="action-button" disabled={pending} onClick={onSecondary} style={secondaryStyle}>거절</button>
    </div>
  )
}

const primaryStyle = {
  flex: 1,
  padding: '7px 0',
  borderRadius: 6,
  border: 'none',
  background: 'var(--color-primary-button)',
  color: 'var(--color-on-primary)',
  fontSize: 12,
  cursor: 'pointer',
}

const secondaryStyle = {
  flex: 1,
  padding: '7px 0',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-subtle)',
  fontSize: 12,
  cursor: 'pointer',
}
