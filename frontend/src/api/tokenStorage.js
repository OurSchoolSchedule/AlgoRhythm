const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_ID_KEY = 'userId'
const PREVIEW_ROLE_KEY = 'previewUserRole'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getUserId() {
  return localStorage.getItem(USER_ID_KEY)
}

export function setTokens({ accessToken, refreshToken, userId } = {}) {
  if (accessToken != null) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken != null) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (userId != null) localStorage.setItem(USER_ID_KEY, String(userId))
}

export function setAccessToken(accessToken) {
  if (accessToken == null) return
  const token =
    typeof accessToken === 'string'
      ? accessToken.trim().replace(/^"|"$/g, '')
      : String(accessToken)
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
}

/** 서버 계정 없이 화면만 보는 테스트 로그인. 값은 admin | worker */
export function getPreviewUserRole() {
  const role = sessionStorage.getItem(PREVIEW_ROLE_KEY)
  return role === 'admin' || role === 'worker' ? role : null
}

export function setPreviewUserRole(role) {
  sessionStorage.setItem(PREVIEW_ROLE_KEY, role)
}

export function clearPreviewUserRole() {
  sessionStorage.removeItem(PREVIEW_ROLE_KEY)
}

export const tokenKeys = {
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
  userId: USER_ID_KEY,
}
