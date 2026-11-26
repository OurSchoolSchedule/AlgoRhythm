import { useEffect, useRef, useState } from 'react'
import client from '@/api/client.js'
import { approveDemoReset, passkeyErrorMessage } from '@/api/passkeys'
import { clearPreviewUserRole, clearTokens } from '@/api/tokenStorage.js'

function isScope(value) {
  return ['revision', 'users', 'schools'].every(key => Number.isSafeInteger(value?.[key]) && value[key] >= 0)
}

export default function DemoResetForm({ onCancel, onBusy }) {
  const [scope, setScope] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const signal = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    signal.current = controller.signal
    client.get('/api/demo-reset', { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return
      if (isScope(data)) setScope(data)
      else setError('초기화 범위를 확인하지 못했습니다.')
    }).catch((cause) => {
      if (!controller.signal.aborted) {
        setError(cause.response?.data?.message || '초기화 범위를 확인하지 못했습니다.')
      }
    })
    return () => controller.abort()
  }, [])

  async function reset(event) {
    event.preventDefault()
    if (!scope || !password || running.current) return
    running.current = true
    setBusy(true)
    onBusy(true)
    setError('')
    const pin = password
    setPassword('')
    try {
      const approvalToken = await approveDemoReset(signal.current)
      const { data } = await client.post('/api/demo-reset', { scope, password: pin, approvalToken }, { signal: signal.current })
      if (!isScope(data)) { setScope(null); setError('초기화 결과를 확인하지 못했습니다. 다시 로그인해 주세요.'); return }
      sessionStorage.setItem('demoResetNotice', '초기화 완료 · 회원 ' + data.users + '명과 학교 ' + data.schools + '곳을 삭제했습니다. 다음 회차는 회원가입부터 시작하세요.')
      clearTokens()
      clearPreviewUserRole()
      window.location.replace('/')
    } catch (cause) {
      if (signal.current?.aborted) return
      if (cause.response?.status === 409) setScope(null)
      setError(cause.response?.data?.message || (cause.isAxiosError
        ? '서버 응답을 확인하지 못했습니다. 다시 로그인해 현재 회차를 확인하세요.'
        : passkeyErrorMessage(cause)))
    } finally {
      running.current = false
      if (!signal.current?.aborted) { setBusy(false); onBusy(false) }
    }
  }

  return (
    <form className="demo-reset-form" aria-label="전체 시연 초기화" onSubmit={reset}>
      {scope && <>
        <label htmlFor="demo-reset-password">초기화를 진행하려면 비밀번호를 입력하세요</label>
        <p>이 DB의 모든 회원 {scope.users}명과 학교 {scope.schools}곳, 패스키·명부·시간표가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
        <input id="demo-reset-password" type="password" inputMode="numeric" autoComplete="off"
          value={password} maxLength={16} onChange={e => setPassword(e.target.value)} disabled={busy} />
      </>}
      {!scope && !error && <p role="status">삭제될 회원과 학교 수를 확인하고 있습니다.</p>}
      {error && <p role="alert">{error}</p>}
      <div>
        {scope && <button className="demo-reset-submit" type="submit" disabled={!password || busy}>
          {busy ? '본인 확인 및 초기화 중…' : '전체 시연 데이터 초기화'}
        </button>}
        <button type="button" disabled={busy} onClick={onCancel}>취소</button>
      </div>
    </form>
  )
}
