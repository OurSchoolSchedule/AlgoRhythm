export const VOICE_INTENT_LABEL = {
  SUBSTITUTE_CREATE: '보결 요청',
  SUBSTITUTE_RESPOND: '보결 응답',
  SUBSTITUTE_APPROVE: '보결 승인',
  AVAILABILITY_ADD: '근무 불가 추가',
  AVAILABILITY_REPLACE: '근무 불가 교체',
  UNKNOWN: '알 수 없는 명령',
}

/** 미리보기 객체에서 문자열·숫자만 보여 준다. 없는 필드는 만들지 않는다. */
export function previewLines(preview) {
  if (!preview || typeof preview !== 'object' || Array.isArray(preview)) return []
  return Object.entries(preview)
    .filter(([, value]) => (
      value != null
      && value !== ''
      && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    ))
    .map(([key, value]) => ({ key, value: String(value) }))
}

export function canConfirmVoicePreview(preview) {
  return Boolean(preview?.draftToken) && preview.intentType && preview.intentType !== 'UNKNOWN'
}
