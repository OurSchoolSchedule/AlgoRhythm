import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  addPasskey,
  listPasskeys,
  passkeyErrorCode,
  passkeyErrorMessage,
  removePasskey,
  rotateRecoveryCode,
  supportsPasskeys,
} from '@/api/passkeys'
import {
  getAccessToken,
  getSessionVersion,
  getUserId,
  setTokens,
  subscribeSession,
} from '@/api/tokenStorage.js'
import type { WorkSession } from './emailSession'
import './passkey-settings.css'

type Change = { kind: 'add' } | { kind: 'remove'; id: string } | { kind: 'rotate' }
type Scope = { userId: string; generation: number }

export default function PasskeySettings() {
  const generation = useSyncExternalStore(subscribeSession, getSessionVersion)
  const userId = getUserId()
  const [added, setAdded] = useState<Scope | null>(null)
  if (!userId || !Number.isSafeInteger(Number(userId)) || Number(userId) < 1 || !getAccessToken())
    return null

  function acceptDeviceSession(session: WorkSession) {
    setTokens(session)
    setAdded({ userId: String(session.userId), generation: getSessionVersion() })
  }
  return (
    <AccountPasskeys
      key={`${userId}:${generation}`}
      userId={userId}
      generation={generation}
      justAdded={added?.userId === userId && added.generation === generation}
      onAdded={acceptDeviceSession}
    />
  )
}

function AccountPasskeys({
  userId,
  generation,
  justAdded,
  onAdded,
}: Scope & {
  justAdded: boolean
  onAdded: (session: WorkSession) => void
}) {
  const supported = supportsPasskeys()
  const keys = useQuery({
    queryKey: ['passkeys', userId, generation],
    queryFn: ({ signal }) => listPasskeys(signal),
    retry: false,
    gcTime: 0,
  })
  const inFlight = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<Change | null>(null)
  const [notice, setNotice] = useState(justAdded ? '패스키를 추가했습니다.' : '')
  const [error, setError] = useState('')
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const cancel = () => inFlight.current?.abort()
    const unsubscribe = subscribeSession(cancel)
    return () => {
      unsubscribe()
      cancel()
    }
  }, [])

  const devices = keys.data ?? []
  const blocked = !supported || !keys.isSuccess || devices.length === 0 || busy || code !== null
  const canStart = !blocked && !confirmation

  async function change(action: Change) {
    if (blocked || inFlight.current || (action.kind === 'remove' && devices.length < 2)) return
    const controller = new AbortController()
    inFlight.current = controller
    const current = () =>
      !controller.signal.aborted && getSessionVersion() === generation && getUserId() === userId
    setBusy(true)
    setConfirmation(null)
    setNotice('')
    setError('')
    try {
      if (action.kind === 'add') {
        const session = await addPasskey(controller.signal)
        if (!current()) return
        if (String(session.userId) !== userId) {
          setError('현재 계정의 등록 결과를 확인할 수 없습니다. 목록을 다시 확인해 주세요.')
          await keys.refetch()
          return
        }
        // The backend binds this new work session to the newly registered credential.
        onAdded(session)
      } else if (action.kind === 'remove') {
        await removePasskey(action.id, controller.signal)
        if (!current()) return
        setNotice('패스키를 철회했습니다.')
        await keys.refetch()
      } else {
        const recovery = await rotateRecoveryCode(controller.signal)
        if (current()) setCode(recovery)
      }
    } catch (cause) {
      if (!current()) return
      setError(passkeyErrorMessage(cause))
      const reason = passkeyErrorCode(cause)
      if (reason === 'LAST_PASSKEY' || reason === 'PASSKEY_FLOW_EXPIRED') await keys.refetch()
    } finally {
      if (current()) setBusy(false)
      inFlight.current = null
    }
  }

  function confirm(action: Change) {
    setNotice('')
    setError('')
    setConfirmation(action)
  }

  return (
    <section className="passkey-settings" aria-label="내 패스키와 복구 코드">
      <p>
        계정에 등록된 패스키를 확인하고 관리하세요. 변경할 때는 등록된 패스키로 본인을 확인합니다.
      </p>
      {keys.isPending && <p role="status">등록된 패스키를 불러오는 중입니다.</p>}
      {keys.isError && (
        <div role="alert">
          <p>{passkeyErrorMessage(keys.error)}</p>
          <button type="button" onClick={() => void keys.refetch()} disabled={keys.isFetching}>
            목록 다시 불러오기
          </button>
        </div>
      )}
      {keys.isSuccess &&
        (devices.length ? (
          <>
            <ul aria-label="등록된 패스키">
              {devices.map((device) => (
                <li key={device.id}>
                  <div>
                    <strong>패스키 · {device.id.slice(-8)}</strong>
                    <small>
                      등록{' '}
                      <time dateTime={device.createdAt}>
                        {device.createdAt.replace('T', ' ').slice(0, 19)}
                      </time>
                    </small>
                  </div>
                  <button
                    type="button"
                    aria-label={`패스키 ${device.id.slice(-8)} 철회`}
                    disabled={!canStart || devices.length === 1}
                    onClick={() => confirm({ kind: 'remove', id: device.id })}
                  >
                    철회
                  </button>
                </li>
              ))}
            </ul>
            {devices.length === 1 && (
              <p>마지막 패스키는 새 패스키를 추가한 뒤 철회할 수 있습니다.</p>
            )}
          </>
        ) : (
          <p>등록된 패스키가 없습니다. 이메일 인증으로 로그인해 첫 패스키를 등록하세요.</p>
        ))}
      {!supported && (
        <p role="status">
          이 브라우저에서는 패스키를 사용할 수 없습니다. 패스키를 지원하는 브라우저에서 서비스의
          HTTPS 주소를 열어 주세요.
        </p>
      )}
      <div className="passkey-settings__actions">
        <button type="button" disabled={!canStart} onClick={() => void change({ kind: 'add' })}>
          패스키 추가
        </button>
        <button type="button" disabled={!canStart} onClick={() => confirm({ kind: 'rotate' })}>
          복구 코드 재발급
        </button>
      </div>
      {confirmation && (
        <div className="passkey-settings__confirm">
          <p>
            {confirmation.kind === 'remove'
              ? `패스키 ${confirmation.id.slice(-8)}를 철회할까요? 이 패스키로 로그인한 기기는 다시 로그인해야 합니다.`
              : '새 복구 코드를 발급할까요? 기존 복구 코드는 즉시 만료됩니다.'}
          </p>
          <div className="passkey-settings__actions">
            <button type="button" onClick={() => setConfirmation(null)}>
              취소
            </button>
            <button type="button" disabled={blocked} onClick={() => void change(confirmation)}>
              {confirmation.kind === 'remove' ? '확인 후 철회' : '확인 후 재발급'}
            </button>
          </div>
        </div>
      )}
      {busy && <p role="status">패스키 확인 중입니다. 기기의 안내에 따라 주세요.</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {code !== null && (
        <div className="passkey-settings__code">
          <h3>새 복구 코드</h3>
          <p role="status">
            이 코드는 한 번만 표시됩니다. 계정에 다시 접근할 수 있도록 안전한 곳에 보관하세요.
          </p>
          <code>{code}</code>
          <button
            type="button"
            onClick={() => {
              setCode(null)
              setNotice('복구 코드 표시를 마쳤습니다.')
            }}
          >
            저장했어요
          </button>
        </div>
      )}
    </section>
  )
}
