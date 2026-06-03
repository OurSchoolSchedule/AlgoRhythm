function normalizeEnum(value) {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value.name) return value.name
  return String(value)
}

/** API 알림 객체 필드 정규화 (enum·isRead 호환) */
export function normalizeNotification(raw) {
  if (!raw) return raw
  return {
    ...raw,
    type: normalizeEnum(raw.type),
    category: normalizeEnum(raw.category),
    targetType: normalizeEnum(raw.targetType),
    shiftSwapStatus: normalizeEnum(raw.shiftSwapStatus),
    shiftSwapManagerApprovalStatus: normalizeEnum(raw.shiftSwapManagerApprovalStatus),
    extraShiftStatus: normalizeEnum(raw.extraShiftStatus),
    isRead: Boolean(raw.isRead ?? raw.read),
  }
}
