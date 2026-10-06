import client from './client.js'

/** @returns {Promise<Array<{ id?: number, dayOfWeek: string, periodNumber: number, reason?: string }>>} */
export async function getMyUnavailabilities() {
  const { data } = await client.get('/api/me/unavailabilities')
  if (!Array.isArray(data)) {
    throw new Error('근무 불가 응답 형식이 아닙니다.')
  }
  return data
}

/**
 * @param {{ dayOfWeek: string, periodNumber: number }[]} unavailabilities
 */
export async function createMyUnavailabilities(unavailabilities) {
  const { data } = await client.post('/api/me/unavailabilities', { unavailabilities })
  return data
}

/**
 * @param {{ dayOfWeek: string, periodNumber: number }[]} unavailabilities
 */
export async function replaceMyUnavailabilities(unavailabilities) {
  const { data } = await client.put('/api/me/unavailabilities', { unavailabilities })
  return data
}
