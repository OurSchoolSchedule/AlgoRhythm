import { isApiForbidden, isSpringSecurityForbidden } from './authToken.js'

export function getTimetableErrorMessage(error) {
  const status = error?.response?.status
  if (isSpringSecurityForbidden(error?.response)) {
    return '로그인이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.'
  }
  if (isApiForbidden(error?.response)) {
    const msg = error?.response?.data?.message
    return msg || '시간표 조회 권한이 없습니다. 활성 학교를 확인해 주세요.'
  }
  if (status === 401) {
    return '로그인이 필요합니다. 다시 로그인해 주세요.'
  }
  return '시간표를 불러오지 못했습니다.'
}
