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
  if (todo.todoType === 'HANDOVER') return isAdmin || todo.authorId === userId
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

export default function ScheduleTodoTab({ date }) {
  const [content, setContent] = useState('')
  const [todoType, setTodoType] = useState('PERSONAL')

  const { data: activeStore } = useActiveStore()
  const isAdmin = activeStore?.position === 'ADMIN'
  const { data: ownerProfile } = useOwnerProfile({ enabled: isAdmin })
  const { data: staffProfile } = useStaffProfile({
    enabled: Boolean(activeStore) && !isAdmin,
  })
  const userId = isAdmin ? ownerProfile?.userId : staffProfile?.userId

  const { data: todoData, isLoading, isError } = useTodos(date)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleTodo = useToggleTodo()

  const availableTypes = CREATE_TYPE_OPTIONS.filter((opt) => !opt.ownerOnly || isAdmin)

  const handleCreate = (e) => {
    e.preventDefault()
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <form
        onSubmit={handleCreate}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <select
          value={todoType}
          onChange={(e) => setTodoType(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-input)',
            fontSize: 13,
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
          }}
        >
          {availableTypes.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="할 일을 입력하세요"
          maxLength={500}
          style={{
            flex: 1,
            minWidth: 180,
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-input)',
            fontSize: 14,
            color: 'var(--color-text)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={createTodo.isPending || !content.trim()}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: createTodo.isPending || !content.trim() ? 'var(--color-border)' : 'var(--color-primary-button)',
            color: createTodo.isPending || !content.trim() ? 'var(--color-text-muted)' : 'var(--color-on-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: createTodo.isPending || !content.trim() ? 'default' : 'pointer',
          }}
        >
          {createTodo.isPending ? '추가 중...' : '추가'}
        </button>
      </form>

      {createTodo.isError && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>
          할 일 추가에 실패했습니다. 권한을 확인해 주세요.
        </p>
      )}

      {isLoading && <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>불러오는 중...</p>}
      {isError && (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-danger)' }}>
          할 일을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.
        </p>
      )}

      {!isLoading && !isError && todoData && (
        <>
          {TODO_SECTIONS.map(({ key, label }) => {
            const items = todoData[key] ?? []
            if (items.length === 0) return null
            return (
              <section key={key}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {label}
                </h3>
                <div>
                  {items.map((todo) => (
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
              </section>
            )
          })}

          {TODO_SECTIONS.every(({ key }) => (todoData[key] ?? []).length === 0) && (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
              오늘 할 일이 없습니다. 위에서 추가하세요.
            </p>
          )}
        </>
      )}
    </div>
  )
}
