// 할 일(Todo) API
import client from './client.js'

/**
 * 특정 날짜 할일 목록 조회 (GET /api/todos?date=YYYY-MM-DD).
 * @param {string} date "YYYY-MM-DD"
 * @returns {Promise<import('@/types/todo.js').TodoListResponseDto>}
 */
export async function getTodos(date) {
  const { data } = await client.get('/api/todos', { params: { date } })
  return data
}

/**
 * 할일 생성 (POST /api/todos).
 * @param {import('@/types/todo.js').TodoCreateRequestDto} payload
 * @returns {Promise<import('@/types/todo.js').TodoResponseDto>}
 */
export async function createTodo(payload) {
  const { data } = await client.post('/api/todos', payload)
  return data
}

/**
 * 할일 수정 (PUT /api/todos/{todoId}).
 * @param {number} todoId
 * @param {import('@/types/todo.js').TodoUpdateRequestDto} payload
 * @returns {Promise<import('@/types/todo.js').TodoResponseDto>}
 */
export async function updateTodo(todoId, payload) {
  const { data } = await client.put(`/api/todos/${todoId}`, payload)
  return data
}

/**
 * 할일 삭제 (DELETE /api/todos/{todoId}).
 * @param {number} todoId
 */
export async function deleteTodo(todoId) {
  await client.delete(`/api/todos/${todoId}`)
}

/**
 * 할일 완료 토글 (PATCH /api/todos/{todoId}/toggle).
 * @param {number} todoId
 * @returns {Promise<import('@/types/todo.js').TodoResponseDto>}
 */
export async function toggleTodo(todoId) {
  const { data } = await client.patch(`/api/todos/${todoId}/toggle`)
  return data
}
