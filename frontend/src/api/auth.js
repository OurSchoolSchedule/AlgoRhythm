// 인증(Auth) API
import client, { API_BASE_URL } from './client.js'
import {
  setTokens,
  clearTokens,
  getRefreshToken,
} from './tokenStorage.js'

/**
 * 카카오 로그인 시작 페이지로 이동한다.
 * 실제 인가 URL은 환경에 따라 다를 수 있어 VITE_KAKAO_LOGIN_URL 로 주입 가능하며,
 * 미지정 시 Spring Security 기본 경로를 사용한다. (백엔드 설정에 맞게 확인 필요)
 */
export function redirectToKakaoLogin() {
  const url =
    import.meta.env.VITE_KAKAO_LOGIN_URL ??
    `${API_BASE_URL}/oauth2/authorization/kakao`
  window.location.href = url
}

/**
 * 카카오 콜백 후 프론트로 리다이렉트된 URL의 쿼리스트링에서 토큰을 추출해 저장한다.
 * @param {string} [search] location.search (예: "?accessToken=...&refreshToken=...&userId=1")
 * @returns {import('@/types/auth.js').AuthTokens | null}
 */
export function saveAuthTokensFromCallback(search = window.location.search) {
  const params = new URLSearchParams(search)
  const accessToken = params.get('accessToken')
  const refreshToken = params.get('refreshToken')
  const userId = params.get('userId')
  if (!accessToken || !refreshToken) return null
  const tokens = { accessToken, refreshToken, userId }
  setTokens(tokens)
  return tokens
}

/**
 * 카카오 콜백 처리 (GET /api/auth/kakao/callback).
 * 일반적인 흐름은 브라우저 리다이렉트지만, 코드 직접 교환이 필요할 때 사용.
 * @param {string} code
 * @param {string} [redirectUri]
 */
export async function handleKakaoCallback(code, redirectUri) {
  const { data } = await client.get('/api/auth/kakao/callback', {
    params: { code, redirect_uri: redirectUri },
  })
  return data
}

/**
 * Access Token 재발급 (POST /api/auth/refresh-token).
 * @returns {Promise<import('@/types/auth.js').RefreshTokenResponse>}
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  const { data } = await client.post('/api/auth/refresh-token', null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
  return data
}

/** 로그아웃 (POST /api/auth/logout). 성공 시 로컬 토큰 제거. */
export async function logout() {
  const { data } = await client.post('/api/auth/logout')
  clearTokens()
  return data
}

/**
 * 개발용 토큰 발급 (POST /api/auth/dev-token).
 * @param {string} email
 * @returns {Promise<string>} accessToken
 */
export async function issueDevToken(email) {
  const { data } = await client.post('/api/auth/dev-token', { email })
  return data
}

/**
 * 이메일 인증 코드 발송 (POST /api/auth/email-verification/send).
 * @param {import('@/types/auth.js').EmailVerificationRequest} payload
 */
export async function sendEmailVerification(payload) {
  const { data } = await client.post(
    '/api/auth/email-verification/send',
    payload,
  )
  return data
}

/**
 * 이메일 인증 코드 확인 (POST /api/auth/email-verification/verify).
 * @param {import('@/types/auth.js').EmailVerificationVerifyRequest} payload
 */
export async function verifyEmailVerification(payload) {
  const { data } = await client.post(
    '/api/auth/email-verification/verify',
    payload,
  )
  return data
}
