import { lazy, Suspense, useState } from 'react'
import { useSendEmailVerification, useVerifyEmailVerification } from '@/hooks/useAuth'
import {
  clearPreviewUserRole,
  clearTokens,
  getUserId,
  hasPendingSchool,
  hasPendingSchoolFor,
  localLoginEnabled,
  markPendingSchool,
  setTokens,
} from '@/api/tokenStorage'
import { getApiErrorMessage } from '@/utils/timetableGeneration'
import { isWorkSession, readVerifiedEmail } from './emailSession'
import EntryLayout from './EntryLayout'
import SchoolOnboarding from './SchoolOnboarding'
import { DirectPasskeyLogin, VerifiedPasskeyStep } from './PasskeyEntry'

const LocalLogin = import.meta.env.DEV ? lazy(() => import('./LocalLogin')) : null

/** @param {{onSuccess: () => void, PasskeyStep?: import('./emailSession').PasskeyContinuation}} props */
export default function EmailEntryView({ onSuccess, PasskeyStep }) {
  const Continuation = PasskeyStep ?? VerifiedPasskeyStep
  const [phase, setPhase] = useState(() => (hasPendingSchool() ? 'school' : 'email'))
  const [intent, setIntent] = useState('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [verification, setVerification] = useState(null)
  const send = useSendEmailVerification()
  const verify = useVerifyEmailVerification()
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const emailBusy = send.isPending || verify.isPending
  const busy = emailBusy || passkeyBusy

  const reset = () => {
    setPhase('email')
    setVerification(null)
    setCode('')
    setError('')
    setNotice('')
  }

  function enter(session, needsSchool, approvalPending = false) {
    clearPreviewUserRole()
    markPendingSchool(needsSchool ? session.userId : null)
    setTokens(session)
    setVerification(null)
    if (needsSchool) setPhase('school')
    else if (approvalPending) setPhase('pending')
    else onSuccess()
  }

  async function requestCode(event) {
    event.preventDefault()
    if (busy) return
    setError('')
    setNotice('')
    try {
      const result = await send.mutateAsync({ email: email.trim() })
      if (result?.success !== true) {
        setError(result?.message || '인증 코드를 보내지 못했습니다.')
        return
      }
      setPhase('code')
      setCode('')
      setNotice(result.message || '인증 코드를 보냈습니다.')
    } catch (e) {
      setError(getApiErrorMessage(e, '인증 코드를 보내지 못했습니다. 다시 시도해 주세요.'))
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    if (busy || !/^\d{6}$/.test(code)) return
    setError('')
    setNotice('')
    try {
      const response = await verify.mutateAsync({ email: email.trim(), code })
      const result = readVerifiedEmail(response)
      setCode('')
      if (result.kind === 'passkey') {
        setVerification(result.verification)
        setPhase('passkey')
      } else enter(result.session, result.needsSchool, result.approvalPending)
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          e instanceof Error && !e.isAxiosError
            ? e.message
            : '인증에 실패했습니다. 코드를 확인하거나 다시 받아 주세요.',
        ),
      )
    } finally {
      verify.reset()
    }
  }

  return (
    <EntryLayout>
      {phase === 'school' ? (
        <SchoolOnboarding
          error={error}
          onComplete={(membership) => {
            if (!hasPendingSchool() || String(membership?.userId) !== getUserId()) {
              setError('학교 연결 결과를 확인할 수 없습니다. 다시 로그인해 주세요.')
              return
            }
            markPendingSchool(null)
            if (membership.employmentStatus === 'PENDING') setPhase('pending')
            else onSuccess()
          }}
          onExit={() => {
            clearTokens()
            reset()
          }}
        />
      ) : phase === 'pending' ? (
        <>
          <h2 className="entry-auth-title">학교 가입 승인 대기</h2>
          <p>학교 가입 요청을 접수했습니다. 관리자가 승인하면 학교 업무를 사용할 수 있습니다.</p>
          <button type="button" className="entry-primary" onClick={onSuccess}>
            업무 홈으로
          </button>
        </>
      ) : phase === 'passkey' ? (
        <>
          <Continuation
            verification={verification}
            onRestart={reset}
            onAuthenticated={(session) => {
              if (!isWorkSession(session) || session.userId !== verification.userId) {
                setError('인증한 계정의 업무 세션을 확인할 수 없습니다.')
                return
              }
              enter(
                session,
                !verification.schoolMembership &&
                  (verification.nextStep === 'REGISTER' || hasPendingSchoolFor(session.userId)),
                verification.schoolMembership?.employmentStatus === 'PENDING',
              )
            }}
          />
          {error && (
            <p role="alert" className="entry-error">
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          {phase === 'email' && (
            <div className="entry-tabs" role="group" aria-label="이메일 인증 방식">
              {[
                ['login', '로그인'],
                ['signup', '회원가입'],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  disabled={busy}
                  aria-pressed={key === intent}
                  onClick={() => {
                    setIntent(key)
                    setError('')
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <h2 className="entry-auth-title">
            {phase === 'code'
              ? '인증 코드 확인'
              : intent === 'login'
                ? '업무 로그인'
                : '이메일로 회원가입'}
          </h2>
          <p>
            {phase === 'code' ? (
              <>
                <strong className="entry-email">{email.trim()}</strong>에 도착한 6자리 코드를
                입력하세요.
              </>
            ) : intent === 'login' ? (
              '등록한 패스키로 로그인하거나 학교 업무용 이메일로 인증을 시작하세요.'
            ) : (
              '이메일 인증 후 학교를 연결해 계정을 시작하세요.'
            )}
          </p>
          {phase === 'email' && intent === 'login' && (
            <DirectPasskeyLogin
              disabled={emailBusy}
              onBusyChange={setPasskeyBusy}
              onAuthenticated={(session) => enter(session, hasPendingSchoolFor(session.userId))}
            />
          )}
          <form className="entry-form" onSubmit={phase === 'code' ? verifyCode : requestCode}>
            {phase === 'email' ? (
              <label>
                이메일
                <input
                  type="email"
                  autoComplete="email"
                  name="email"
                  required
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.ac.kr"
                />
              </label>
            ) : (
              <label>
                인증 코드
                <input
                  key="code"
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  value={code}
                  disabled={busy}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            )}
            {notice && (
              <p role="status" className="entry-message">
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="entry-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="entry-primary"
              disabled={busy || (phase === 'code' ? !/^\d{6}$/.test(code) : !email.trim())}
            >
              {emailBusy
                ? verify.isPending
                  ? '확인 중…'
                  : '보내는 중…'
                : phase === 'code'
                  ? '인증하기'
                  : '인증 코드 받기'}
            </button>
          </form>
          {phase === 'code' && (
            <div className="entry-links">
              <button type="button" disabled={busy} onClick={requestCode}>
                다시 보내기
              </button>
              <button type="button" disabled={busy} onClick={reset}>
                이메일 변경
              </button>
            </div>
          )}
          {phase === 'email' && !busy && localLoginEnabled() && LocalLogin && (
            <Suspense fallback={null}>
              <LocalLogin email={email} onSuccess={onSuccess} />
            </Suspense>
          )}
        </>
      )}
    </EntryLayout>
  )
}
