import { useEffect, useRef, useState } from 'react'
import {
  useTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useToggleTodo,
  useActiveStore,
  useOwnerProfile,
  useStaffProfile,
  useNotifications,
  useSubstituteRequests,
  useRespondExtraShift,
  useApproveExtraShift,
} from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const TYPE_OPTIONS = [
  { value: 'PERSONAL', label: '내 할 일' },
  { value: 'HANDOVER', label: '인수인계' },
  { value: 'SCHOOL', label: '전체 공지', ownerOnly: true },
]

const TYPE_LABEL = {
  PERSONAL: '내 할 일',
  HANDOVER: '인수인계',
  SCHOOL: '전체 공지',
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function canModifyTodo(todo, isAdmin, userId) {
  if (todo.todoType === 'SCHOOL') return isAdmin
  if (isAdmin) return true
  if (userId == null) return todo.todoType !== 'SCHOOL'
  if (todo.todoType === 'HANDOVER') return todo.authorId === userId
  if (todo.todoType === 'PERSONAL') return todo.authorId === userId
  return false
}

function formatListDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!match) return ''
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
}

function formatShortDate(iso) {
  if (typeof iso !== 'string') return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return ''
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return ''
  return `${month}/${day}(${WEEKDAY[date.getDay()]})`
}

/** 할 일 응답에는 마감 시각·담당·연결 대상이 없다. 있는 값만 보조 줄에 쓴다. */
function todoMeta(todo) {
  const parts = []
  if (todo.authorName) parts.push(todo.authorName)
  if (todo.todoType && todo.todoType !== 'PERSONAL') {
    parts.push(TYPE_LABEL[todo.todoType] ?? todo.todoType)
  }
  return parts.join(' · ')
}

function visibleTodos(todoData, scope, userId) {
  if (!todoData) return []
  const personal = todoData.personalTodos ?? []
  const handover = todoData.handoverTodos ?? []
  const school = todoData.schoolTodos ?? []
  if (scope === 'all') return [...school, ...handover, ...personal]
  if (userId == null) return personal
  return [...personal, ...handover, ...school].filter((todo) => todo.authorId === userId)
}

function responseIdFor(request, notifications) {
  const match = (notifications ?? []).find(
    (item) => item.substituteRequestId === request.id && item.substituteResponseId,
  )
  return match?.substituteResponseId ?? null
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4L18.5 9.5a1.5 1.5 0 0 0-4-4L4 16v4z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" />
    </svg>
  )
}

