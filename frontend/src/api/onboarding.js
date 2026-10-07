// 온보딩(Onboarding) API
import client from './client.js'

/**
 * 온보딩: 역할 + 학교 생성/참여 (POST /api/auth/onboarding).
 * @param {import('@/types/auth.js').OnboardingRequest} payload
 * @returns {Promise<import('@/types/auth.js').OnboardingResponse>}
 */
export async function submitOnboarding(payload) {
  const { data } = await client.post('/api/auth/onboarding', payload)
  return data
}
