import client from './client.js'
import { getSessionVersion } from './tokenStorage.js'
import { isWorkSession, type WorkSession } from '@/pages/auth/emailSession'

export type PasskeyDevice = { id: string; createdAt: string }
const base = '/api/auth/passkeys'

const messages = {
  PASSKEY_UNSUPPORTED:
    '이 환경에서는 패스키를 사용할 수 없습니다. 최신 브라우저에서 서비스 주소를 직접 열어 주세요.',
  PASSKEY_CANCELLED: '패스키 요청이 취소되었거나 시간이 지났습니다. 준비되면 다시 시도해 주세요.',
  PASSKEY_INVALID: '패스키 또는 복구 코드를 확인할 수 없습니다. 인증을 다시 시작해 주세요.',
  PASSKEY_REQUIRED: '등록한 패스키로 로그인해 주세요.',
  PASSKEY_FLOW_EXPIRED: '요청이 만료되었거나 등록 상태가 바뀌었습니다. 인증을 다시 시작해 주세요.',
  LAST_PASSKEY: '마지막 패스키입니다. 다른 패스키를 먼저 추가해 주세요.',
  PASSKEY_RESPONSE_INVALID: '서버의 패스키 응답을 확인할 수 없습니다. 인증을 다시 시작해 주세요.',
  PASSKEY_SESSION_REQUIRED: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  PASSKEY_ORIGIN:
    '이 주소에서는 패스키를 사용할 수 없습니다. 서비스의 공식 주소에서 다시 시도해 주세요.',
  PASSKEY_ALREADY_REGISTERED: '이미 등록된 패스키입니다. 다른 인증 장치를 선택해 주세요.',
  PASSKEY_UNAVAILABLE: '패스키 요청을 완료하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
} as const

type ErrorCode = keyof typeof messages

class PasskeyError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(messages[code])
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const nonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const credentialId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,1364}$/.test(value)

export function passkeyErrorCode(error: unknown): ErrorCode | undefined {
  if (error instanceof PasskeyError) return error.code
  if (!record(error)) return undefined
  if (
    error.name === 'AbortError' ||
    error.name === 'NotAllowedError' ||
    error.code === 'ERR_CANCELED'
  )
    return 'PASSKEY_CANCELLED'
  if (error.name === 'SecurityError') return 'PASSKEY_ORIGIN'
  if (error.name === 'InvalidStateError') return 'PASSKEY_ALREADY_REGISTERED'
  if (error.name === 'NotSupportedError') return 'PASSKEY_UNSUPPORTED'
  const response = error.response
  if (!record(response)) return undefined
  if (response.status === 403 && response.data === 'Invalid CORS request') return 'PASSKEY_ORIGIN'
  if (
    record(response.data) &&
    nonempty(response.data.code) &&
    Object.hasOwn(messages, response.data.code)
  )
    return response.data.code as ErrorCode
  if (response.status === 401 || response.status === 403) return 'PASSKEY_SESSION_REQUIRED'
  return undefined
}

export function passkeyErrorMessage(error: unknown): string {
  return messages[passkeyErrorCode(error) ?? 'PASSKEY_UNAVAILABLE']
}

export function supportsPasskeys(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    window.top === window &&
    typeof PublicKeyCredential !== 'undefined' &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function' &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function' &&
    typeof PublicKeyCredential.prototype.toJSON === 'function' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  )
}

type Attempt = { signal?: AbortSignal; session: number }
const attempt = (signal?: AbortSignal): Attempt => ({ signal, session: getSessionVersion() })

function checkActive({ signal, session }: Attempt) {
  if (signal?.aborted || session !== getSessionVersion())
    throw new PasskeyError('PASSKEY_CANCELLED')
}

// Keep challenge/approval/recovery data in this invocation. Axios errors can contain the full request.
async function request(
  ctx: Attempt,
  method: 'get' | 'post' | 'delete',
  path: string,
  data?: unknown,
): Promise<unknown> {
  checkActive(ctx)
  try {
    const response = await client.request<unknown>({
      method,
      url: base + path,
      data,
      signal: ctx.signal,
    })
    checkActive(ctx)
    return response.data
  } catch (error) {
    throw new PasskeyError(passkeyErrorCode(error) ?? 'PASSKEY_UNAVAILABLE')
  }
}

