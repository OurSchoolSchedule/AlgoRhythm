import { useState } from 'react'
import { getApiErrorMessage } from '@/utils/timetableGeneration'
import { canManageSchoolLink } from '@/hooks/useNeisSchool'
import SchoolPicker from './SchoolPicker'

export default function AddSchoolForm({ session, create, onCreated, onCancel }) {
  const [option, setOption] = useState(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (create.isPending || !name.trim() || !address.trim()) return
    const form = new FormData(event.currentTarget)
    try {
      const school = await create.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        phoneNumber: form.get('phoneNumber').trim(),
        hireDate: form.get('hireDate') || undefined,
      })
      onCreated(school, option)
    } catch {
      // The form displays the mutation error and preserves the draft.
    }
  }
  return (
    <form className="neis-section" onSubmit={submit} aria-label="새 학교 등록">
      <h3>새 학교 등록</h3>
      <fieldset className="neis-create" disabled={create.isPending}>
        {canManageSchoolLink(session.scope) && (
          <SchoolPicker
            session={session}
            value={option}
            onChange={(school) => {
              setOption(school)
              if (school) {
                setName(school.schoolName || '')
                setAddress(school.address || '')
              }
            }}
          />
        )}
        <label>
          새 학교 이름
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          새 학교 주소
          <input required value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          전화번호 (선택)
          <input type="tel" name="phoneNumber" />
        </label>
        <label>
          고용일 (선택)
          <input type="date" name="hireDate" />
        </label>
        {create.isError && (
          <p role="alert">{getApiErrorMessage(create.error, '학교를 추가하지 못했습니다.')}</p>
        )}
        <div className="neis-actions">
          <button type="submit" className="tt-create">
            새 학교 등록
          </button>
          <button type="button" className="tt-secondary" onClick={onCancel}>
            취소
          </button>
        </div>
      </fieldset>
    </form>
  )
}
