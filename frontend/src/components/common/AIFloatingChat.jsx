import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSchoolSwitchStamp } from '@/api/tokenStorage.js'
import { useConfirmVoiceCommand, usePreviewVoiceCommand } from '@/hooks'
import { useHomeSession } from '@/hooks/useHomeSession'
import { useTermChoice } from '@/hooks/useTermChoice'
import { useTimetableSelection } from '@/hooks/useTimetableSelection'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'
import { VOICE_INTENT_LABEL, canConfirmVoicePreview, previewLines } from '@/utils/voicePreview.js'
import LessonAssistant from './LessonAssistant'
import DemoResetForm from './DemoResetForm'
import './demo-reset.css'
import './lesson-assistant.css'

const EXAMPLES = [
  '이번 주 내 시간표를 알려줘',
  '공강 교사를 찾아줘',
  '교환 가능한 수업을 찾아줘',
  '내 보결 요청 상태를 알려줘',
  '월요일 1교시 근무 불가',
]
const LESSON_COMMANDS = ['MY_WEEK', 'COVER_OPTIONS', 'SWAP_OPTIONS', 'CHANGE_STATUS']
const DETAIL_LABELS = {
  substituteDate: '보결 날짜',
  timetableInfo: '수업',
  note: '요청 사유',
  requestId: '신청 번호',
  timetableId: '수업 번호',
  responseId: '응답 번호',
  teacherName: '교사',
  currentStatus: '처리 상태',
  action: '처리 내용',
  operation: '등록 방식',
  teacherAction: '교사 응답',
}

const conversationKey = ['open-assistant-conversation']

export default function AIFloatingChat() {
  const session = useHomeSession()
  const owner =
    session.userId &&
    session.scope.schoolId &&
    JSON.stringify([session.scope, getSchoolSwitchStamp()])
  return <ChatLauncher key={owner} owner={owner} session={session} />
}

function ChatLauncher({ owner, session }) {
  const cache = useQueryClient()
  // Term-specific roster confirmation temporarily removes the entire workspace.
  // Keep only user-written text while the same authenticated school completes that gate.
  const { data: saved } = useQuery({
    queryKey: conversationKey,
    queryFn: skipToken,
    gcTime: Infinity,
  })
  const previous = owner && saved?.owner === owner ? saved : null
  const [open, setOpen] = useState(() => Boolean(previous))
  const [input, setInput] = useState(() => previous?.input ?? '')
  const [history, setHistory] = useState(() => previous?.history ?? [])
  const trigger = useRef(null)
  useLayoutEffect(() => {
    if (open && owner) {
      cache.setQueryData(conversationKey, {
        owner,
        input,
        history: history.map(({ id, text }) => ({ id, text })),
      })
    } else if (owner && cache.getQueryData(conversationKey)) {
      cache.setQueryData(conversationKey, null)
    }
  }, [cache, open, owner, input, history])
  const restoreFocus = useRef(false)
  useLayoutEffect(() => {
    if (open || !restoreFocus.current) return
    restoreFocus.current = false
    trigger.current?.focus({ preventScroll: true })
  }, [open])
  function close() {
    restoreFocus.current = true
    setInput('')
    setHistory([])
    setOpen(false)
  }
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="ai-assistant-button ai-chat-launch"
        aria-haspopup="dialog"
        disabled={Boolean(session.userId && (session.active.isLoading || session.switching))}
        onClick={() => setOpen(true)}
        aria-label="AI 도우미 열기"
      >
        <span aria-hidden="true">✦</span> AI 도우미
      </button>
      {open &&
        createPortal(
          <AssistantDialog
            onClose={close}
            {...{ session, input, setInput, history, setHistory }}
          />,
          document.body,
        )}
    </>
  )
}

