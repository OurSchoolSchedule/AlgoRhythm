import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
} from '@/api'
import { useHomeSession, useScopedRead } from './useHomeSession'
import { queryKeys } from './queryKeys.js'

/**
 * @param {string} date "YYYY-MM-DD"
 */
export function useTodos(date, options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.todo.byDate(date), Boolean(date) && (session.access.queries.adminProfile || session.access.queries.teacherProfile),
    signal => getTodos(date, { signal }), options)
}

function useInvalidateTodos() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['todo'] })
}

export function useCreateTodo() {
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: (payload) => createTodo(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTodo() {
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: ({ todoId, payload }) => updateTodo(todoId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteTodo() {
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: (todoId) => deleteTodo(todoId),
    onSuccess: invalidate,
  })
}

export function useToggleTodo() {
  const invalidate = useInvalidateTodos()
  return useMutation({
    mutationFn: (todoId) => toggleTodo(todoId),
    onSuccess: invalidate,
  })
}
