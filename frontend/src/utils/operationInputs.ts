import { isAxiosError } from 'axios'

export function operationError(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) return '이 업무를 수행할 권한이 없습니다.'
    return (
      error.response?.data?.message ||
      (error.response
        ? `요청 실패 (HTTP ${error.response.status})`
        : '서버 응답을 받지 못했습니다.')
    )
  }
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}
