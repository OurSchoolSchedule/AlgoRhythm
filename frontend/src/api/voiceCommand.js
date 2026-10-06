// 음성 명령 API. STT는 프론트 담당이고, 백엔드는 텍스트만 받는다.
import client from './client.js'

export const VOICE_INTENTS = [
  'SUBSTITUTE_CREATE',
  'SUBSTITUTE_RESPOND',
  'SUBSTITUTE_APPROVE',
  'AVAILABILITY_ADD',
  'AVAILABILITY_REPLACE',
  'UNKNOWN',
]

/**
 * 미리보기 (POST /api/voice-commands/preview).
 * UNKNOWN이면 confirm을 호출하지 않는다.
 * @param {{ text: string, lang?: string }} payload
 * @returns {Promise<import('@/types/voiceCommand.js').CommandPreviewResponse>}
 */
export async function previewVoiceCommand(payload) {
  const { data } = await client.post('/api/voice-commands/preview', payload)
  const body = data?.data ?? data ?? {}
  return {
    draftToken: body.draftToken ?? null,
    intentType: body.intentType ?? null,
    confidence: body.confidence ?? null,
    description: body.description ?? null,
    preview: body.preview ?? null,
    expiresAt: body.expiresAt ?? null,
  }
}

/**
 * 확정 (POST /api/voice-commands/confirm).
 * 응답 본문은 intent별로 해당 컨트롤러 결과와 같다.
 * SUBSTITUTE_CREATE → SubstituteRequestDetail
 * SUBSTITUTE_RESPOND → SubstituteResponseDetail
 * SUBSTITUTE_APPROVE → SubstituteApprovalDetail
 * AVAILABILITY_ADD / AVAILABILITY_REPLACE → 불가 교시 응답
 * @param {string} draftToken
 */
export async function confirmVoiceCommand(draftToken) {
  const { data } = await client.post('/api/voice-commands/confirm', { draftToken })
  return data?.data ?? data
}
