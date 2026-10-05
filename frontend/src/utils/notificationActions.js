/**
 * 알림 액션 권한은 active-school의 position(ADMIN/TEACHER)만 사용.
 * @param {import('@/types/notification.js').NotificationResponseDto} n
 * @param {'ADMIN'|'TEACHER'|undefined} position
 */
export function resolvePosition(position) {
  if (position === 'ADMIN' || position === 'TEACHER') return position
  return undefined
}

export function getNotificationAction(n, position) {
  const role = resolvePosition(position)
  if (!n?.type || !role) return null
  const type = String(n.type)

  if (
    type === 'TIMETABLE_SWAP_REQUEST' &&
    role === 'TEACHER' &&
    n.timetableSwapRequestId &&
    (!n.timetableSwapStatus || n.timetableSwapStatus === 'PENDING')
  ) {
    return { kind: 'shift-swap-respond', requestId: n.timetableSwapRequestId }
  }

  if (
    type === 'TIMETABLE_SWAP_NOTIFY_ADMIN' &&
    role === 'ADMIN' &&
    n.timetableSwapRequestId &&
    (!n.timetableSwapManagerApprovalStatus ||
      n.timetableSwapManagerApprovalStatus === 'PENDING')
  ) {
    return { kind: 'shift-swap-approve', requestId: n.timetableSwapRequestId }
  }

  if (
    type === 'SUBSTITUTE_REQUEST_INVITE' &&
    role === 'TEACHER' &&
    n.substituteRequestId &&
    (!n.substituteStatus || n.substituteStatus === 'OPEN')
  ) {
    return { kind: 'extra-shift-respond', requestId: n.substituteRequestId }
  }

  if (
    type === 'SUBSTITUTE_NOTIFY_ADMIN' &&
    role === 'ADMIN' &&
    n.substituteResponseId
  ) {
    return {
      kind: 'extra-shift-approve',
      requestId: n.substituteRequestId,
      responseId: n.substituteResponseId,
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
    ['TIMETABLE_SWAP', 'SUBSTITUTE', 'SCHEDULE_INPUT'].includes(n.category),
  )
}

/** 교사 브리핑: 교환·보결 알림 제외 */
export function filterTeacherBriefingNotifications(notifications) {
  return filterBriefingNotifications(notifications).filter(
    (n) => n.category !== 'TIMETABLE_SWAP' && n.category !== 'SUBSTITUTE',
  )
}
