import { useState } from 'react'
import { useDevToken } from '@/hooks'
import { clearPreviewUserRole, clearTokens, saveDevLoginTokens, setPreviewUserRole } from '@/api'

/**
 * 개발용 로그인 화면.
 * dev-token API(이메일 → Access Token)로 토큰을 발급받아 저장한다.
 * 실서비스 카카오 OAuth 플로우는 이후 단계에서 추가.
 */
export default function DevLoginView({ onSuccess }) {
  const [email, setEmail] = useState('')
  const devToken = useDevToken()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    devToken.mutate(email.trim(), {
      onSuccess: (accessToken) => {
        clearPreviewUserRole()
        saveDevLoginTokens(accessToken)
        onSuccess?.()
      },
    })
  }

  const enterPreview = (role) => {
    clearTokens()
    setPreviewUserRole(role)
    onSuccess?.(role)
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
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          padding: '32px',
        }}
      >
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text)',
          }}
        >
          AlgoRhythm
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          개발용 로그인 (dev-token)
        </p>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-input)',
            fontSize: 14,
            color: 'var(--color-text)',
            boxSizing: 'border-box',
            outline: 'none',
            marginBottom: 16,
          }}
        />

        {devToken.isError && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-danger)' }}>
            로그인에 실패했습니다. 등록된 이메일을 다시 입력하세요.
          </p>
        )}

        <button
          type="submit"
          disabled={devToken.isPending || !email.trim()}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 8,
            border: 'none',
            background: devToken.isPending || !email.trim() ? 'var(--color-border)' : 'var(--color-primary-button)',
            color: devToken.isPending || !email.trim() ? 'var(--color-text-muted)' : 'var(--color-on-primary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: devToken.isPending || !email.trim() ? 'default' : 'pointer',
          }}
        >
          {devToken.isPending ? '로그인 중...' : '로그인'}
        </button>

        <p style={{ margin: '20px 0 10px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          테스트 로그인
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => enterPreview('worker')}
            style={previewButtonStyle}
          >
            일반 교사
          </button>
          <button
            type="button"
            onClick={() => enterPreview('admin')}
            style={previewButtonStyle}
          >
            관리자
          </button>
        </div>
      </form>
    </div>
  )
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
