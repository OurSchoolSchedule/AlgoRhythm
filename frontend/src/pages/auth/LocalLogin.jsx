import { useDevToken } from '@/hooks/useAuth'
import { clearPreviewUserRole, clearTokens, saveDevLoginTokens, setPreviewUserRole } from '@/api'
import { getApiErrorMessage } from '@/utils/timetableGeneration'

export default function LocalLogin({ email, onSuccess }) {
  const issue = useDevToken()
  function preview(role) {
    clearTokens()
    setPreviewUserRole(role)
    onSuccess()
  }
  function login() {
    issue.mutate(email.trim(), {
      onSuccess: (token) => {
        clearPreviewUserRole()
        saveDevLoginTokens(token)
        onSuccess()
      },
    })
  }
  return (
    <details className="entry-local">
      <summary>로컬 개발 도구</summary>
      <button type="button" disabled={!email.trim() || issue.isPending} onClick={login}>
        개발 로그인
      </button>
      <button type="button" onClick={() => preview('worker')}>
        일반 교사 미리보기
      </button>
      <button type="button" onClick={() => preview('admin')}>
        관리자 미리보기
      </button>
      {issue.isError && (
        <p role="alert">{getApiErrorMessage(issue.error, '개발 로그인에 실패했습니다.')}</p>
      )}
    </details>
  )
}
