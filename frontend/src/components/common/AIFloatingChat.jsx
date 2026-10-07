import { useEffect, useRef, useState } from 'react'
import { useConfirmVoiceCommand, usePreviewVoiceCommand } from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'
import { VOICE_INTENT_LABEL, canConfirmVoicePreview, previewLines } from '@/utils/voicePreview.js'

const EXAMPLES = ['내일 3교시 보결 부탁해', '월요일 1교시 근무 불가']

function speechRecognition() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export default function AIFloatingChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [sentText, setSentText] = useState('')
  const recognitionRef = useRef(null)
  const preview = usePreviewVoiceCommand()
  const confirm = useConfirmVoiceCommand()
  const draft = preview.data
  const lines = previewLines(draft?.preview)
  const readyToConfirm = canConfirmVoicePreview(draft)

  useEffect(() => () => recognitionRef.current?.abort?.(), [])

  const stopListening = () => {
    setListening(false)
    try {
      recognitionRef.current?.stop()
    } catch {
      /* 이미 끝난 인식은 무시한다. */
    }
  }

  const startListening = () => {
    const recognition = speechRecognition()
    if (!recognition) {
      setSpeechError('이 브라우저에서는 음성 입력을 쓸 수 없습니다. 텍스트로 입력해 주세요.')
      return
    }
    setSpeechError('')
    recognition.lang = 'ko-KR'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let text = ''
      for (const result of event.results) text += result[0]?.transcript ?? ''
      setInput(text.trim())
    }
    recognition.onerror = () => {
      setListening(false)
      setSpeechError('음성을 듣지 못했습니다. 다시 말하거나 텍스트로 입력해 주세요.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const sendText = (text) => {
    const trimmed = text.trim()
    if (!trimmed || preview.isPending) return
    confirm.reset()
    setSentText(trimmed)
    preview.mutate(trimmed)
  }

  const runConfirm = () => {
    if (!draft?.draftToken) return
    confirm.mutate(draft.draftToken)
  }

  return (
    <>
      {open && (
        <div className="ai-assistant-panel" role="dialog" aria-label="AI 도우미">
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-surface)',
          }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>AI 도우미</p>
            <button type="button" className="panel-close" onClick={() => setOpen(false)} aria-label="질문 닫기">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              말은 이 브라우저에서 글자로 바뀐 뒤 서버에 전달됩니다. 보결과 근무 불가 명령만 실행할 수 있습니다.
            </p>
            {sentText && <Bubble role="user">{sentText}</Bubble>}
            {preview.isPending && <Bubble>명령을 확인하고 있습니다.</Bubble>}
            {preview.isError && (
              <Bubble>
                {getApiErrorMessage(preview.error, '명령을 확인하지 못했습니다.')}{' '}
                <button type="button" className="history-link" onClick={() => sendText(sentText)}>다시 시도</button>
              </Bubble>
            )}
            {draft && !preview.isPending && (
              <Bubble>
                <strong>{VOICE_INTENT_LABEL[draft.intentType] || draft.intentType || '미리보기'}</strong>
                {draft.description ? <span style={{ display: 'block', marginTop: 4 }}>{draft.description}</span> : null}
                {lines.length > 0 && (
                  <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {lines.map((line) => `${line.key}: ${line.value}`).join(' · ')}
                  </span>
                )}
                {readyToConfirm ? (
                  <span style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" disabled={confirm.isPending} onClick={runConfirm} style={confirmButton}>
                      {confirm.isPending ? '실행 중...' : '실행'}
                    </button>
                    <button type="button" disabled={confirm.isPending} onClick={() => preview.reset()} style={ghostButton}>취소</button>
                  </span>
                ) : (
                  <span style={{ display: 'block', marginTop: 6, fontSize: 12 }}>실행할 수 있는 명령이 아닙니다.</span>
                )}
              </Bubble>
            )}
            {confirm.isError && (
              <Bubble>
                {getApiErrorMessage(confirm.error, '명령을 실행하지 못했습니다.')}{' '}
                <button type="button" className="history-link" onClick={runConfirm}>다시 시도</button>
              </Bubble>
            )}
            {confirm.isSuccess && <Bubble>명령을 실행했습니다.</Bubble>}
            {speechError && <Bubble>{speechError}</Bubble>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 12px 0' }}>
            {EXAMPLES.map((chip) => (
              <button key={chip} type="button" onClick={() => setInput(chip)} style={chipButton}>{chip}</button>
            ))}
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
            <button
              type="button"
              aria-pressed={listening}
              aria-label={listening ? '음성 입력 멈추기' : '음성으로 입력'}
              onClick={listening ? stopListening : startListening}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                borderRadius: 8,
                border: '1px solid',
                background: 'var(--color-surface)',
                borderColor: listening ? 'var(--color-danger)' : 'var(--color-border-input)',
                color: listening ? 'var(--color-danger)' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0M12 17v3M8 21h8" />
              </svg>
            </button>
            <textarea
              className="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendText(input)
                }
              }}
              placeholder="말로 하거나 명령을 입력하세요"
              rows={1}
            />
            <button
              type="button"
              aria-label="명령 보내기"
              onClick={() => sendText(input)}
              disabled={preview.isPending || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: input.trim() && !preview.isPending ? 'var(--color-primary-button)' : 'var(--color-border)',
                color: input.trim() && !preview.isPending ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                cursor: input.trim() && !preview.isPending ? 'pointer' : 'default',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22 11 13 2 9z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" className="ai-assistant-button" onClick={() => setOpen(true)} aria-label="AI 도우미 열기">
          ✦ AI 도우미
        </button>
      )}
    </>
  )
}

function Bubble({ role, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg)',
        background: role === 'user' ? 'var(--color-primary-50)' : 'var(--color-surface-hover)',
        color: 'var(--color-text)',
        fontSize: 'var(--font-body)',
        lineHeight: '22px',
      }}>{children}</div>
    </div>
  )
}

const chipButton = {
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  borderRadius: 'var(--radius-md)',
  padding: '4px 10px',
  fontSize: 'var(--font-micro)',
  lineHeight: '16px',
  cursor: 'pointer',
}

const confirmButton = {
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  background: 'var(--color-primary-button)',
  color: 'var(--color-on-primary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostButton = {
  border: '1px solid var(--color-border-input)',
  borderRadius: 6,
  padding: '6px 12px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer',
}
