/**
 * 알림 액션 권한은 active-store의 position(OWNER/STAFF)만 사용.
 * 사이드바 userRole 토글과 분리한다.
 * @param {import('@/types/notification.js').NotificationResponseDto} n
 * @param {'OWNER'|'STAFF'|undefined} position
 */
export function resolvePosition(position) {
  if (position === 'OWNER' || position === 'STAFF') return position
  return undefined
}

export function getNotificationAction(n, position) {
  const role = resolvePosition(position)
  if (!n?.type || !role) return null
  const type = String(n.type)

  // 교사: 1차 수락/거절만
  if (
    type === 'SHIFT_SWAP_REQUEST' &&
    role === 'STAFF' &&
    n.shiftSwapRequestId &&
    (!n.shiftSwapStatus || n.shiftSwapStatus === 'PENDING')
  ) {
    return { kind: 'shift-swap-respond', requestId: n.shiftSwapRequestId }
  }

  if (
    type === 'EXTRA_SHIFT_REQUEST_INVITE' &&
    role === 'STAFF' &&
    n.extraShiftRequestId &&
    (!n.extraShiftStatus || n.extraShiftStatus === 'OPEN')
  ) {
    return { kind: 'extra-shift-respond', requestId: n.extraShiftRequestId }
  }

  // 관리자: 최종 승인/거절만
  if (
    type === 'SHIFT_SWAP_NOTIFY_MANAGER' &&
    role === 'OWNER' &&
    n.shiftSwapRequestId &&
    (!n.shiftSwapManagerApprovalStatus ||
      n.shiftSwapManagerApprovalStatus === 'PENDING')
  ) {
    return { kind: 'shift-swap-approve', requestId: n.shiftSwapRequestId }
  }

  if (
    type === 'EXTRA_SHIFT_NOTIFY_MANAGER' &&
    role === 'OWNER' &&
    n.extraShiftRequestId &&
    n.targetId
  ) {
    return {
      kind: 'extra-shift-approve',
      requestId: n.extraShiftRequestId,
      responseId: n.targetId,
    }
  }

  return null
}

export function filterActionableNotifications(notifications, position) {
  return (notifications ?? []).filter((n) => getNotificationAction(n, position))
}

/** 브리핑 후보 알림 */
export function filterBriefingNotifications(notifications) {
  return (notifications ?? []).filter((n) =>
    ['SHIFT_SWAP', 'EXTRA_SHIFT', 'SCHEDULE_INPUT'].includes(n.category),
  )
}

/** 교사 브리핑: 보결·추가 근무 알림 제외 */
export function filterTeacherBriefingNotifications(notifications) {
  return filterBriefingNotifications(notifications).filter(
    (n) => n.category !== 'SHIFT_SWAP' && n.category !== 'EXTRA_SHIFT',
  )
}
