// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addPasskey,
  listPasskeys,
  loginWithPasskey,
  passkeyErrorMessage,
  recoverPasskey,
  registerPasskey,
  removePasskey,
  rotateRecoveryCode,
  supportsPasskeys,
} from './passkeys'
import { clearTokens } from './tokenStorage.js'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('./client.js', () => ({ default: { request } }))

const work = { userId: 42, accessToken: 'test-access', refreshToken: 'test-refresh' }
const recovered = { ...work, recoveryCode: 'test-recovery-code' }
const publicKey = { challenge: 'cHVibGlj' }
const envelope = (ceremonyId: string) => ({ ceremonyId, publicKey })
const assertion = { type: 'public-key', id: 'test-id', response: { signature: 'c2ln' } }
const registration = {
  type: 'public-key',
  id: 'test-id',
  response: { attestationObject: 'Y2Jvcg' },
}

class BrowserCredential {
  static parseCreationOptionsFromJSON = vi.fn(() => ({
    challenge: new Uint8Array([1]),
    authenticatorSelection: { residentKey: 'required' },
  }))
  static parseRequestOptionsFromJSON = vi.fn(() => ({ challenge: new Uint8Array([2]) }))
  constructor(private json: Record<string, unknown>) {}
  toJSON() {
    return this.json
  }
}
const create = vi.fn()
const get = vi.fn()
const root = '/api/auth/passkeys'
function responses(...values: unknown[]) {
  for (const data of values) request.mockResolvedValueOnce({ data })
}
function requests() {
  return request.mock.calls.map(([{ method, url, data }]) => [method, url.slice(root.length), data])
}

