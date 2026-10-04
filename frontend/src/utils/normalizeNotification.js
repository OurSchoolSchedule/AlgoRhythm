function normalizeEnum(value) {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value.name) return value.name
  return String(value)
}

/** API 알림 객체 필드 정규화 (enum·isRead 호환) */
export function normalizeNotification(raw) {
  if (!raw) return raw
  const schoolName = raw.schoolName ?? raw.storeName ?? ''
  const timetableSwapRequestId = raw.timetableSwapRequestId ?? raw.shiftSwapRequestId ?? null
  const substituteRequestId = raw.substituteRequestId ?? raw.extraShiftRequestId ?? null
  const timetableSwapStatus = normalizeEnum(raw.timetableSwapStatus ?? raw.shiftSwapStatus)
  const timetableSwapManagerApprovalStatus = normalizeEnum(
    raw.timetableSwapManagerApprovalStatus ?? raw.shiftSwapManagerApprovalStatus,
  )
  const substituteStatus = normalizeEnum(raw.substituteStatus ?? raw.extraShiftStatus)

  return {
    ...raw,
    type: normalizeEnum(raw.type),
    category: normalizeEnum(raw.category),
    targetType: normalizeEnum(raw.targetType),
    schoolName,
    storeName: schoolName,
    timetableSwapRequestId,
    substituteRequestId,
    timetableSwapStatus,
    timetableSwapManagerApprovalStatus,
    substituteStatus,
    isRead: Boolean(raw.isRead ?? raw.read),
  }
}
