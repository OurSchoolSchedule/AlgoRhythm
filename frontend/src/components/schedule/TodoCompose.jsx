import { useRef, useState } from 'react'

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/**
 * 할 일 한 줄 입력(+ 할 일 추가). 홈 임베드와 할 일 페이지가 같이 쓴다.
 */
export default function TodoCompose({
  content,
  onContentChange,
  todoType,
  onTodoTypeChange,
  typeOptions = [],
  showTypeOptions = false,
  disabled = false,
  pending = false,
  error = null,
  errorMessage = '추가하지 못했어요.',
  onSubmit,
  onRetry,
}) {
  const formRef = useRef(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const canSubmit = !disabled && !pending && Boolean(content.trim())

  return (
    <>
      <form
        ref={formRef}
        className={disabled ? 'todo-compose is-off' : 'todo-compose'}
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onSubmit?.()
        }}
      >
        <div className="todo-compose-line">
          <span className="todo-plus"><PlusIcon /></span>
          <input
            type="text"
            value={content}
            disabled={disabled}
            maxLength={500}
            placeholder="할 일 추가"
            aria-label="할 일 추가"
            onChange={(event) => onContentChange?.(event.target.value)}
            onFocus={() => setComposerOpen(true)}
            onBlur={(event) => {
              const next = event.relatedTarget
              if (next && formRef.current?.contains(next)) return
              setComposerOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setComposerOpen(false)
                event.currentTarget.blur()
              }
            }}
          />
          <button type="submit" className="todo-add-mobile" disabled={!canSubmit}>
            추가
          </button>
        </div>
        {composerOpen && showTypeOptions && !disabled && typeOptions.length > 0 && (
          <div className="todo-compose-options">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={todoType === option.value}
                onClick={() => onTodoTypeChange?.(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </form>
      {error && (
        <p className="todo-row-error">
          {errorMessage}{' '}
          <button type="button" className="todo-retry" onClick={onRetry}>다시 시도</button>
        </p>
      )}
    </>
  )
}