beforeEach(() => {
  request.mockReset()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PublicKeyCredential', BrowserCredential)
  vi.stubGlobal('navigator', { credentials: { get, create } })
  create.mockReset().mockResolvedValue(new BrowserCredential(registration))
  get.mockReset().mockResolvedValue(new BrowserCredential(assertion))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('로그인 및 분실 복구', () => {
  it('최초 등록 옵션을 WebAuthn으로 변환하고 완료 때 세션과 복구 코드를 전달한다', async () => {
    const signal = new AbortController().signal
    responses(envelope('register'), recovered)
    await expect(registerPasskey('email-grant', signal)).resolves.toEqual(recovered)
    expect(requests()).toEqual([
      ['post', '/registration/options', { flowToken: 'email-grant' }],
      ['post', '/registration/finish', { ceremonyId: 'register', credential: registration }],
    ])
    expect(BrowserCredential.parseCreationOptionsFromJSON).toHaveBeenCalledWith(publicKey)
    expect(create).toHaveBeenCalledWith({
      publicKey: {
        challenge: new Uint8Array([1]),
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      },
      signal,
    })
    expect(request.mock.calls.every(([config]) => config.signal === signal)).toBe(true)
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })

  it('이메일 없이 새 인증 옵션을 사용하며 취소 후에만 사용자가 다시 시작한다', async () => {
    responses(envelope('old'))
    get.mockRejectedValueOnce(new DOMException('cancelled', 'NotAllowedError'))
    await expect(loginWithPasskey()).rejects.toMatchObject({ code: 'PASSKEY_CANCELLED' })
    expect(requests()).toEqual([['post', '/authentication/options', undefined]])
    responses(envelope('new'), { ...work, recoveryCode: null })
    await expect(loginWithPasskey()).resolves.toEqual(work)
    expect(requests().slice(1)).toEqual([
      ['post', '/authentication/options', undefined],
      ['post', '/authentication/finish', { ceremonyId: 'new', credential: assertion }],
    ])
    expect(BrowserCredential.parseRequestOptionsFromJSON).toHaveBeenCalledWith(publicKey)
    expect(get).toHaveBeenCalledWith({
      publicKey: { challenge: new Uint8Array([2]), userVerification: 'required' },
      signal: undefined,
    })
  })

  it('복구에는 이메일 제한 토큰과 기존 복구 코드를 함께 보내고 새 복구 코드를 돌려준다', async () => {
    responses(envelope('recover'), recovered)
    await expect(recoverPasskey('verified-email', 'previous-code')).resolves.toEqual(recovered)
    expect(requests()).toEqual([
      ['post', '/recovery/options', { flowToken: 'verified-email', recoveryCode: 'previous-code' }],
      ['post', '/registration/finish', { ceremonyId: 'recover', credential: registration }],
    ])
  })

  it('지원하지 않는 컨텍스트에서는 등록 토큰을 소비하지 않는다', async () => {
    vi.stubGlobal('isSecureContext', false)
    expect(supportsPasskeys()).toBe(false)
    await expect(registerPasskey('grant')).rejects.toMatchObject({ code: 'PASSKEY_UNSUPPORTED' })
    expect(request).not.toHaveBeenCalled()
  })

  it('WebAuthn 완료 전 화면 이탈 또는 계정 전환 시 서명을 전송하지 않는다', async () => {
    const controller = new AbortController()
    responses(envelope('abort'), envelope('switch'))
    get.mockImplementationOnce(() => {
      controller.abort()
      return new BrowserCredential(assertion)
    })
    await expect(loginWithPasskey(controller.signal)).rejects.toMatchObject({
      code: 'PASSKEY_CANCELLED',
    })
    get.mockImplementationOnce(() => {
      clearTokens()
      return new BrowserCredential(assertion)
    })
    await expect(loginWithPasskey()).rejects.toMatchObject({ code: 'PASSKEY_CANCELLED' })
    expect(requests().every(([, path]) => path === '/authentication/options')).toBe(true)
  })

  it('잘못된 옵션, 불완전한 업무 세션, 복구 코드가 누락된 복구 응답을 거부한다', async () => {
    responses(
      { publicKey },
      envelope('login'),
      { approvalToken: 'wrong-kind' },
      envelope('recover'),
      work,
    )
    await expect(loginWithPasskey()).rejects.toMatchObject({ code: 'PASSKEY_RESPONSE_INVALID' })
    expect(get).not.toHaveBeenCalled()
    await expect(loginWithPasskey()).rejects.toMatchObject({ code: 'PASSKEY_RESPONSE_INVALID' })
    await expect(recoverPasskey('grant', 'code')).rejects.toMatchObject({
      code: 'PASSKEY_RESPONSE_INVALID',
    })
  })
})

describe('기기 관리 재인증', () => {
  it('서버 기기 목록을 읽고 형식이 잘못된 행을 빈 목록으로 표시하지 않는다', async () => {
    const device = { id: 'key-id', createdAt: '2026-11-25T12:00:00' }
    responses([device], [], [{ id: 42 }])
    await expect(listPasskeys()).resolves.toEqual([device])
    await expect(listPasskeys()).resolves.toEqual([])
    await expect(listPasskeys()).rejects.toMatchObject({ code: 'PASSKEY_RESPONSE_INVALID' })
    expect(requests()[0]).toEqual(['get', '/credentials', undefined])
  })

  it('대상 기기 ID를 확인할 수 없으면 재인증을 시작하지 않는다', async () => {
    await expect(removePasskey('..')).rejects.toMatchObject({ code: 'PASSKEY_INVALID' })
    expect(request).not.toHaveBeenCalled()
  })

  it('ADD 승인 후 추가 키를 등록하고 완료 응답으로만 업무 세션을 반환한다', async () => {
    responses(envelope('reauth'), { approvalToken: 'add-grant' }, envelope('additional'), work)
    await expect(addPasskey()).resolves.toEqual(work)
    expect(requests()).toEqual([
      ['post', '/reauthentication/options', { operation: 'ADD' }],
      ['post', '/authentication/finish', { ceremonyId: 'reauth', credential: assertion }],
      ['post', '/credentials/options', { approvalToken: 'add-grant' }],
      ['post', '/registration/finish', { ceremonyId: 'additional', credential: registration }],
    ])
  })

  it('선택한 기기에 한정한 승인으로 철회하고 별도의 승인으로 복구 코드를 회전한다', async () => {
    responses(
      envelope('delete'),
      { approvalToken: 'delete-grant' },
      undefined,
      envelope('rotate'),
      { approvalToken: 'rotate-grant' },
      { recoveryCode: 'rotated' },
    )
    await expect(removePasskey('key_01-')).resolves.toBeUndefined()
    await expect(rotateRecoveryCode()).resolves.toBe('rotated')
    expect(requests()).toEqual([
      ['post', '/reauthentication/options', { operation: 'DELETE', credentialId: 'key_01-' }],
      ['post', '/authentication/finish', { ceremonyId: 'delete', credential: assertion }],
      ['delete', '/credentials/key_01-', { approvalToken: 'delete-grant' }],
      ['post', '/reauthentication/options', { operation: 'ROTATE' }],
      ['post', '/authentication/finish', { ceremonyId: 'rotate', credential: assertion }],
      ['post', '/recovery-code', { approvalToken: 'rotate-grant' }],
    ])
  })

  it('업무 세션은 재인증 승인으로 사용할 수 없다', async () => {
    responses(envelope('reauth'), work)
    await expect(addPasskey()).rejects.toMatchObject({ code: 'PASSKEY_RESPONSE_INVALID' })
    expect(create).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it.each(['LAST_PASSKEY', 'PASSKEY_FLOW_EXPIRED'])(
    '409 %s를 재시도 없이 전달하고 오류에서 인증 정보를 제거한다',
    async (code) => {
      responses(envelope('delete'), { approvalToken: 'delete-grant' })
      request.mockRejectedValueOnce({
        config: { data: { approvalToken: 'delete-grant' } },
        response: { status: 409, data: { code } },
      })
      const error = await removePasskey('key').catch((e) => e)
      expect(error).toMatchObject({ code })
      expect(error).not.toHaveProperty('config')
      expect(passkeyErrorMessage(error)).not.toContain('delete-grant')
      expect(request).toHaveBeenCalledTimes(3)
    },
  )
})