function cycleDialogFocus(event) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return
  const controls = Array.from(
    event.currentTarget.querySelectorAll(
      'button:enabled, input:enabled, select:enabled, textarea:enabled, summary, a[href], [tabindex="0"]',
    ),
  ).filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0)
  const first = controls[0]
  const last = controls.at(-1)
  const boundary = event.shiftKey ? first : last
  if (boundary && document.activeElement === boundary) {
    event.preventDefault()
    const next = event.shiftKey ? last : first
    next.focus()
  }
}

function AssistantDialog({ session, input, setInput, history, setHistory, onClose }) {
  const dialog = useRef(null)
  const [resetBusy, setResetBusy] = useState(false)
  const choice = useTermChoice(session)
  const term = choice.term
  const { selection } = useTimetableSelection(session, term)
  const scope = JSON.stringify([
    session.scope,
    term?.termId,
    term?.startDate,
    term?.endDate,
    term?.excludedDates,
    selection.date,
  ])
  useLayoutEffect(() => {
    const el = dialog.current
    el.showModal()
    el.querySelector('textarea')?.focus({ preventScroll: true })
    return () => el.close()
  }, [])

  function addMessage(text) {
    const id = crypto.randomUUID()
    setHistory((previous) => [...previous, { id, scope, text }])
    return id
  }
  function describeMessage(id, summary) {
    setHistory((previous) => previous.map((item) => (item.id === id ? { ...item, summary } : item)))
  }

  return (
    <dialog
      ref={dialog}
      className="ai-assistant-panel ai-chat-panel"
      aria-labelledby="ai-chat-title"
      onKeyDown={cycleDialogFocus}
      onCancel={(event) => {
        event.preventDefault()
        if (!resetBusy) onClose()
      }}
    >
      <header className="ai-chat-header">
        <h2 id="ai-chat-title">
          <span aria-hidden="true">✦</span> AI 도우미
        </h2>
        <button
          type="button"
          className="ai-chat-icon"
          disabled={resetBusy}
          onClick={onClose}
          aria-label="질문 닫기"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m6 6 12 12m0-12L6 18" />
          </svg>
        </button>
      </header>
      {session.access.queries.datedLessons &&
        (choice.list.isError ? (
          <p role="alert">
            업무 학기를 불러오지 못했습니다.{' '}
            <button type="button" onClick={() => choice.list.refetch()}>
              다시 조회
            </button>
          </p>
        ) : (
          term && (
            <div className="ai-chat-term">
              <label>
                업무 학기
                <select
                  value={term.termId}
                  disabled={resetBusy}
                  onChange={(event) => {
                    const next = choice.terms.find(
                      (item) => item.termId === Number(event.target.value),
                    )
                    if (next) choice.saveChoice(next)
                  }}
                >
                  {choice.terms.map((item) => (
                    <option key={item.termId} value={item.termId}>
                      {item.academicYear}학년도 {item.semester}학기
                    </option>
                  ))}
                </select>
              </label>
              <small>
                학기 기간 {term.startDate} ~ {term.endDate}
              </small>
            </div>
          )
        ))}
      <ScopedChat
        key={scope}
        boardDate={selection.date}
        {...{
          session,
          choice,
          scope,
          input,
          setInput,
          addMessage,
          describeMessage,
          setResetBusy,
        }}
        history={history}
      />
    </dialog>
  )
}

