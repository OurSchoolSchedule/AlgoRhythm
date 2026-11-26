import { useState } from 'react'
import { useOnboarding } from '@/hooks/useAuth'
import { getApiErrorMessage } from '@/utils/timetableGeneration'
import SchoolJoinForm from './SchoolJoinForm'

export default function SchoolOnboarding({ onComplete, onExit, error }) {
  const [role, setRole] = useState('TEACHER')
  const join = useOnboarding()
  function create(event) {
    event.preventDefault()
    if (join.isPending) return
    const form = new FormData(event.currentTarget)
    const payload = { role, name: form.get('name').trim(), address: form.get('address').trim(), displayName: form.get('displayName').trim() }
    for (const key of ['hireDate', 'phoneNumber']) if (form.get(key)) payload[key] = form.get(key).trim()
    join.mutate(payload, { onSuccess: onComplete })
  }
  const optional = <>
    <label>전화번호 (선택)<input name="phoneNumber" autoComplete="tel" /></label>
    <label>고용일 (선택)<input name="hireDate" type="date" /></label>
  </>
  return <>
    <h2 className="entry-auth-title">학교 연결</h2>
    <label>역할<select value={role} disabled={join.isPending} onChange={e => { setRole(e.target.value); join.reset() }}>
      <option value="TEACHER">교사 · 기존 학교 가입</option>
      <option value="ADMIN">관리자 · 새 학교 등록</option>
    </select></label>
    {role === 'TEACHER'
      ? <SchoolJoinForm submit={input => join.mutateAsync({ ...input, role })} onComplete={onComplete}>{optional}</SchoolJoinForm>
      : <form className="entry-form" onSubmit={create}>
          <fieldset className="entry-fieldset" disabled={join.isPending}>
            <label>학교 이름<input name="name" required autoComplete="organization" pattern={'.*\\S.*'} /></label>
            <label>주소<input name="address" required autoComplete="street-address" pattern={'.*\\S.*'} /></label>
            <label>본인 이름<input name="displayName" required maxLength={100} autoComplete="name" pattern={'.*\\S.*'} /></label>
            {optional}
            {join.isError && <p role="alert">{getApiErrorMessage(join.error, '학교 등록에 실패했습니다.')}</p>}
            <button className="entry-primary">학교 등록</button>
          </fieldset>
        </form>}
    {error && <p role="alert">{error}</p>}
    <button className="entry-secondary" type="button" disabled={join.isPending} onClick={onExit}>로그인으로 돌아가기</button>
  </>
}
