import { expect, it } from 'vitest'
import { canModifyTodo, visibleTodos } from './todoAccess'

const school = { todoType: 'SCHOOL', authorId: 1 }
const handover = { todoType: 'HANDOVER', authorId: 2 }
const personal = { todoType: 'PERSONAL', authorId: 3 }
const todoData = { schoolTodos: [school], handoverTodos: [handover], personalTodos: [personal] }

it('교사는 공유 공지와 인수인계를 열람하고 내가 작성한 항목을 필터링한다', () => {
  expect(visibleTodos(todoData, 'all', 3)).toEqual([school, handover, personal])
  expect(visibleTodos(todoData, 'mine', 3)).toEqual([personal])
  expect(visibleTodos({ ...todoData, personalTodos: [] }, 'mine', 2)).toEqual([handover])
})
it('작성자·관리자 권한이 확인된 행에만 완료와 수정·삭제를 표시한다', () => {
  expect(canModifyTodo(school, false, 1)).toBe(false)
  expect(canModifyTodo(school, true, 3)).toBe(true)
  expect(canModifyTodo(handover, false, undefined)).toBe(false)
  expect(canModifyTodo(handover, false, 3)).toBe(false)
  expect(canModifyTodo(handover, false, 2)).toBe(true)
  expect(canModifyTodo(handover, true, 3)).toBe(true)
  expect(canModifyTodo(personal, true, 2)).toBe(false)
  expect(canModifyTodo(personal, false, 3)).toBe(true)
})