function ScopedChat({
  boardDate,
  session,
  choice,
  scope,
  input,
  setInput,
  history,
  addMessage,
  describeMessage,
  setResetBusy,
}) {
  const { term } = choice
  const [resetOpen, setResetOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [dates, setDates] = useState({})
  const recognitionRef = useRef(null)
  const lease = useRef(null)
  const reviewButton = useRef(null)
  const inputRef = useRef(null)
  const currentMessage = useRef(null)
  const preview = usePreviewVoiceCommand()
  const confirm = useConfirmVoiceCommand()
  const draft = preview.data
  const lessonCommand = LESSON_COMMANDS.includes(draft?.intentType)
  const guide = draft?.intentType === 'GUIDE'
  const lines = lessonCommand || guide ? [] : previewLines(draft?.preview)
  const submitting =
    preview.isPending ||
    confirm.isPending ||
    (session.access.queries.datedLessons && choice.list.isLoading)
  const active = history.find((item) => item.id === activeId)
  const context = {
    schoolId: session.scope.schoolId ?? undefined,
    termId: term?.termId,
  }
  useEffect(() => {
    const controller = new AbortController()
    lease.current = controller
    return () => {
      controller.abort()
      setResetBusy(false)
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.abort?.()
      }
    }
  }, [setResetBusy])
  useEffect(() => {
    currentMessage.current?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }
  function startListening() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Constructor) {
      setSpeechError('이 브라우저에서는 음성 입력을 쓸 수 없습니다. 텍스트로 입력해 주세요.')
      return
    }
    const recognition = new Constructor()
    setSpeechError('')
    recognition.lang = 'ko-KR'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) =>
      setInput(
        Array.from(event.results, (r) => r[0]?.transcript ?? '')
          .join('')
          .trim(),
      )
    recognition.onerror = () => {
      setListening(false)
      setSpeechError('음성을 듣지 못했습니다. 다시 말하거나 텍스트로 입력해 주세요.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }
  function sendText(text, selectedDates = dates) {
    const trimmed = text.trim()
    if (!trimmed || submitting || !lease.current || lease.current.signal.aborted) return
    stopListening()
    setSpeechError('')
    setInput('')
    if (trimmed === 'Algorhythm') {
      preview.reset()
      confirm.reset()
      setActiveId(null)
      setResetOpen(true)
      return
    }
    if (draft?.intentType === 'COVER_OPTIONS' && /선택한.*보결.*보내/.test(trimmed)) {
      if (reviewButton.current && !reviewButton.current.disabled) reviewButton.current.click()
      else setSpeechError('수업과 공강 교사를 선택하고 요청 내용을 확인하세요.')
      return
    }
    const id = addMessage(trimmed)
    setActiveId(id)
    confirm.reset()
    preview.mutate(
      {
        text: trimmed,
        lang: 'ko',
        ...context,
        requestDate: selectedDates.requestDate || undefined,
        targetDate: selectedDates.targetDate || undefined,
        signal: lease.current.signal,
      },
      {
        onSuccess: (reply) =>
          describeMessage(id, reply.description || VOICE_INTENT_LABEL[reply.intentType]),
      },
    )
  }
  function runConfirm() {
    if (
      !canConfirmVoicePreview(draft) ||
      confirm.isPending ||
      confirm.isSuccess ||
      lease.current?.signal.aborted
    )
      return
    confirm.mutate({
      draftToken: draft.draftToken,
      schoolId: preview.variables.schoolId,
      termId: preview.variables.termId,
      requestDate: preview.variables.requestDate,
      targetDate: preview.variables.targetDate,
      signal: lease.current.signal,
    })
  }
  return (
    <>
      <div className="ai-chat-scroll">
        <p className="ai-chat-intro">
          내 시간표를 확인하거나 보결·교환할 수업을 찾을 수 있어요. 날짜가 정해졌다면 질문에 함께
          적어 주세요.
        </p>
        {!resetOpen && (
          <details className="ai-chat-examples" open={history.length === 0 || undefined}>
            <summary>질문 예시</summary>
            <div className="ai-chat-chips">
              {EXAMPLES.map((example) => (
                <button
                  type="button"
                  key={example}
                  onClick={() => {
                    setInput(example)
                    inputRef.current?.focus()
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </details>
        )}
        {history.map((item) => (
          <div key={item.id} ref={item.id === activeId ? currentMessage : undefined}>
            <p className="ai-chat-bubble ai-chat-user">{item.text}</p>
            {item.id !== activeId && item.scope === scope && item.summary && (
              <p className="ai-chat-bubble">{item.summary}</p>
            )}
          </div>
        ))}
        {preview.isPending && (
          <p className="ai-chat-bubble" role="status">
            명령을 확인하고 있습니다.
          </p>
        )}
        {preview.isError && (
          <div className="ai-chat-bubble" role="alert">
            {getApiErrorMessage(preview.error, '명령을 확인하지 못했습니다.')}
            {active && (
              <button type="button" onClick={() => sendText(active.text)}>
                다시 시도
              </button>
            )}
            {active &&
              (dates.requestDate || dates.targetDate) &&
              [400, 422].includes(preview.error?.response?.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setDates({})
                    sendText(active.text, {})
                  }}
                >
                  선택 날짜를 지우고 다시 확인
                </button>
              )}
          </div>
        )}
        {draft && !preview.isPending && (
          <section className="ai-chat-bubble ai-chat-reply" aria-label="도우미 응답">
            <strong>{VOICE_INTENT_LABEL[draft.intentType] || '미리보기'}</strong>
            {draft.description && <p>{draft.description}</p>}
            {lines.length > 0 && (
              <p className="ai-chat-meta">
                {lines
                  .map((line) => (DETAIL_LABELS[line.key] ?? line.key) + ' ' + line.value)
                  .join(' · ')}
              </p>
            )}
            {lessonCommand ? (
              <LessonAssistant
                key={activeId}
                {...{ session, term, dates, setDates, reviewButton }}
                command={draft}
                originalDates={preview.variables}
                boardDate={boardDate}
              />
            ) : canConfirmVoicePreview(draft) && !confirm.isSuccess ? (
              <div className="ai-chat-actions">
                <button
                  type="button"
                  className="ai-chat-primary"
                  disabled={confirm.isPending}
                  onClick={runConfirm}
                >
                  {confirm.isPending ? '실행 중…' : '실행'}
                </button>
                <button type="button" disabled={confirm.isPending} onClick={() => preview.reset()}>
                  취소
                </button>
              </div>
            ) : (
              !guide && !confirm.isSuccess && <p>실행할 수 있는 명령이 아닙니다.</p>
            )}
          </section>
        )}
        {confirm.isError && (
          <div className="ai-chat-bubble" role="alert">
            {getApiErrorMessage(confirm.error, '명령을 실행하지 못했습니다.')}
            <button type="button" onClick={runConfirm}>
              다시 시도
            </button>
          </div>
        )}
        {confirm.isSuccess && (
          <p className="ai-chat-bubble" role="status">
            명령을 실행했습니다.
          </p>
        )}
        {speechError && (
          <p className="ai-chat-bubble" role="alert">
            {speechError}
          </p>
        )}
        {resetOpen && (
          <DemoResetForm
            onBusy={setResetBusy}
            onCancel={() => {
              setResetOpen(false)
              setInput('')
            }}
          />
        )}
      </div>
      {!resetOpen && (
        <form
          className="ai-chat-compose"
          onSubmit={(event) => {
            event.preventDefault()
            sendText(input)
          }}
        >
          <button
            type="button"
            className="ai-chat-icon"
            aria-pressed={listening}
            aria-label={listening ? '음성 입력 멈추기' : '음성으로 입력'}
            onClick={listening ? stopListening : startListening}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v3M8 21h8" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.nativeEvent.keyCode !== 229
              ) {
                event.preventDefault()
                sendText(input)
              }
            }}
            aria-label="도우미에 보낼 질문"
            placeholder="말로 하거나 명령을 입력하세요"
            rows={1}
          />
          <button
            className="ai-chat-icon ai-chat-primary"
            type="submit"
            aria-label="명령 보내기"
            disabled={submitting || !input.trim()}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 2 11 13M22 2 15 22 11 13 2 9z" />
            </svg>
          </button>
        </form>
      )}
    </>
  )
}
