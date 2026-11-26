import { parseUserIdFromToken } from '@/utils/authToken.js'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_ID_KEY = 'userId'
const SCHOOL_SWITCH_KEY = 'activeSchoolChanged'
const PREVIEW_ROLE_KEY = 'previewUserRole'
const PENDING_SCHOOL_KEY = 'onboardingUserId'

export function hasPendingSchool() {
  return Boolean(getAccessToken() && hasPendingSchoolFor(getUserId()))
}

export function hasPendingSchoolFor(userId) {
  return userId != null && localStorage.getItem(PENDING_SCHOOL_KEY) === String(userId)
}

export function markPendingSchool(userId) {
  if (userId == null) localStorage.removeItem(PENDING_SCHOOL_KEY)
  else localStorage.setItem(PENDING_SCHOOL_KEY, String(userId))
}

export function localLoginEnabled() {
  return import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getUserId() {
  const subject = parseUserIdFromToken(getAccessToken())
  return subject == null ? localStorage.getItem(USER_ID_KEY) : String(subject)
}

let sessionVersion = 0
const listeners = new Set()
export const getSessionVersion = () => sessionVersion
function sessionChanged() {
  sessionVersion++
  for (const notify of listeners) notify()
}
function storageChanged(event) {
  if (event.storageArea === localStorage && [null, ACCESS_TOKEN_KEY, USER_ID_KEY, SCHOOL_SWITCH_KEY].includes(event.key)) sessionChanged()
}
export function getSchoolSwitchStamp() {
  return localStorage.getItem(SCHOOL_SWITCH_KEY)
}
// Other tabs share the backend's active school for this account.
export function notifySchoolSwitch() {
  localStorage.setItem(SCHOOL_SWITCH_KEY, String(Date.now()))
}
export function subscribeSession(notify) {
  if (!listeners.size) window.addEventListener('storage', storageChanged)
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
    if (!listeners.size) window.removeEventListener('storage', storageChanged)
  }
}

export function setTokens({ accessToken, refreshToken, userId } = {}) {
  if (accessToken != null) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken != null) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  else if (accessToken != null) localStorage.removeItem(REFRESH_TOKEN_KEY)
  if (userId != null) localStorage.setItem(USER_ID_KEY, String(userId))
  else if (accessToken != null) localStorage.removeItem(USER_ID_KEY)
  sessionChanged()
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
  markPendingSchool(null)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  sessionChanged()
}

/** 서버 계정 없이 화면만 보는 테스트 로그인. 값은 admin | worker */
export function getPreviewUserRole() {
  if (!localLoginEnabled()) return null
  const role = sessionStorage.getItem(PREVIEW_ROLE_KEY)
  return role === 'admin' || role === 'worker' ? role : null
}

export function setPreviewUserRole(role) {
  if (localLoginEnabled()) sessionStorage.setItem(PREVIEW_ROLE_KEY, role)
}

export function clearPreviewUserRole() {
  sessionStorage.removeItem(PREVIEW_ROLE_KEY)
}

export const tokenKeys = {
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
  userId: USER_ID_KEY,
}
