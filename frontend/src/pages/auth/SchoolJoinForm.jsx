import { useEffect, useRef, useState } from 'react'
import './entry.css'
import client from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { getSessionVersion } from '@/api/tokenStorage'
import { getApiErrorMessage } from '@/utils/timetableGeneration'

export default function SchoolJoinForm({ submit, onComplete, label = '학교 가입 요청', initialCode = '', initialName = '', children = null }) {
  const cache = useQueryClient()
  const [proposal, setProposal] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const flight = useRef(null)
  useEffect(() => () => flight.current?.abort(), [])

  async function proceed(event) {
    event.preventDefault()
    if (flight.current) return
    const form = event.currentTarget
    const values = new FormData(form)
    const input = {
      schoolCode: String(values.get('schoolCode')).trim(),
      displayName: String(values.get('displayName')).trim(),
    }
    if (!input.schoolCode || !input.displayName) return
    if (values.get('hireDate')) input.hireDate = values.get('hireDate')
    if (values.get('phoneNumber')) input.phoneNumber = values.get('phoneNumber')
    const request = new AbortController()
    const session = getSessionVersion()
    const current = () => !request.signal.aborted && session === getSessionVersion()
    flight.current = request
    setBusy(true)
    setError('')
    try {
      if (!proposal) {
        const { data } = await client.post('/api/auth/onboarding/name-preview', input, { signal: request.signal })
        if (!data?.confirmation || !data.schoolName || !data.displayName || !data.baseName)
          throw new Error('학교와 이름을 확인하지 못했습니다.')
        if (current()) setProposal(data)
      } else {
        const result = await submit({ ...input, nameConfirmation: proposal.confirmation })
        if (current()) {
          // Membership names appear across terms in the directory, timetable, and review.
          for (const prefix of [['school-roster', proposal.schoolId], ['store'], ['timetable'], ['school', 'classes'], ['mypage']])
            void cache.invalidateQueries({ queryKey: prefix })
          form.reset()
          setProposal(null)
          await onComplete(result)
        }
      }
    } catch (cause) {
      if (!current()) return
      const conflict = cause.response?.data
      if (cause.response?.status === 409 && conflict?.code === 'NAME_CONFIRMATION_REQUIRED' && conflict.proposal?.confirmation) {
        setProposal(conflict.proposal)
        setError('다른 교사가 먼저 등록했습니다. 변경된 표시 이름을 확인해 주세요.')
      } else setError(getApiErrorMessage(cause, '학교 코드와 이름을 확인해 주세요.'))
    } finally {
      flight.current = null
      if (current()) setBusy(false)
    }
  }

  return (
    <form className="entry-form" onSubmit={proceed}>
      <fieldset className="entry-fieldset" disabled={busy}>
        <label>학교 코드<input name="schoolCode" defaultValue={initialCode} readOnly={!!proposal}
          autoComplete="off" maxLength={100} required pattern={'.*\\S.*'} /></label>
        <label>본인 이름<input name="displayName" defaultValue={initialName} readOnly={!!proposal}
          autoComplete="name" maxLength={100} required pattern={'.*\\S.*'} /></label>
        {children}
        {proposal && <div aria-live="polite">
          <p>가입 학교 · <strong>{proposal.schoolName}</strong></p>
          {proposal.displayName !== proposal.baseName
            ? <p>{proposal.baseName} 교사가 이미 있어요. 이름 뒤에 알파벳을 붙여 <strong>{proposal.displayName}</strong>로 등록할까요?</p>
            : <p>학교 표시 이름 · <strong>{proposal.displayName}</strong></p>}
          {proposal.renamedFrom && <p>기존 {proposal.renamedFrom} 교사의 표시 이름도 {proposal.renamedTo}로 변경됩니다.</p>}
          <button type="button" onClick={() => { setProposal(null); setError('') }}>수정</button>
        </div>}
        {error && <p role="alert">{error}</p>}
        <button className="entry-primary" type="submit">{proposal ? label : '학교·이름 확인'}</button>
      </fieldset>
    </form>
  )
}
