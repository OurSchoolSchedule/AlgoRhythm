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
  { key: 'storeTodos', label: '전체 공지', type: 'STORE' },
  { key: 'handoverTodos', label: '인수인계', type: 'HANDOVER' },
  { key: 'personalTodos', label: '내 할 일', type: 'PERSONAL' },
]

const CREATE_TYPE_OPTIONS = [
  { value: 'PERSONAL', label: '내 할 일' },
  { value: 'HANDOVER', label: '인수인계' },
  { value: 'STORE', label: '전체 공지', ownerOnly: true },
]

function canModifyTodo(todo, isOwner, userId) {
  if (todo.todoType === 'STORE') return isOwner
  if (todo.todoType === 'HANDOVER') return isOwner || todo.authorId === userId
  if (todo.todoType === 'PERSONAL') return todo.authorId === userId
  return false
}

function TodoRow({ todo, isOwner, userId, toggleTodo, updateTodo, deleteTodo }) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(todo.content)
  const canModify = canModifyTodo(todo, isOwner, userId)
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
        borderBottom: '0.5px solid #f1efe8',
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(todo.completed)}
        disabled={isBusy || !canModify}
        onChange={() => toggleTodo.mutate(todo.id)}
        style={{ accentColor: '#27a859', width: 16, height: 16, flexShrink: 0 }}
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
            border: '0.5px solid #d3d1c7',
            fontSize: 14,
            color: '#2c2c2a',
            outline: 'none',
          }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 14,
              color: todo.completed ? '#b4b2a9' : '#2c2c2a',
              textDecoration: todo.completed ? 'line-through' : 'none',
              wordBreak: 'break-word',
            }}
          >
            {todo.content}
          </span>
          {todo.authorName && (
            <span style={{ fontSize: 11, color: '#b4b2a9' }}>{todo.authorName}</span>
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
                style={actionBtnStyle('#27a859')}
              >
                저장
              </button>
              <button type="button" disabled={isBusy} onClick={cancelEdit} style={actionBtnStyle('#888')}>
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setEditing(true)}
                style={actionBtnStyle('#888')}
              >
                수정
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleDelete}
                style={actionBtnStyle('#d85a30')}
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
    border: `0.5px solid ${color}`,
    background: '#fff',
    color,
    fontSize: 12,
    cursor: 'pointer',
  }
}

export default function ScheduleTodoTab({ date }) {
  const [content, setContent] = useState('')
  const [todoType, setTodoType] = useState('PERSONAL')

  const { data: activeStore } = useActiveStore()
  const isOwner = activeStore?.position === 'OWNER'
  const { data: ownerProfile } = useOwnerProfile({ enabled: isOwner })
  const { data: staffProfile } = useStaffProfile({
    enabled: Boolean(activeStore) && !isOwner,
  })
  const userId = isOwner ? ownerProfile?.userId : staffProfile?.userId

  const { data: todoData, isLoading, isError } = useTodos(date)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleTodo = useToggleTodo()

  const availableTypes = CREATE_TYPE_OPTIONS.filter((opt) => !opt.ownerOnly || isOwner)

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
          gap: 10,
          padding: '16px',
          borderRadius: 10,
          background: '#f8f8f6',
          border: '0.5px solid #eceae4',
        }}
      >
        <select
          value={todoType}
          onChange={(e) => setTodoType(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '0.5px solid #d3d1c7',
            fontSize: 13,
            color: '#2c2c2a',
            background: '#fff',
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
            border: '0.5px solid #d3d1c7',
            fontSize: 14,
            color: '#2c2c2a',
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
            background: createTodo.isPending || !content.trim() ? '#bfe3cd' : '#27a859',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: createTodo.isPending || !content.trim() ? 'default' : 'pointer',
          }}
        >
          {createTodo.isPending ? '추가 중...' : '추가'}
        </button>
      </form>

      {createTodo.isError && (
        <p style={{ margin: 0, fontSize: 13, color: '#d85a30' }}>
          할 일 추가에 실패했습니다. 권한을 확인해 주세요.
        </p>
      )}

      {isLoading && <p style={{ margin: 0, fontSize: 14, color: '#888' }}>불러오는 중...</p>}
      {isError && (
        <p style={{ margin: 0, fontSize: 14, color: '#d85a30' }}>
          할 일을 불러오지 못했습니다.
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
                    color: '#888',
                  }}
                >
                  {label}
                </h3>
                <div>
                  {items.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      isOwner={isOwner}
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
            <p style={{ margin: 0, fontSize: 14, color: '#b4b2a9' }}>
              오늘 등록된 할 일이 없습니다. 위에서 추가해 보세요.
            </p>
          )}
        </>
      )}
    </div>
  )
}
