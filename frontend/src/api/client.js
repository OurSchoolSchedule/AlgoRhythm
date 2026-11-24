import axios from 'axios'
import {
  getAccessToken,
  getRefreshToken,
  getSessionVersion,
  setAccessToken,
  clearTokens,
} from './tokenStorage.js'
import { shouldForceReLogin } from '@/utils/authToken.js'

// 개발은 Vite 프록시, 배포는 Vercel rewrite를 통해 같은 /api 경로를 사용한다.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  config._sessionVersion = getSessionVersion()
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 토큰 재발급은 인터셉터가 걸리지 않은 별도 인스턴스로 호출해 무한 루프를 방지한다.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

async function requestNewAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN')
  }
  const { data } = await refreshClient.post('/api/auth/refresh-token', null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
  return data.accessToken
}

// 동시에 401이 여러 건 발생해도 재발급은 한 번만 수행하고 나머지는 대기시킨다.
let refreshFlight = null

// 인증 만료로 더 이상 복구가 불가능할 때 호출되는 콜백 (라우터 연동 시 주입).
let onAuthError = null
export function setOnAuthError(handler) {
  onAuthError = handler
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error

    if (!response || config?._sessionVersion !== getSessionVersion()) {
      return Promise.reject(error)
    }

    // Spring Security 미인증 403 / 401 → dev-token만으로는 refresh 불가
    // 테스트 로그인(토큰 없음)은 401이어도 화면을 유지한다.
    if (
      getAccessToken() &&
      shouldForceReLogin(response) &&
      (response.status !== 401 || !getRefreshToken()) &&
      !config?.url?.includes('/api/auth/dev-token')
    ) {
      clearTokens()
      onAuthError?.()
      return Promise.reject(error)
    }

    if (response.status !== 401 || config?._retried || !getAccessToken()) {
      return Promise.reject(error)
    }

    // 재발급 엔드포인트 자체가 401이면 즉시 로그아웃 처리한다.
    if (config?.url?.includes('/api/auth/refresh-token')) {
      clearTokens()
      onAuthError?.()
      return Promise.reject(error)
    }

    config._retried = true

    try {
      const generation = config._sessionVersion
      if (config.headers.Authorization !== `Bearer ${getAccessToken()}`) {
        // Another request has already refreshed the access token.
        return client(config)
      }
      if (refreshFlight?.generation !== generation) {
        const promise = requestNewAccessToken().finally(() => {
          if (refreshFlight?.generation === generation) refreshFlight = null
        })
        refreshFlight = { generation, promise }
      }
      const newAccessToken = await refreshFlight.promise
      if (generation !== getSessionVersion()) return Promise.reject(error)
      setAccessToken(newAccessToken)
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${newAccessToken}`
      return client(config)
    } catch (refreshError) {
      if (config._sessionVersion === getSessionVersion()) {
        clearTokens()
        onAuthError?.()
      }
      return Promise.reject(refreshError)
    }
  },
)

export default client
