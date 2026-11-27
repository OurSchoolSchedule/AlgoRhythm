export function canModifyTodo(todo, isAdmin, userId) {
  const isAuthor = userId != null && todo.authorId === userId
  if (todo.todoType === 'SCHOOL') return isAdmin
  if (todo.todoType === 'HANDOVER') return isAuthor || isAdmin
  return todo.todoType === 'PERSONAL' && isAuthor
}

export function visibleTodos(data, scope, userId) {
  if (!data) return []
  const personal = data.personalTodos ?? []
  const shared = [...(data.schoolTodos ?? []), ...(data.handoverTodos ?? [])]
  if (scope === 'all') return [...shared, ...personal]
  return [...personal, ...shared.filter((todo) => userId != null && todo.authorId === userId)]
}
