import { useState } from 'react'
import { isAxiosError } from 'axios'
import { canSelect } from '@/api/neisSchool'
import { canManageSchoolLink, useSchoolLink, useChangeSchoolLink } from '@/hooks/useNeisSchool'
import { getApiErrorMessage } from '@/utils/timetableGeneration'
import SchoolPicker from './SchoolPicker'

function Summary({ school }) {
  return (
    <div className="neis-summary">
      <strong>{school.schoolName}</strong>
      <small>
        {school.officeName} · {school.schoolKind}
      </small>
      <small>{school.address || '주소 미제공'}</small>
    </div>
  )
}

export default function SchoolLinkSettings({ session, registration, finish }) {
  const current = useSchoolLink(session)
  const save = useChangeSchoolLink(session)
  const [editing, setEditing] = useState(Boolean(registration))
  const [selected, setSelected] = useState(registration?.option ?? null)
  const [message, setMessage] = useState('')
  const [choosing, setChoosing] = useState(!registration)
  const admin = canManageSchoolLink(session.scope)
  const link = !current.isError && current.data
  async function submit() {
    if (!admin || !link || !canSelect(selected) || save.isPending) return
    setMessage('')
    try {
      await save.mutateAsync({ option: selected, version: link.version })
      setEditing(false)
      setSelected(null)
      setMessage('나이스 학교 연결을 저장했습니다.')
      finish()
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        setSelected(null)
        setChoosing(true)
        finish()
        setMessage(
          '다른 관리자가 연결을 변경했습니다. 현재 연결을 확인하고 다시 선택해 주세요.',
        )
      } else {
        setMessage(
          isAxiosError(error)
            ? getApiErrorMessage(
                error,
                '연결을 저장하지 못했습니다. 다시 시도해 주세요.',
              )
            : error.message,
        )
      }
    }
  }
  return (
    <section className="neis-section" aria-label="나이스 학교 연결">
      <h3>나이스 학교 연결</h3>
      {registration && (
        <p>{registration.name} 등록 완료 · 선택한 공개 학교를 확인해 주세요.</p>
      )}
      {current.isLoading && <p role="status">현재 연결 확인 중…</p>}
      {current.isError && (
        <div role="alert">
          현재 연결을 불러오지 못했습니다.{' '}
          <button type="button" onClick={() => current.refetch()}>
            연결 다시 조회
          </button>
        </div>
      )}
      {link && (
        <>
          <p>
            현재 연결 · {link.status === 'LINKED' ? '연결됨' : '미연동'} · 버전{' '}
            {link.version}
          </p>
          {link.school && <Summary school={link.school} />}
          {admin && !editing && (
            <button
              type="button"
              className="tt-secondary"
              onClick={() => {
                setMessage('')
                setChoosing(true)
                setEditing(true)
              }}
            >
              {link.status === 'LINKED'
                ? '연결 학교 변경'
                : '나이스 학교 연결하기'}
            </button>
          )}
        </>
      )}
      {admin && editing && (
        <>
          <fieldset className="neis-create" disabled={save.isPending}>
            {choosing ? (
              <SchoolPicker
                session={session}
                value={selected}
                onChange={(option) => {
                  setSelected(option)
                  save.reset()
                  setMessage('')
                }}
              />
            ) : (
              selected && (
                <>
                  <Summary school={selected} />
                  <button
                    type="button"
                    onClick={() => {
                      setChoosing(true)
                      setSelected(null)
                    }}
                  >
                    다른 학교 선택
                  </button>
                </>
              )
            )}
            <div className="neis-actions">
              <button
                type="button"
                className="tt-create"
                disabled={!link || !canSelect(selected) || current.isFetching}
                onClick={submit}
              >
                {save.isPending
                  ? '연결 중…'
                  : save.isError && selected
                    ? '연결 다시 시도'
                    : '선택한 학교 연결'}
              </button>
              <button
                type="button"
                className="tt-secondary"
                onClick={() => {
                  setEditing(false)
                  setSelected(null)
                  setMessage('')
                  finish()
                }}
              >
                나중에
              </button>
            </div>
          </fieldset>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
