/** dev-token / JWT 문자열 정규화 */
export function normalizeAccessToken(raw) {
  if (raw == null) return null
  if (typeof raw === 'object' && raw.accessToken) return normalizeAccessToken(raw.accessToken)
  if (typeof raw !== 'string') return null
  return raw.trim().replace(/^"|"$/g, '')
}

/** JWT payload에서 userId(subject) 추출 */
export function parseUserIdFromToken(token) {
  const normalized = normalizeAccessToken(token)
  if (!normalized) return null
  try {
    const payload = normalized.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { sub } = JSON.parse(json)
    const id = Number(sub)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

/** Spring Security 기본 403 (미인증·무효 토큰) */
export function isSpringSecurityForbidden(response) {
  const data = response?.data
  return (
    response?.status === 403 &&
    data &&
    typeof data === 'object' &&
    data.error === 'Forbidden' &&
    typeof data.path === 'string'
  )
}

/** API 비즈니스 Forbidden (active store 없음 등) — 로그아웃 대상 아님 */
export function isApiForbidden(response) {
  const data = response?.data
  return response?.status === 403 && data?.success === false && data?.error === 'FORBIDDEN'
}

export function shouldForceReLogin(response) {
  if (!response) return false
  if (isApiForbidden(response)) return false
  if (response.status === 401) return true
  if (isSpringSecurityForbidden(response)) return true
  return false
}
