/**
 * 할 일(Todo) 타입.
 */

/** @typedef {'STORE'|'HANDOVER'|'PERSONAL'} TodoType */

/**
 * @typedef {Object} TodoResponseDto
 * @property {number} id
 * @property {string} date "YYYY-MM-DD"
 * @property {TodoType} todoType
 * @property {string} content
 * @property {boolean} completed
 * @property {number} authorId
 * @property {string} authorName
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * 날짜별 할일 목록 (GET /api/todos?date=).
 * @typedef {Object} TodoListResponseDto
 * @property {string} date
 * @property {TodoResponseDto[]} storeTodos 매장 전체 할일
 * @property {TodoResponseDto[]} handoverTodos 인수인계
 * @property {TodoResponseDto[]} personalTodos 내 할일
 */

/**
 * 할일 생성 요청 (POST /api/todos).
 * @typedef {Object} TodoCreateRequestDto
 * @property {string} date "YYYY-MM-DD"
 * @property {TodoType} todoType
 * @property {string} content 1~500자
 */

/**
 * 할일 수정 요청 (PUT /api/todos/{todoId}).
 * @typedef {Object} TodoUpdateRequestDto
 * @property {string} [content] 최대 500자
 * @property {boolean} [completed]
 */

export {}
