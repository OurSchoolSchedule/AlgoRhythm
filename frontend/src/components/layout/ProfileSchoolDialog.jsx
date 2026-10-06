import { useState } from 'react'
import {
  useActiveStore,
  useCreateOwnerStore,
  useDeleteOwnerStore,
  useJoinStaffStore,
  useLeaveStaffStore,
  useOwnerProfile,
  useOwnerStore,
  useOwnerStores,
  useStaffProfile,
  useStaffStores,
  useUpdateActiveStore,
  useUpdateOwnerProfile,
  useUpdateOwnerStore,
  useUpdateStaffProfile,
} from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

/**
 * 프로필·학교 목록 편집. /api/mypage/*
 * @param {{ isAdmin: boolean, onClose: () => void }} props
 */
export default function ProfileSchoolDialog({ isAdmin, onClose }) {
  const active = useActiveStore()
  const ownerProfile = useOwnerProfile({ enabled: isAdmin })
  const staffProfile = useStaffProfile({ enabled: !isAdmin })
  const ownerSchool = useOwnerStore({ enabled: isAdmin })
  const ownerSchools = useOwnerStores({ enabled: isAdmin })
  const staffSchools = useStaffStores({ enabled: !isAdmin })
  const updateOwnerProfile = useUpdateOwnerProfile()
  const updateStaffProfile = useUpdateStaffProfile()
  const updateSchool = useUpdateOwnerStore()
  const createSchool = useCreateOwnerStore()
  const deleteSchool = useDeleteOwnerStore()
  const joinSchool = useJoinStaffStore()
  const leaveSchool = useLeaveStaffStore()
  const switchActive = useUpdateActiveStore()

  const profileQuery = isAdmin ? ownerProfile : staffProfile
  const schoolsQuery = isAdmin ? ownerSchools : staffSchools
  const me = profileQuery.data
  const [draft, setDraft] = useState(null)
  const [schoolDraft, setSchoolDraft] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [message, setMessage] = useState('')

  const username = draft?.username ?? me?.username ?? ''
  const email = draft?.email ?? me?.email ?? ''
  const schoolName = schoolDraft?.name ?? ownerSchool.data?.name ?? ''
  const schoolAddress = schoolDraft?.address ?? ownerSchool.data?.address ?? ''
  const schoolPhone = schoolDraft?.phoneNumber ?? ownerSchool.data?.phoneNumber ?? ''

  const schools = schoolsQuery.data ?? []
  const busy = updateOwnerProfile.isPending
    || updateStaffProfile.isPending
    || updateSchool.isPending
    || createSchool.isPending
    || deleteSchool.isPending
    || joinSchool.isPending
    || leaveSchool.isPending
    || switchActive.isPending

  const saveProfile = async () => {
    setMessage('')
    try {
      const payload = { username: username.trim(), email: email.trim() }
      if (isAdmin) await updateOwnerProfile.mutateAsync(payload)
      else await updateStaffProfile.mutateAsync(payload)
      setDraft(null)
      setMessage('프로필을 저장했습니다.')
    } catch (error) {
      setMessage(getApiErrorMessage(error, '프로필을 저장하지 못했습니다.'))
    }
  }

  const saveSchool = async () => {
    setMessage('')
    try {
      await updateSchool.mutateAsync({
        name: schoolName.trim(),
        address: schoolAddress.trim(),
        phoneNumber: schoolPhone.trim(),
      })
      setSchoolDraft(null)
      setMessage('학교 정보를 저장했습니다.')
    } catch (error) {
      setMessage(getApiErrorMessage(error, '학교 정보를 저장하지 못했습니다.'))
    }
  }

  const handleCreateSchool = async () => {
    setMessage('')
    try {
      await createSchool.mutateAsync({
        name: schoolName.trim(),
        address: schoolAddress.trim(),
        phoneNumber: schoolPhone.trim(),
        hireDate: hireDate || undefined,
      })
      setMessage('학교를 추가했습니다.')
    } catch (error) {
      setMessage(getApiErrorMessage(error, '학교를 추가하지 못했습니다.'))
    }
  }

  const handleJoin = async () => {
    setMessage('')
    try {
      await joinSchool.mutateAsync({
        schoolCode: joinCode.trim(),
        hireDate: hireDate || undefined,
      })
      setJoinCode('')
      setMessage('학교에 가입했습니다.')
    } catch (error) {
      setMessage(getApiErrorMessage(error, '학교 가입에 실패했습니다.'))
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="프로필·학교"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '86vh',
          overflow: 'auto',
          padding: 20,
          borderRadius: 12,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>프로필·학교</h2>
          <button type="button" className="panel-close" onClick={onClose}>닫기</button>
        </div>

        {(profileQuery.isLoading || schoolsQuery.isLoading) && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>
        )}

        <section style={{ marginBottom: 16 }}>
          <h3 style={sectionTitle}>내 정보</h3>
          <label style={labelStyle}>이름
            <input
              value={username}
              onChange={(e) => setDraft((prev) => ({ username: e.target.value, email: prev?.email ?? email }))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setDraft((prev) => ({ username: prev?.username ?? username, email: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <button type="button" className="tt-create" disabled={busy} onClick={saveProfile} style={{ marginTop: 8 }}>
            프로필 저장
          </button>
        </section>

        {isAdmin && (
          <section style={{ marginBottom: 16 }}>
            <h3 style={sectionTitle}>현재 학교</h3>
            <label style={labelStyle}>이름
              <input
                value={schoolName}
                onChange={(e) => setSchoolDraft((prev) => ({
                  name: e.target.value,
                  address: prev?.address ?? schoolAddress,
                  phoneNumber: prev?.phoneNumber ?? schoolPhone,
                }))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>주소
              <input
                value={schoolAddress}
                onChange={(e) => setSchoolDraft((prev) => ({
                  name: prev?.name ?? schoolName,
                  address: e.target.value,
                  phoneNumber: prev?.phoneNumber ?? schoolPhone,
                }))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>전화
              <input
                value={schoolPhone}
                onChange={(e) => setSchoolDraft((prev) => ({
                  name: prev?.name ?? schoolName,
                  address: prev?.address ?? schoolAddress,
                  phoneNumber: e.target.value,
                }))}
                style={inputStyle}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" className="tt-create" disabled={busy} onClick={saveSchool}>학교 저장</button>
              <button type="button" className="tt-secondary" disabled={busy} onClick={handleCreateSchool}>새 학교 추가</button>
            </div>
            <label style={{ ...labelStyle, marginTop: 8 }}>고용일 (추가 시)
              <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={inputStyle} />
            </label>
          </section>
        )}

        {!isAdmin && (
          <section style={{ marginBottom: 16 }}>
            <h3 style={sectionTitle}>학교 가입</h3>
            <label style={labelStyle}>학교 코드
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>고용일
              <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={inputStyle} />
            </label>
            <button type="button" className="tt-create" disabled={busy || !joinCode.trim()} onClick={handleJoin} style={{ marginTop: 8 }}>
              가입
            </button>
          </section>
        )}

        <section>
          <h3 style={sectionTitle}>내 학교 목록</h3>
          {schools.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>등록된 학교가 없습니다.</p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {schools.map((school) => {
              const id = school.schoolId
              const activeId = active.data?.schoolId
              return (
                <li
                  key={id}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-border-light)',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>{school.name}</strong>
                    <div style={{ color: 'var(--color-text-muted)' }}>{school.schoolCode}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="tt-text"
                      disabled={busy || id === activeId}
                      onClick={async () => {
                        setMessage('')
                        try {
                          await switchActive.mutateAsync(id)
                          setMessage('활성 학교를 바꿨습니다.')
                        } catch (error) {
                          setMessage(getApiErrorMessage(error, '활성 학교를 바꾸지 못했습니다.'))
                        }
                      }}
                    >
                      {id === activeId ? '사용 중' : '전환'}
                    </button>
                    <button
                      type="button"
                      className="tt-text"
                      disabled={busy}
                      onClick={async () => {
                        setMessage('')
                        try {
                          if (isAdmin) await deleteSchool.mutateAsync(id)
                          else await leaveSchool.mutateAsync(id)
                          setMessage(isAdmin ? '학교를 삭제했습니다.' : '학교를 나갔습니다.')
                        } catch (error) {
                          setMessage(getApiErrorMessage(error, '처리에 실패했습니다.'))
                        }
                      }}
                    >
                      {isAdmin ? '삭제' : '나가기'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {message && (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text)' }}>{message}</p>
        )}
      </div>
    </div>
  )
}

const sectionTitle = { margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, fontSize: 12, color: 'var(--color-text-muted)' }
const inputStyle = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  fontSize: 14,
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
}
