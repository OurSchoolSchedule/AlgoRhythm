import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  loginWithPasskey,
  passkeyErrorCode,
  passkeyErrorMessage,
  registerPasskey,
  supportsPasskeys,
} from '@/api/passkeys'
import { getSessionVersion, subscribeSession } from '@/api/tokenStorage.js'
import { Icon } from '@/pages/home/HomePanels'
import type { VerifiedEmail, WorkSession } from './emailSession'

const unsupported =
  '이 브라우저에서는 패스키를 사용할 수 없습니다. 최신 브라우저에서 서비스 주소를 직접 열거나 다른 기기를 사용해 주세요.'

function usePasskeyAction(onBusy?: (busy: boolean) => void) {
  const current = useRef<AbortController | null>(null)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState({
    message: '',
    originRejected: false,
  })
  function setError(message: string) {
    setFailure({ message, originRejected: false })
  }
  useEffect(
    () => () => {
      current.current?.abort()
      current.current = null
    },
    [],
  )

  async function run<T>(
    perform: (signal: AbortSignal) => Promise<T>,
    complete: (result: T) => void,
  ) {
    if (current.current) return
    const request = new AbortController()
    current.current = request
    setPending(true)
    onBusy?.(true)
    setError('')
    try {
      const result = await perform(request.signal)
      if (!request.signal.aborted) complete(result)
    } catch (reason) {
      if (!request.signal.aborted)
        setFailure({
          message: passkeyErrorMessage(reason),
          originRejected: passkeyErrorCode(reason) === 'PASSKEY_ORIGIN',
        })
    } finally {
      if (current.current === request) {
        current.current = null
        setPending(false)
        onBusy?.(false)
      }
    }
  }
  function cancel() {
    current.current?.abort()
    current.current = null
    setPending(false)
    onBusy?.(false)
    setError('패스키 인증을 취소했습니다.')
  }
  return {
    run,
    cancel,
    error: failure.message,
    setError,
    originRejected: failure.originRejected,
    pending,
  }
}

function ActionStatus({
  pending,
  error,
  cancel,
}: {
  pending: boolean
  error: string
  cancel: () => void
}) {
  return (
    <>
      {pending && (
        <div className="entry-links">
          <span role="status">기기에서 인증을 확인해 주세요.</span>
          <button type="button" onClick={cancel}>
            인증 취소
          </button>
        </div>
      )}
      {error && (
        <p className="entry-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

type LoginProps = {
  disabled: boolean
  onBusyChange: (busy: boolean) => void
  onAuthenticated: (session: WorkSession) => void
}
export function DirectPasskeyLogin({ disabled, onBusyChange, onAuthenticated }: LoginProps) {
  const action = usePasskeyAction(onBusyChange)
  const supported = supportsPasskeys()
  return (
    <div className="entry-form passkey-direct">
      <button
        type="button"
        className="entry-secondary"
        disabled={disabled || action.pending || !supported}
        onClick={() => void action.run(loginWithPasskey, onAuthenticated)}
      >
        <Icon name="key" /> 패스키로 로그인
      </button>
      <p>
        {supported
          ? '패스키를 저장한 기기나 동기화된 비밀번호 관리자로 로그인하세요.'
          : unsupported}
      </p>
      <ActionStatus {...action} />
    </div>
  )
}

type VerifiedProps = {
  verification: VerifiedEmail
  onRestart: () => void
  onAuthenticated: (session: WorkSession) => void
}

export function VerifiedPasskeyStep({
  verification,
  onRestart,
  onAuthenticated,
}: VerifiedProps) {
  const action = usePasskeyAction()
  const [usedGrant, setUsedGrant] = useState(false)
  const sessionVersion = useSyncExternalStore(subscribeSession, getSessionVersion)
  const [initialVersion] = useState(getSessionVersion)
  const restart = (
    <button type="button" className="entry-secondary" onClick={onRestart}>
      이메일 입력으로 돌아가기
    </button>
  )

  function matchesAccount(session: WorkSession) {
    if (session.userId === verification.userId) return true
    action.setError(
      '선택한 패스키와 이메일의 계정이 다릅니다. 이 이메일에 등록한 패스키를 선택해 주세요.',
    )
    return false
  }
  function enroll() {
    if (usedGrant || action.pending) return
    // Registration options consume the one-use email grant, even if the device prompt is cancelled.
    setUsedGrant(true)
    void action.run(
      (signal) => registerPasskey(verification.flowToken, signal),
      (session) => {
        if (matchesAccount(session)) onAuthenticated(session)
      },
    )
  }
  if (sessionVersion !== initialVersion)
    return (
      <>
        <p role="alert">로그인 상태가 변경되었습니다. 이메일 인증부터 다시 시작해 주세요.</p>
        {restart}
      </>
    )
  const supported = supportsPasskeys()
  return (
    <>
      <h2 className="entry-auth-title">이메일 인증 완료</h2>
      <div className="entry-form">
        <p>
          이 기기나 브라우저에 패스키가 없거나 기존 패스키를 분실했다면 새 패스키를
          발급받으세요. 별도의 복구 코드를 보관하거나 입력할 필요가 없습니다.
        </p>
        {!supported && <p role="status">{unsupported}</p>}
        <button
          type="button"
          className="entry-primary"
          disabled={!supported || action.pending || usedGrant}
          onClick={enroll}
        >
          <Icon name="key" /> 새 패스키 발급
        </button>
        <p>기존 패스키는 유지됩니다. 분실한 패스키는 로그인 후 패스키 관리에서 삭제할 수 있습니다.</p>
        {usedGrant && !action.pending && !action.originRejected && (
          <p>
            새 패스키 발급을 다시 진행하려면 이메일 인증 코드를 새로 받아 주세요. 이미
            등록을 마쳤다면 등록한 패스키로 로그인할 수 있습니다.
          </p>
        )}
        <button
          type="button"
          className="entry-secondary"
          disabled={!supported || action.pending}
          onClick={() =>
            void action.run(loginWithPasskey, (session) => {
              if (matchesAccount(session)) onAuthenticated(session)
            })
          }
        >
          등록한 패스키로 인증
        </button>
        <ActionStatus {...action} />
        {!action.pending && restart}
      </div>
    </>
  )
}
