import { useEffect, useRef, useState } from 'react'
import client from '@/api/client.js'
import { approveDemoReset, passkeyErrorMessage } from '@/api/passkeys'

function isScope(value) {
  return value?.schoolId === 540001 && value.termId === 547001 && Number.isSafeInteger(value.round) && value.round > 0 &&
    ['jobs', 'versions'].every(key => Number.isSafeInteger(value?.[key]) && value[key] >= 0)
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
      if (!isScope(data) || data.round !== scope.round + 1 || data.jobs !== 0 || data.versions !== 0) {
        setScope(null)
        setError('초기화 결과를 확인하지 못했습니다. 창을 다시 열어 현재 회차를 확인하세요.')
        return
      }
      sessionStorage.setItem('school42TimetableResetRound', String(data.round))
      window.location.reload()
    } catch (cause) {
      if (signal.current?.aborted) return
      if (cause.response?.status === 409) setScope(null)
      setError(cause.response?.data?.message || (cause.isAxiosError
        ? '서버 응답을 확인하지 못했습니다. 창을 다시 열어 현재 회차를 확인하세요.'
        : passkeyErrorMessage(cause)))
    } finally {
      running.current = false
      if (!signal.current?.aborted) { setBusy(false); onBusy(false) }
    }
  }

  return (
    <form className="demo-reset-form" aria-label="School42 시간표 초기화" onSubmit={reset}>
      {scope && <>
        <label htmlFor="demo-reset-password">초기화를 진행하려면 비밀번호를 입력하세요</label>
        <p>시연한들고등학교 · 2026학년도 2학기 · {scope.round}회차<br />편성 작업 {scope.jobs}건과 게시 시간표 {scope.versions}개를 삭제합니다. 주간·날짜별 수업도 함께 삭제됩니다.</p>
        <p>모든 계정과 패스키, 학교 소속, 교사 명부, 시수표는 유지됩니다.</p>
        <input id="demo-reset-password" type="password" inputMode="numeric" autoComplete="off"
          value={password} maxLength={16} onChange={e => setPassword(e.target.value)} disabled={busy} />
      </>}
      {!scope && !error && <p role="status">School42 시연 학기의 시간표를 확인하고 있습니다.</p>}
      {error && <p role="alert">{error}</p>}
      <div>
        {scope && <button className="demo-reset-submit" type="submit" disabled={!password || busy}>
          {busy ? '본인 확인 및 초기화 중…' : 'School42 시간표만 초기화'}
        </button>}
        <button type="button" disabled={busy} onClick={onCancel}>취소</button>
      </div>
    </form>
  )
}