export default function TodoPage({ date, userRole }) {
  const [content, setContent] = useState('')
  const [todoType, setTodoType] = useState('PERSONAL')
  const [composerOpen, setComposerOpen] = useState(false)
  const [scope, setScope] = useState('mine')
  const [completedOpen, setCompletedOpen] = useState(false)
  const [pendingDone, setPendingDone] = useState(() => new Set())
  const [pendingOpen, setPendingOpen] = useState(() => new Set())
  const [armed, setArmed] = useState(() => new Set())
  const [toast, setToast] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [menuFor, setMenuFor] = useState(null)
  const [rowFault, setRowFault] = useState(null)
  const formRef = useRef(null)
  const timers = useRef([])

  const { data: activeStore } = useActiveStore()
  const isAdmin = activeStore?.position === 'ADMIN' || userRole === 'admin'
  const position = activeStore?.position === 'ADMIN' || userRole === 'admin' ? 'ADMIN' : 'TEACHER'
  const { data: ownerProfile } = useOwnerProfile({ enabled: isAdmin })
  const { data: staffProfile } = useStaffProfile({
    enabled: Boolean(activeStore) && !isAdmin,
  })
  const userId = isAdmin ? ownerProfile?.userId : staffProfile?.userId
  const view = isAdmin && scope === 'all' ? 'all' : 'mine'

  const { data: todoData, isLoading, isError, refetch } = useTodos(date)
  const { data: notifications = [] } = useNotifications()
  const substitutes = useSubstituteRequests('OPEN')
  const respond = useRespondExtraShift()
  const approve = useApproveExtraShift()
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleTodo = useToggleTodo()

  const typeOptions = TYPE_OPTIONS.filter((option) => !option.ownerOnly || isAdmin)

  useEffect(() => () => {
    timers.current.forEach((entry) => window.clearTimeout(entry.timer))
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (menuFor == null) return undefined
    const close = (event) => {
      if (!event.target.closest?.('[data-todo-menu]')) setMenuFor(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuFor])

  const isCompleted = (todo) => {
    if (pendingOpen.has(todo.id)) return false
    if (pendingDone.has(todo.id)) return true
    return Boolean(todo.completed)
  }

  const items = visibleTodos(todoData, view, userId)
  const openItems = items.filter((todo) => !isCompleted(todo))
  const doneItems = items.filter((todo) => isCompleted(todo))

  const actionRows = (substitutes.data ?? []).map((item) => ({
    ...item,
    responseId: position === 'ADMIN' ? responseIdFor(item, notifications) : null,
  }))

  const showSkeleton = !isError && (isLoading || (substitutes.isLoading && !todoData))
  const listFailed = isError

  const submitCreate = () => {
    const trimmed = content.trim()
    if (!trimmed || createTodo.isPending) return
    createTodo.mutate(
      { date, todoType: isAdmin ? todoType : 'PERSONAL', content: trimmed },
      {
        onSuccess: () => {
          setContent('')
          setComposerOpen(false)
        },
      },
    )
  }

  const clearHold = (todoId) => {
    const timer = timers.current.find((entry) => entry.id === todoId)
    if (!timer) return
    window.clearTimeout(timer.timer)
    timers.current = timers.current.filter((entry) => entry.id !== todoId)
  }

  const onCheck = (todo) => {
    setRowFault(null)
    const movingToDone = !isCompleted(todo)
    if (movingToDone) {
      setPendingDone((prev) => {
        const next = new Set(prev)
        next.delete(todo.id)
        return next
      })
      setPendingOpen((prev) => new Set(prev).add(todo.id))
      setArmed((prev) => new Set(prev).add(todo.id))
      clearHold(todo.id)
      const timer = window.setTimeout(() => {
        setPendingOpen((prev) => {
          const next = new Set(prev)
          next.delete(todo.id)
          return next
        })
        setArmed((prev) => {
          const next = new Set(prev)
          next.delete(todo.id)
          return next
        })
        setPendingDone((prev) => new Set(prev).add(todo.id))
        setToast({ id: todo.id })
      }, 150)
      timers.current.push({ id: todo.id, timer })
    } else {
      clearHold(todo.id)
      setPendingDone((prev) => {
        const next = new Set(prev)
        next.delete(todo.id)
        return next
      })
      setPendingOpen((prev) => new Set(prev).add(todo.id))
      setArmed((prev) => {
        const next = new Set(prev)
        next.delete(todo.id)
        return next
      })
      setToast((current) => (current?.id === todo.id ? null : current))
    }
    toggleTodo.mutate(todo.id, {
      onError: (error) => {
        clearHold(todo.id)
        setPendingDone((prev) => {
          const next = new Set(prev)
          next.delete(todo.id)
          return next
        })
        setPendingOpen((prev) => {
          const next = new Set(prev)
          next.delete(todo.id)
          return next
        })
        setArmed((prev) => {
          const next = new Set(prev)
          next.delete(todo.id)
          return next
        })
        setToast((current) => (current?.id === todo.id ? null : current))
        setRowFault({
          id: todo.id,
          message: getApiErrorMessage(error, '바꾸지 못했습니다.'),
          retry: () => onCheck(todo),
        })
      },
    })
  }

  const undoById = (id) => {
    setToast((current) => (current?.id === id ? null : current))
    setPendingDone((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setPendingOpen((prev) => new Set(prev).add(id))
    toggleTodo.mutate(id, {
      onError: (error) => {
        setPendingOpen((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        setPendingDone((prev) => new Set(prev).add(id))
        setRowFault({
          id,
          message: getApiErrorMessage(error, '실행 취소에 실패했습니다.'),
          retry: () => undoById(id),
        })
      },
    })
  }

  const undoComplete = () => {
    if (!toast) return
    undoById(toast.id)
  }

  const startEdit = (todo) => {
    setMenuFor(null)
    setEditingId(todo.id)
    setEditValue(todo.content ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = (todo) => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === todo.content) {
      cancelEdit()
      return
    }
    updateTodo.mutate(
      { todoId: todo.id, payload: { content: trimmed } },
      {
        onSuccess: () => cancelEdit(),
        onError: (error) => {
          setRowFault({
            id: todo.id,
            message: getApiErrorMessage(error, '바꾸지 못했습니다.'),
            retry: () => saveEdit(todo),
          })
        },
      },
    )
  }

  const jumpTo = (id) => {
    if (id === 'todo-group-done') setCompletedOpen(true)
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const removeTodo = (todo) => {
    setMenuFor(null)
    deleteTodo.mutate(todo.id, {
      onError: (error) => {
        setRowFault({
          id: todo.id,
          message: getApiErrorMessage(error, '삭제하지 못했습니다.'),
          retry: () => removeTodo(todo),
        })
      },
    })
  }

  return (
    <div className="todo-page">
      <h1 className="sr-only">할 일</h1>
      <div className="home-title-row">
        <p className="todo-date">{formatListDate(date)}</p>
        {isAdmin && (
          <div className="todo-scope" role="group" aria-label="할 일 범위">
            <button type="button" aria-pressed={view === 'mine'} onClick={() => setScope('mine')}>
              내 할 일
            </button>
            <button type="button" aria-pressed={view === 'all'} onClick={() => setScope('all')}>
              전체
            </button>
          </div>
        )}
      </div>
      <TodoStats
        loading={showSkeleton}
        failed={listFailed}
        need={substitutes.isSuccess ? actionRows.length : null}
        open={todoData && !listFailed ? openItems.length : null}
        done={todoData && !listFailed ? doneItems.length : null}
        onJump={jumpTo}
      />

      <form
        ref={formRef}
        className={listFailed ? 'todo-compose is-off' : 'todo-compose'}
        onSubmit={(event) => {
          event.preventDefault()
          if (!listFailed) submitCreate()
        }}
      >
        <div className="todo-compose-line">
          <span className="todo-plus"><PlusIcon /></span>
          <input
            type="text"
            value={content}
            disabled={listFailed}
            maxLength={500}
            placeholder="할 일 추가"
            aria-label="할 일 추가"
            onChange={(event) => setContent(event.target.value)}
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
          <button type="submit" className="todo-add-mobile" disabled={listFailed || createTodo.isPending || !content.trim()}>
            추가
          </button>
        </div>
        {composerOpen && isAdmin && !listFailed && (
          <div className="todo-compose-options">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={todoType === option.value}
                onClick={() => setTodoType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </form>
      {createTodo.isError && (
        <p className="todo-row-error">
          {getApiErrorMessage(createTodo.error, '추가하지 못했습니다.')}{' '}
          <button type="button" className="todo-retry" onClick={submitCreate}>다시 시도</button>
        </p>
      )}

      {showSkeleton && (
        <div className="todo-groups" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="todo-skeleton-row">
              <span className="home-skeleton todo-skeleton-check" />
              <span className="todo-skeleton-lines">
                <span className="home-skeleton" style={{ width: '46%' }} />
                <span className="home-skeleton" style={{ width: '28%' }} />
              </span>
            </div>
          ))}
        </div>
      )}

      {listFailed && (
        <div className="home-load-error">
          <span className="home-error-mark" aria-hidden="true">!</span>
          <span>불러오지 못했어요</span>
          <button
            type="button"
            className="home-text-button home-accent"
            onClick={() => {
              refetch()
              substitutes.refetch()
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {!showSkeleton && !listFailed && (
        <div className="todo-groups">
          {substitutes.isError && (
            <div className="home-load-error">
              <span className="home-error-mark" aria-hidden="true">!</span>
              <span>불러오지 못했어요</span>
              <button type="button" className="home-text-button home-accent" onClick={() => substitutes.refetch()}>
                다시 시도
              </button>
            </div>
          )}

          {substitutes.isSuccess && actionRows.length > 0 && (
            <section id="todo-group-need">
              <h2 className="todo-group-title">처리 필요 {actionRows.length}건</h2>
              {actionRows.map((item) => {
                const title = item.note?.trim() || '보결 요청'
                const meta = [
                  formatShortDate(item.substituteDate),
                  item.periodNumber != null ? `${item.periodNumber}교시` : '',
                ].filter(Boolean).join(' ')
                const fault = rowFault?.id === `sub-${item.id}` ? rowFault : null
                const run = (action) => {
                  setRowFault(null)
                  const mutation = position === 'ADMIN'
                    ? () => approve.mutate(
                      { responseId: item.responseId, payload: { action } },
                      { onError: (error) => setRowFault({ id: `sub-${item.id}`, message: getApiErrorMessage(error, '처리하지 못했습니다.'), retry: () => run(action) }) },
                    )
                    : () => respond.mutate(
                      { requestId: item.id, payload: { action } },
                      { onError: (error) => setRowFault({ id: `sub-${item.id}`, message: getApiErrorMessage(error, '처리하지 못했습니다.'), retry: () => run(action) }) },
                    )
                  mutation()
                }
                return (
                  <div key={item.id}>
                    <div className="todo-row">
                      <div className="todo-row-main">
                        <p className="todo-row-title is-static">{title}</p>
                        <p className="todo-row-meta">
                          {meta && <span>{meta}</span>}
                          <span className="day-badge day-badge-now">보결</span>
                        </p>
                        {position === 'ADMIN' && item.responseId == null && (
                          <p className="todo-row-meta">승인에 필요한 응답 번호가 알림에 없습니다.</p>
                        )}
                      </div>
                      {position === 'TEACHER' && (
                        <div className="todo-inline-actions">
                          <button type="button" className="is-primary" disabled={respond.isPending} onClick={() => run('ACCEPT')}>수락</button>
                          <button type="button" className="is-secondary" disabled={respond.isPending} onClick={() => run('REJECT')}>거절</button>
                        </div>
                      )}
                      {position === 'ADMIN' && item.responseId != null && (
                        <div className="todo-inline-actions">
                          <button type="button" className="is-primary" disabled={approve.isPending} onClick={() => run('APPROVE')}>승인</button>
                          <button type="button" className="is-secondary" disabled={approve.isPending} onClick={() => run('REJECT')}>거절</button>
                        </div>
                      )}
                    </div>
                    {fault && (
                      <p className="todo-row-error">
                        {fault.message}{' '}
                        <button type="button" className="todo-retry" onClick={fault.retry}>다시 시도</button>
                      </p>
                    )}
                  </div>
                )
              })}
            </section>
          )}

          {openItems.length > 0 && (
            <section id="todo-group-open">
              <h2 className="todo-group-title">내 할 일 {openItems.length}건</h2>
              {openItems.map((todo) => (
                <TodoLine
                  key={todo.id}
                  todo={todo}
                  done={false}
                  checked={armed.has(todo.id) || isCompleted(todo)}
                  canModify={canModifyTodo(todo, isAdmin, userId)}
                  editing={editingId === todo.id}
                  editValue={editValue}
                  menuOpen={menuFor === todo.id}
                  fault={rowFault?.id === todo.id ? rowFault : null}
                  onCheck={() => onCheck(todo)}
                  onStartEdit={() => startEdit(todo)}
                  onEditChange={setEditValue}
                  onSave={() => saveEdit(todo)}
                  onCancelEdit={cancelEdit}
                  onDelete={() => removeTodo(todo)}
                  onToggleMenu={() => setMenuFor((current) => (current === todo.id ? null : todo.id))}
                />
              ))}
            </section>
          )}

          {openItems.length === 0 && actionRows.length === 0 && substitutes.isSuccess && (
            <p className="todo-empty">할 일이 없습니다</p>
          )}

          {doneItems.length > 0 && (
            <section id="todo-group-done">
              <button
                type="button"
                className="todo-group-toggle"
                aria-expanded={completedOpen}
                onClick={() => setCompletedOpen((open) => !open)}
              >
                완료 {doneItems.length}건 {completedOpen ? '▾' : '▸'}
              </button>
              {completedOpen && doneItems.map((todo) => (
                <TodoLine
                  key={todo.id}
                  todo={todo}
                  done
                  checked
                  canModify={canModifyTodo(todo, isAdmin, userId)}
                  editing={editingId === todo.id}
                  editValue={editValue}
                  menuOpen={menuFor === todo.id}
                  fault={rowFault?.id === todo.id ? rowFault : null}
                  onCheck={() => onCheck(todo)}
                  onStartEdit={() => startEdit(todo)}
                  onEditChange={setEditValue}
                  onSave={() => saveEdit(todo)}
                  onCancelEdit={cancelEdit}
                  onDelete={() => removeTodo(todo)}
                  onToggleMenu={() => setMenuFor((current) => (current === todo.id ? null : todo.id))}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {toast && (
        <div className="todo-toast" role="status">
          <span>완료로 옮겼습니다</span>
          <button type="button" onClick={undoComplete}>실행 취소</button>
        </div>
      )}
    </div>
  )
}

function TodoStats({ loading, failed, need, open, done, onJump }) {
  const cells = [
    ['todo-group-need', '처리 필요', need],
    ['todo-group-open', '할 일', open],
    ['todo-group-done', '완료', done],
  ]
  return (
    <div className="home-stats todo-stats" aria-label="오늘 요약">
      {cells.map(([id, label, value], index) => {
        const known = !loading && !failed && value != null
        return (
          <div key={id} className="home-stat-cell">
            {index > 0 && <span className="home-stat-rule" aria-hidden="true" />}
            <button
              type="button"
              className="home-stat todo-stat"
              data-live={known && value > 0 ? 'true' : 'false'}
              onClick={() => {
                if (known && value > 0) onJump(id)
              }}
            >
              <span className="home-stat-label">{label}</span>
              <span className="home-stat-value-row">
                {loading ? (
                  <span className="home-skeleton todo-stat-skeleton" />
                ) : (
                  <>
                    <span className="home-stat-value">{known ? value : '—'}</span>
                    {known && <span className="home-stat-unit">건</span>}
                  </>
                )}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function TodoLine({
  todo,
  done,
  checked,
  canModify,
  editing,
  editValue,
  menuOpen,
  fault,
  onCheck,
  onStartEdit,
  onEditChange,
  onSave,
  onCancelEdit,
  onDelete,
  onToggleMenu,
}) {
  const meta = todoMeta(todo)
  return (
    <div>
      <div className={done ? 'todo-row is-done' : 'todo-row'} data-todo-menu={menuOpen ? '' : undefined}>
        <input
          type="checkbox"
          className="todo-check"
          checked={checked}
          disabled={!canModify}
          aria-label={`${todo.content} 완료`}
          onChange={onCheck}
        />
        <div className="todo-row-main">
          {editing ? (
            <input
              className="todo-edit-input"
              value={editValue}
              autoFocus
              aria-label="할 일 수정"
              onChange={(event) => onEditChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onSave()
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  onCancelEdit()
                }
              }}
            />
          ) : canModify ? (
            <button type="button" className="todo-row-title" onClick={onStartEdit}>
              {todo.content}
            </button>
          ) : (
            <p className="todo-row-title is-static">{todo.content}</p>
          )}
          {meta && <p className="todo-row-meta">{meta}</p>}
        </div>
        {canModify && (
          <div className="todo-row-actions">
            <button type="button" className="todo-icon-btn" aria-label="수정" onClick={onStartEdit}>
              <PencilIcon />
            </button>
            <button type="button" className="todo-icon-btn" aria-label="삭제" onClick={onDelete}>
              <TrashIcon />
            </button>
          </div>
        )}
        {canModify && (
          <div className="todo-more" data-todo-menu="">
            <button type="button" className="todo-icon-btn" aria-label="더 보기" aria-expanded={menuOpen} onClick={onToggleMenu}>
              ⋯
            </button>
            {menuOpen && (
              <div className="todo-more-menu" role="menu">
                <button type="button" role="menuitem" onClick={onStartEdit}>수정</button>
                <button type="button" role="menuitem" onClick={onDelete}>삭제</button>
              </div>
            )}
          </div>
        )}
      </div>
      {fault && (
        <p className="todo-row-error">
          {fault.message}{' '}
          <button type="button" className="todo-retry" onClick={fault.retry}>다시 시도</button>
        </p>
      )}
    </div>
  )
}
