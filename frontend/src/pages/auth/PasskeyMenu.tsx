import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { passkeyErrorMessage, verifyCurrentPasskey } from '@/api/passkeys'
import { Dialog, Icon } from '@/pages/home/HomePanels'

const PasskeySettings = lazy(() => import('./PasskeySettings'))

export default function PasskeyMenu({
  children,
}: {
  children: (button: ReactElement) => ReactNode
}) {
  const request = useRef<AbortController | null>(null)
  const [phase, setPhase] = useState<'closed' | 'checking' | 'verified' | 'failed'>('closed')
  const [message, setMessage] = useState('')

  useEffect(() => () => request.current?.abort(), [])

  function close() {
    request.current?.abort()
    request.current = null
    setPhase('closed')
  }

  async function open() {
    if (request.current) return
    const check = new AbortController()
    request.current = check
    setPhase('checking')
    try {
      await verifyCurrentPasskey(check.signal)
      if (!check.signal.aborted) setPhase('verified')
    } catch (error) {
      if (!check.signal.aborted) {
        setMessage(passkeyErrorMessage(error))
        setPhase('failed')
      }
    } finally {
      if (request.current === check) request.current = null
    }
  }

  return (
    <>
      {children(
        <button
          className="desk-icon"
          type="button"
          aria-label="패스키 관리"
          title="패스키 관리"
          aria-haspopup="dialog"
          onClick={() => void open()}
        >
          <Icon name="key" />
        </button>,
      )}
      {phase !== 'closed' && (
        <Dialog title="패스키 관리" onClose={close}>
          {phase === 'checking' && <p role="status">기기에서 패스키를 확인해 주세요.</p>}
          {phase === 'failed' && (
            <>
              <p role="alert">{message}</p>
              <button type="button" onClick={() => void open()}>
                다시 확인
              </button>
            </>
          )}
          {phase === 'verified' && (
            <Suspense fallback={<p role="status">등록된 패스키를 불러오는 중입니다.</p>}>
              <PasskeySettings />
            </Suspense>
          )}
        </Dialog>
      )}
    </>
  )
}
