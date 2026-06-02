import { useState } from 'react'
import { useDevToken } from '@/hooks'
import { setAccessToken } from '@/api'

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
        setAccessToken(accessToken)
        onSuccess?.()
      },
    })
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f8f6',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          background: '#fff',
          borderRadius: 16,
          border: '0.5px solid #e8e6e0',
          padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
        }}
      >
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: 22,
            fontWeight: 700,
            color: '#2c2c2a',
            letterSpacing: '-0.5px',
          }}
        >
          AlgoRhythm
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888' }}>
          개발용 로그인 (dev-token)
        </p>

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>
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
            border: '0.5px solid #d3d1c7',
            fontSize: 14,
            color: '#2c2c2a',
            boxSizing: 'border-box',
            outline: 'none',
            marginBottom: 16,
          }}
        />

        {devToken.isError && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#d85a30' }}>
            로그인 실패: 해당 이메일의 사용자를 찾을 수 없습니다.
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
            background: devToken.isPending || !email.trim() ? '#bfe3cd' : '#27a859',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: devToken.isPending || !email.trim() ? 'default' : 'pointer',
          }}
        >
          {devToken.isPending ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
