import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  loginWithPasskey,
  passkeyErrorMessage,
  recoverPasskey,
  registerPasskey,
  supportsPasskeys,
} from '@/api/passkeys'
import { getSessionVersion, subscribeSession } from '@/api/tokenStorage.js'
import type { VerifiedEmail, WorkSession } from './emailSession'

const unsupported =
  '이 브라우저에서는 패스키를 사용할 수 없습니다. 최신 브라우저에서 서비스 주소를 직접 열거나 다른 기기를 사용해 주세요.'

function usePasskeyAction(onBusy?: (busy: boolean) => void) {
  const current = useRef<AbortController | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
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
      if (!request.signal.aborted) setError(passkeyErrorMessage(reason))
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
  return { run, cancel, error, setError, pending }
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
        패스키로 로그인
      </button>
      <p>
        {supported
          ? '등록한 기기를 모두 잃어버렸다면 이메일 인증 후 복구 코드를 사용하세요.'
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
  onRecoveryIssued?: (userId: number) => void
}
type Issued = WorkSession & { recoveryCode: string }

export function VerifiedPasskeyStep({
  verification,
  onRestart,
  onAuthenticated,
  onRecoveryIssued,
}: VerifiedProps) {
  const action = usePasskeyAction()
  const [recovering, setRecovering] = useState(false)
  const [code, setCode] = useState('')
  const [usedGrant, setUsedGrant] = useState(false)
  const [issued, setIssued] = useState<Issued | null>(null)
  const sessionVersion = useSyncExternalStore(subscribeSession, getSessionVersion)
  const [initialVersion] = useState(getSessionVersion)
  const register = verification.nextStep === 'REGISTER'
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
  function completeRegistration(result: Issued) {
    if (!matchesAccount(result)) return
    onRecoveryIssued?.(result.userId)
    setIssued(result)
  }
  function enroll() {
    if (usedGrant || action.pending) return
    // BE consumes the email grant when it issues options, including failed recovery attempts.
    setUsedGrant(true)
    const oldCode = code.trim()
    setCode('')
    void action.run(
      (signal) =>
        recovering
          ? recoverPasskey(verification.flowToken, oldCode, signal)
          : registerPasskey(verification.flowToken, signal),
      completeRegistration,
    )
  }
  if (sessionVersion !== initialVersion)
    return (
      <>
        <p role="alert">로그인 상태가 변경되었습니다. 이메일 인증부터 다시 시작해 주세요.</p>
        {restart}
      </>
    )
  if (issued)
    return (
      <div className="entry-form">
        <h2 className="entry-auth-title">복구 코드 보관</h2>
        <p>
          기기를 분실하면 이메일 인증 후 이 코드로 패스키를 다시 등록할 수 있습니다. 지금 한 번만
          표시되니 비밀번호 관리자 등 안전한 곳에 보관하세요.
        </p>
        <code className="passkey-recovery-code">{issued.recoveryCode}</code>
        <button
          type="button"
          className="entry-primary"
          onClick={() => {
            const { userId, accessToken, refreshToken } = issued
            setIssued(null)
            onAuthenticated({ userId, accessToken, refreshToken })
          }}
        >
          복구 코드를 보관했습니다
        </button>
      </div>
    )

  const supported = supportsPasskeys()
  return (
    <>
      <h2 className="entry-auth-title">
        {register ? '패스키 등록 필요' : recovering ? '분실한 패스키 복구' : '패스키 인증 필요'}
      </h2>
      <div className="entry-form">
        {!supported ? (
          <p role="status">{unsupported}</p>
        ) : (
          <>
            {usedGrant && !action.pending ? (
              <p>
                다시 진행하려면 이메일 인증 코드를 새로 받아 주세요. 이미 등록을 마쳤다면 첫
                화면에서 패스키로 로그인할 수 있습니다.
              </p>
            ) : recovering ? (
              <>
                <p>
                  기존 복구 코드를 입력하고 새 패스키를 등록하세요. 등록이 끝나면 기존 패스키가 모두
                  해제되고 복구 코드도 바뀝니다.
                </p>
                <form
                  className="entry-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (code.trim()) enroll()
                  }}
                >
                  <label>
                    기존 복구 코드
                    <input
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={action.pending}
                      required
                    />
                  </label>
                  <button className="entry-primary" disabled={action.pending || !code.trim()}>
                    새 패스키로 복구
                  </button>
                </form>
                <p>
                  복구 코드가 없다면 패스키가 동기화된 기기나 다른 등록 기기로 로그인하세요. 등록
                  기기와 코드가 모두 없으면 이 화면에서 계정을 복구할 수 없습니다.
                </p>
              </>
            ) : (
              <>
                <p>
                  {register
                    ? '이메일을 확인했습니다. 기기의 화면 잠금 또는 보안 키로 패스키를 등록하세요.'
                    : '이 이메일 계정에 등록한 패스키를 선택하세요.'}
                </p>
                <button
                  type="button"
                  className="entry-primary"
                  disabled={action.pending}
                  onClick={() =>
                    register
                      ? enroll()
                      : void action.run(loginWithPasskey, (session) => {
                          if (matchesAccount(session)) onAuthenticated(session)
                        })
                  }
                >
                  {register ? '패스키 등록' : '등록한 패스키로 인증'}
                </button>
                {!register && (
                  <button
                    type="button"
                    className="entry-secondary"
                    disabled={action.pending}
                    onClick={() => {
                      setRecovering(true)
                      action.setError('')
                    }}
                  >
                    복구 코드로 복구
                  </button>
                )}
              </>
            )}
            <ActionStatus {...action} />
          </>
        )}
        {!action.pending && restart}
      </div>
    </>
  )
}
