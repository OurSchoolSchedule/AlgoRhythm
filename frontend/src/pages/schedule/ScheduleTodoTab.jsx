import { useState } from 'react'
import {
  useTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useToggleTodo,
  useActiveStore,
  useOwnerProfile,
  useStaffProfile,
} from '@/hooks'
import TodoCompose from '@/components/schedule/TodoCompose.jsx'
import TodoPage from '@/pages/schedule/TodoPage.jsx'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const TODO_SECTIONS = [
  { key: 'schoolTodos', label: '전체 공지', type: 'SCHOOL' },
  { key: 'handoverTodos', label: '인수인계', type: 'HANDOVER' },
  { key: 'personalTodos', label: '내 할 일', type: 'PERSONAL' },
]

const CREATE_TYPE_OPTIONS = [
  { value: 'PERSONAL', label: '내 할 일' },
  { value: 'HANDOVER', label: '인수인계' },
  { value: 'SCHOOL', label: '전체 공지', ownerOnly: true },
]

function canModifyTodo(todo, isAdmin, userId) {
  if (todo.todoType === 'SCHOOL') return isAdmin
  if (isAdmin) return true
  if (userId == null) return todo.todoType !== 'SCHOOL'
  if (todo.todoType === 'HANDOVER') return todo.authorId === userId
  if (todo.todoType === 'PERSONAL') return todo.authorId === userId
  return false
}

function TodoRow({ todo, isAdmin, userId, toggleTodo, updateTodo, deleteTodo }) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(todo.content)
  const canModify = canModifyTodo(todo, isAdmin, userId)
  const isBusy = toggleTodo.isPending || updateTodo.isPending || deleteTodo.isPending

  const saveEdit = () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === todo.content) {
      setEditing(false)
      setEditContent(todo.content)
      return
    }
    updateTodo.mutate(
      { todoId: todo.id, payload: { content: trimmed } },
      { onSuccess: () => setEditing(false) },
    )
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditContent(todo.content)
  }

  const handleDelete = () => {
    if (!window.confirm('이 할 일을 삭제할까요?')) return
    deleteTodo.mutate(todo.id)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 4px',
        borderBottom: '1px solid var(--color-border-light)',
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(todo.completed)}
        disabled={isBusy || !canModify}
        onChange={() => toggleTodo.mutate(todo.id)}
        style={{ accentColor: 'var(--color-primary)', width: 16, height: 16, flexShrink: 0 }}
      />

      {editing ? (
        <input
          type="text"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          maxLength={500}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit()
            if (e.key === 'Escape') cancelEdit()
          }}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--color-border-input)',
            fontSize: 14,
            color: 'var(--color-text)',
            outline: 'none',
          }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 14,
              color: todo.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
              textDecoration: todo.completed ? 'line-through' : 'none',
              wordBreak: 'break-word',
            }}
          >
            {todo.content}
          </span>
          {todo.authorName && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{todo.authorName}</span>
          )}
        </div>
      )}

      {canModify && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {editing ? (
            <>
              <button
                type="button"
                disabled={isBusy || !editContent.trim()}
                onClick={saveEdit}
                style={actionBtnStyle('var(--color-primary)')}
              >
                저장
              </button>
              <button type="button" disabled={isBusy} onClick={cancelEdit} style={actionBtnStyle('var(--color-text-muted)')}>
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setEditing(true)}
                style={actionBtnStyle('var(--color-text-muted)')}
              >
                수정
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleDelete}
                style={actionBtnStyle('var(--color-danger)')}
              >
                삭제
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function actionBtnStyle(color) {
  return {
    padding: '5px 10px',
    borderRadius: 6,
    border: `1px solid ${color}`,
    background: 'var(--color-surface)',
    color,
    fontSize: 12,
    cursor: 'pointer',
  }
}

function TodoEmbed({ date, userRole }) {
  const [content, setContent] = useState('')
  const [todoType, setTodoType] = useState('PERSONAL')

  const { data: activeStore } = useActiveStore()
  const isAdmin = activeStore?.position === 'ADMIN' || userRole === 'admin'
  const { data: ownerProfile } = useOwnerProfile({ enabled: isAdmin })
  const { data: staffProfile } = useStaffProfile({
    enabled: Boolean(activeStore) && !isAdmin,
  })
  const userId = isAdmin ? ownerProfile?.userId : staffProfile?.userId

  const { data: todoData, isLoading, isError, refetch } = useTodos(date)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleTodo = useToggleTodo()

  const availableTypes = CREATE_TYPE_OPTIONS.filter((opt) => !opt.ownerOnly || isAdmin)
  const previewItems = TODO_SECTIONS.flatMap(({ key }) => todoData?.[key] ?? []).slice(0, 3)

  const submitCreate = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    createTodo.mutate(
      { date, todoType, content: trimmed },
      {
        onSuccess: () => {
          setContent('')
          setTodoType('PERSONAL')
        },
      },
    )
  }

  return (
    <div className="home-todo-embed">
      <TodoCompose
        content={content}
        onContentChange={setContent}
        todoType={todoType}
        onTodoTypeChange={setTodoType}
        typeOptions={availableTypes}
        showTypeOptions={isAdmin}
        disabled={isError}
        pending={createTodo.isPending}
        error={createTodo.isError}
        errorMessage={getApiErrorMessage(createTodo.error, '추가하지 못했어요.')}
        onSubmit={submitCreate}
        onRetry={submitCreate}
      />

      {(updateTodo.isError || deleteTodo.isError || toggleTodo.isError) && (
        <p className="todo-row-error">
          할 일을 바꾸지 못했어요.{' '}
          <button
            type="button"
            className="todo-retry"
            onClick={() => {
              updateTodo.reset()
              deleteTodo.reset()
              toggleTodo.reset()
            }}
          >
            다시 시도
          </button>
        </p>
      )}

      {isLoading && (
        <div className="home-skeleton-list" aria-hidden="true">
          <span className="home-skeleton" style={{ width: '100%', height: 44 }} />
          <span className="home-skeleton" style={{ width: '100%', height: 44 }} />
        </div>
      )}
      {isError && (
        <p className="todo-row-error">
          할 일을 불러오지 못했어요.{' '}
          <button type="button" className="todo-retry" onClick={() => refetch()}>다시 시도</button>
        </p>
      )}

      {!isLoading && !isError && todoData && previewItems.length === 0 && (
        <p className="home-empty">오늘 할 일이 없습니다</p>
      )}

      {!isLoading && !isError && previewItems.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          isAdmin={isAdmin}
          userId={userId}
          toggleTodo={toggleTodo}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
        />
      ))}
    </div>
  )
}

export default function ScheduleTodoTab({ embedded = false, date, userRole }) {
  if (embedded) return <TodoEmbed date={date} userRole={userRole} />
  return <TodoPage date={date} userRole={userRole} />
}