async function ceremony(ctx: Attempt, kind: 'create' | 'get', optionsPath: string, body?: unknown) {
  if (!supportsPasskeys()) throw new PasskeyError('PASSKEY_UNSUPPORTED')
  const options = await request(ctx, 'post', optionsPath, body)
  if (!record(options) || !nonempty(options.ceremonyId) || !record(options.publicKey))
    throw new PasskeyError('PASSKEY_RESPONSE_INVALID')

  checkActive(ctx)
  let credential: Credential | null
  try {
    if (kind === 'create') {
      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(
        options.publicKey as unknown as PublicKeyCredentialCreationOptionsJSON,
      )
      publicKey.authenticatorSelection = {
        ...publicKey.authenticatorSelection,
        userVerification: 'required',
      }
      credential = await navigator.credentials.create({ publicKey, signal: ctx.signal })
    } else {
      const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(
        options.publicKey as unknown as PublicKeyCredentialRequestOptionsJSON,
      )
      publicKey.userVerification = 'required'
      credential = await navigator.credentials.get({ publicKey, signal: ctx.signal })
    }
  } catch (error) {
    throw new PasskeyError(passkeyErrorCode(error) ?? 'PASSKEY_INVALID')
  }
  checkActive(ctx)
  if (!credential) throw new PasskeyError('PASSKEY_CANCELLED')
  if (!(credential instanceof PublicKeyCredential)) throw new PasskeyError('PASSKEY_INVALID')
  const finishPath = kind === 'create' ? '/registration/finish' : '/authentication/finish'
  return request(ctx, 'post', finishPath, {
    ceremonyId: options.ceremonyId,
    credential: credential.toJSON(),
  })
}

function session(data: unknown): WorkSession {
  if (!isWorkSession(data)) throw new PasskeyError('PASSKEY_RESPONSE_INVALID')
  return { userId: data.userId, accessToken: data.accessToken, refreshToken: data.refreshToken }
}

function recoveryCode(data: unknown): string {
  if (!record(data) || !nonempty(data.recoveryCode))
    throw new PasskeyError('PASSKEY_RESPONSE_INVALID')
  return data.recoveryCode
}

export async function registerPasskey(flowToken: string, signal?: AbortSignal) {
  const data = await ceremony(attempt(signal), 'create', '/registration/options', { flowToken })
  return { ...session(data), recoveryCode: recoveryCode(data) }
}

export async function loginWithPasskey(signal?: AbortSignal) {
  return session(await ceremony(attempt(signal), 'get', '/authentication/options'))
}

export async function recoverPasskey(flowToken: string, code: string, signal?: AbortSignal) {
  const data = await ceremony(attempt(signal), 'create', '/recovery/options', {
    flowToken,
    recoveryCode: code,
  })
  return { ...session(data), recoveryCode: recoveryCode(data) }
}

export async function listPasskeys(signal?: AbortSignal): Promise<PasskeyDevice[]> {
  const data = await request(attempt(signal), 'get', '/credentials')
  if (!Array.isArray(data)) throw new PasskeyError('PASSKEY_RESPONSE_INVALID')
  return data.map((device) => {
    if (
      !record(device) ||
      !credentialId(device.id) ||
      !nonempty(device.createdAt) ||
      !Number.isFinite(Date.parse(device.createdAt))
    )
      throw new PasskeyError('PASSKEY_RESPONSE_INVALID')
    return { id: device.id, createdAt: device.createdAt }
  })
}

async function approval(
  ctx: Attempt,
  operation: 'ADD' | 'DELETE' | 'ROTATE',
  credentialId?: string,
) {
  const body = credentialId === undefined ? { operation } : { operation, credentialId }
  const data = await ceremony(ctx, 'get', '/reauthentication/options', body)
  if (!record(data) || !nonempty(data.approvalToken))
    throw new PasskeyError('PASSKEY_RESPONSE_INVALID')
  return { approvalToken: data.approvalToken }
}

export async function addPasskey(signal?: AbortSignal) {
  const ctx = attempt(signal)
  const grant = await approval(ctx, 'ADD')
  return session(await ceremony(ctx, 'create', '/credentials/options', grant))
}

export async function removePasskey(id: string, signal?: AbortSignal): Promise<void> {
  if (!credentialId(id)) throw new PasskeyError('PASSKEY_INVALID')
  const ctx = attempt(signal)
  const grant = await approval(ctx, 'DELETE', id)
  await request(ctx, 'delete', '/credentials/' + encodeURIComponent(id), grant)
}

export async function rotateRecoveryCode(signal?: AbortSignal) {
  const ctx = attempt(signal)
  const grant = await approval(ctx, 'ROTATE')
  return recoveryCode(await request(ctx, 'post', '/recovery-code', grant))
}
