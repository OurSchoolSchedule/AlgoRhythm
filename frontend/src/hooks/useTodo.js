import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
} from '@/api'
import { queryKeys } from './queryKeys.js'

/**
 * @param {string} date "YYYY-MM-DD"
 */
export function useTodos(date, options = {}) {
  return useQuery({
    queryKey: queryKeys.todo.byDate(date),
    queryFn: () => getTodos(date),
    enabled: Boolean(date),
    ...options,
  })
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
