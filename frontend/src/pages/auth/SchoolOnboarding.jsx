import { useState } from 'react'
import { useOnboarding } from '@/hooks/useAuth'
import { getApiErrorMessage } from '@/utils/timetableGeneration'

export default function SchoolOnboarding({ onComplete, onExit, error }) {
  const [role, setRole] = useState('TEACHER')
  const join = useOnboarding()

  function submit(event) {
    event.preventDefault()
    if (join.isPending) return
    const form = new FormData(event.currentTarget)
    const value = (key) => String(form.get(key) ?? '').trim()
    const payload =
      role === 'TEACHER'
        ? { role, schoolCode: value('schoolCode') }
        : { role, name: value('name'), address: value('address') }
    if (role === 'TEACHER' && value('displayName')) payload.displayName = value('displayName')
    if (value('hireDate')) payload.hireDate = value('hireDate')
    if (value('phoneNumber')) payload.phoneNumber = value('phoneNumber')
    join.mutate(payload, { onSuccess: onComplete })
  }

  return (
    <>
      <h2 className="entry-auth-title">학교 연결</h2>
      <p>교사는 학교 코드로 가입하고, 관리자는 새 학교를 등록할 수 있습니다.</p>
      <form className="entry-form" onSubmit={submit}>
        <fieldset className="entry-fieldset" disabled={join.isPending}>
          <label>
            역할
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                join.reset()
              }}
            >
              <option value="TEACHER">교사</option>
              <option value="ADMIN">관리자</option>
            </select>
          </label>
          {role === 'TEACHER' ? (
            <>
              <label>
                학교 코드
                <input name="schoolCode" autoComplete="off" required pattern={'.*\\S.*'} />
              </label>
              <label>
                표시 이름 (선택)
                <input name="displayName" autoComplete="name" maxLength={100} pattern={'.*\\S.*'} />
              </label>
            </>
          ) : (
            <>
              <label>
                학교 이름
                <input name="name" autoComplete="organization" required pattern={'.*\\S.*'} />
              </label>
              <label>
                주소
                <input name="address" autoComplete="street-address" required pattern={'.*\\S.*'} />
              </label>
            </>
          )}
          <label>
            전화번호 (선택)
            <input name="phoneNumber" type="tel" autoComplete="tel" />
          </label>
          <label>
            고용일 (선택)
            <input name="hireDate" type="date" />
          </label>
          {error && (
            <p role="alert" className="entry-error">
              {error}
            </p>
          )}
          {join.isError && (
            <p className="entry-error" role="alert">
              {getApiErrorMessage(join.error, '학교 연결에 실패했습니다.')}
            </p>
          )}
          <button className="entry-primary" type="submit">
            {join.isPending ? '연결 중…' : role === 'TEACHER' ? '학교 가입 요청' : '학교 등록'}
          </button>
        </fieldset>
        <button
          className="entry-secondary"
          type="button"
          disabled={join.isPending}
          onClick={onExit}
        >
          로그인으로 돌아가기
        </button>
      </form>
    </>
  )
}
