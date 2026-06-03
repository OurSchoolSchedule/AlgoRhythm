import axios from 'axios'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
} from './tokenStorage.js'
import { shouldForceReLogin } from '@/utils/authToken.js'

// 빈 문자열이면 상대 경로(같은 origin). 로컬 dev는 .env의 절대 URL, 배포는 .env.production의 빈 값.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8080'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
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
let refreshPromise = null

// 인증 만료로 더 이상 복구가 불가능할 때 호출되는 콜백 (라우터 연동 시 주입).
let onAuthError = null
export function setOnAuthError(handler) {
  onAuthError = handler
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error

    if (!response) {
      return Promise.reject(error)
    }

    // Spring Security 미인증 403 / 401 → dev-token만으로는 refresh 불가
    if (
      shouldForceReLogin(response) &&
      !config?.url?.includes('/api/auth/dev-token')
    ) {
      clearTokens()
      onAuthError?.()
      return Promise.reject(error)
    }

    if (response.status !== 401 || config?._retried) {
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
      if (!refreshPromise) {
        refreshPromise = requestNewAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      const newAccessToken = await refreshPromise
      setAccessToken(newAccessToken)
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${newAccessToken}`
      return client(config)
    } catch (refreshError) {
      clearTokens()
      onAuthError?.()
      return Promise.reject(refreshError)
    }
  },
)

export default client
