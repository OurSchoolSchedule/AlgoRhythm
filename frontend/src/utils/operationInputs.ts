import { isAxiosError } from 'axios'
import type { GenerationRequest, TeachingSlot } from '@/types/generationJob'

export function operationError(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) return '이 업무를 수행할 권한이 없습니다.'
    return (
      error.response?.data?.message ||
      (error.response
        ? `요청 실패 (HTTP ${error.response.status})`
        : '서버 응답을 받지 못했습니다.')
    )
  }
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function json(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text)
    if (object(value)) return value
  } catch {
    /* handled below */
  }
  throw new Error('입력값은 JSON 객체여야 합니다.')
}
export function readAliases(text: string) {
  if (!text.trim()) return undefined
  const aliases = json(text)
  const result: Record<string, number> = Object.create(null)
  for (const [name, id] of Object.entries(aliases)) {
    if (!name.trim() || typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)
      throw new Error('과목 별칭에는 이름과 양의 정수 과목 ID를 입력하세요.')
    result[name] = id
  }
  return result
}
function slots(value: unknown): value is TeachingSlot[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        object(v) &&
        ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(String(v.day)) &&
        typeof v.period === 'number' &&
        Number.isSafeInteger(v.period) &&
        v.period > 0,
    )
  )
}
type Preferences = NonNullable<GenerationRequest['preferences']>
function preferences(value: unknown): value is Preferences {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        object(v) &&
        typeof v.teacherId === 'string' &&
        v.teacherId.trim() &&
        (v.kind === 'WANT' || v.kind === 'AVOID') &&
        slots(v.anyOf) &&
        v.anyOf.length,
    )
  )
}
export function readGenerationOptions(text: string): Omit<GenerationRequest, 'validatedLoadId'> {
  if (!text.trim()) return {}
  const { teachingSlots, preferences: pref, ...other } = json(text)
  if (Object.keys(other).some((k) => k !== 'validatedLoadId'))
    throw new Error('편성 조건에는 teachingSlots와 preferences를 사용할 수 있습니다.')
  if (teachingSlots !== undefined && !slots(teachingSlots))
    throw new Error('수업 가능 교시의 요일과 교시 번호를 확인하세요.')
  if (pref !== undefined && !preferences(pref))
    throw new Error('선호 조건의 교사 ID·종류·교시를 확인하세요.')
  return { teachingSlots, preferences: pref }
}
