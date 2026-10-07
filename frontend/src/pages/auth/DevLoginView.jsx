import { useState } from 'react'
import {
  useDevToken,
  useOnboarding,
  useSendEmailVerification,
  useVerifyEmailVerification,
} from '@/hooks'
import {
  clearPreviewUserRole,
  clearTokens,
  saveDevLoginTokens,
  setPreviewUserRole,
  setTokens,
} from '@/api'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const showTestLogin = import.meta.env.DEV || import.meta.env.VITE_SHOW_TEST_LOGIN === 'true'

/**
 * 로그인 화면.
 * - 이메일 인증 send/verify
 * - 신규이면 온보딩
 * - 기존은 토큰 저장 후 진입
 * - 개발용 dev-token·테스트 미리보기는 DEV 또는 VITE_SHOW_TEST_LOGIN=true 일 때만
 */
export default function DevLoginView({ onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [role, setRole] = useState('TEACHER')
  const [schoolCode, setSchoolCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [address, setAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [hireDate, setHireDate] = useState('')

  const devToken = useDevToken()
  const sendCode = useSendEmailVerification()
  const verifyCode = useVerifyEmailVerification()
  const onboarding = useOnboarding()

  const enterPreview = (previewRole) => {
    clearTokens()
    setPreviewUserRole(previewRole)
    onSuccess?.(previewRole)
  }

  const handleDevLogin = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setMessage('')
    devToken.mutate(email.trim(), {
      onSuccess: (accessToken) => {
        clearPreviewUserRole()
        saveDevLoginTokens(accessToken)
        onSuccess?.()
      },
      onError: (error) => setMessage(getApiErrorMessage(error, '로그인에 실패했습니다.')),
    })
  }

  const handleSendCode = async () => {
    setMessage('')
    try {
      const result = await sendCode.mutateAsync({ email: email.trim() })
      setMode('code')
      setMessage(result?.message || '인증 코드를 보냈습니다.')
    } catch (error) {
      setMessage(getApiErrorMessage(error, '인증 코드를 보내지 못했습니다.'))
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const result = await verifyCode.mutateAsync({ email: email.trim(), code: code.trim() })
      if (result?.accessToken) {
        clearPreviewUserRole()
        setTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          userId: result.userId,
        })
      }
      if (result?.newUser) {
        setMode('onboarding')
        setMessage('학교를 등록하거나 가입해 주세요.')
        return
      }
      onSuccess?.()
    } catch (error) {
      setMessage(getApiErrorMessage(error, '인증에 실패했습니다.'))
    }
  }

  const handleOnboarding = async (e) => {
    e.preventDefault()
    setMessage('')
    const payload = {
      role,
      hireDate: hireDate || undefined,
      phoneNumber: phoneNumber || undefined,
    }
    if (role === 'ADMIN') {
      payload.name = schoolName.trim()
      payload.address = address.trim()
    } else {
      payload.schoolCode = schoolCode.trim()
    }
    try {
      await onboarding.mutateAsync(payload)
      onSuccess?.(role === 'ADMIN' ? 'admin' : 'worker')
    } catch (error) {
      setMessage(getApiErrorMessage(error, '온보딩에 실패했습니다.'))
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          padding: '32px',
        }}
      >
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
          우리학교 시간표
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          {mode === 'onboarding'
            ? '학교 온보딩'
            : mode === 'code'
              ? '이메일 인증'
              : '시간표·보결·할 일을 한곳에서 관리합니다.'}
        </p>

        {mode === 'login' && (
          <div>
            <label style={labelStyle}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
              style={inputStyle}
            />
            {message && <p style={errorStyle}>{message}</p>}
            <button
              type="button"
              disabled={sendCode.isPending || !email.trim()}
              onClick={handleSendCode}
              style={primaryButton(sendCode.isPending || !email.trim())}
            >
              {sendCode.isPending ? '코드 보내는 중...' : '이메일 인증 코드 받기'}
            </button>

            {showTestLogin && (
              <>
                <p style={{ margin: '20px 0 10px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  개발용 로그인 (dev-token)
                </p>
                <form onSubmit={handleDevLogin}>
                  <button
                    type="submit"
                    disabled={devToken.isPending || !email.trim()}
                    style={primaryButton(devToken.isPending || !email.trim())}
                  >
                    {devToken.isPending ? '로그인 중...' : '개발 로그인'}
                  </button>
                </form>
                <p style={{ margin: '16px 0 10px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  테스트 로그인
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => enterPreview('worker')} style={previewButtonStyle}>일반 교사</button>
                  <button type="button" onClick={() => enterPreview('admin')} style={previewButtonStyle}>관리자</button>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>{email}</p>
            <label style={labelStyle}>인증 코드</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6자리 코드"
              autoFocus
              style={inputStyle}
            />
            {message && <p style={errorStyle}>{message}</p>}
            <button
              type="submit"
              disabled={verifyCode.isPending || !code.trim()}
              style={primaryButton(verifyCode.isPending || !code.trim())}
            >
              {verifyCode.isPending ? '확인 중...' : '인증하기'}
            </button>
            <button type="button" onClick={() => setMode('login')} style={{ ...secondaryButton, marginTop: 8 }}>
              뒤로
            </button>
          </form>
        )}

        {mode === 'onboarding' && (
          <form onSubmit={handleOnboarding}>
            <label style={labelStyle}>역할</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="TEACHER">교사</option>
              <option value="ADMIN">관리자</option>
            </select>
            {role === 'TEACHER' ? (
              <label style={labelStyle}>학교 코드
                <input value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} style={inputStyle} required />
              </label>
            ) : (
              <>
                <label style={labelStyle}>학교 이름
                  <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} style={inputStyle} required />
                </label>
                <label style={labelStyle}>주소
                  <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} required />
                </label>
              </>
            )}
            <label style={labelStyle}>전화
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>고용일
              <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={inputStyle} />
            </label>
            {message && <p style={errorStyle}>{message}</p>}
            <button type="submit" disabled={onboarding.isPending} style={primaryButton(onboarding.isPending)}>
              {onboarding.isPending ? '등록 중...' : '완료'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  fontSize: 14,
  color: 'var(--color-text)',
  boxSizing: 'border-box',
  outline: 'none',
  marginBottom: 12,
}
const errorStyle = { margin: '0 0 12px', fontSize: 12, color: 'var(--color-danger)' }
const primaryButton = (disabled) => ({
  width: '100%',
  padding: '11px 0',
  borderRadius: 8,
  border: 'none',
  background: disabled ? 'var(--color-border)' : 'var(--color-primary-button)',
  color: disabled ? 'var(--color-text-muted)' : 'var(--color-on-primary)',
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer',
})
const secondaryButton = {
  width: '100%',
  padding: '10px 0',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
const previewButtonStyle = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
