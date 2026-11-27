import { useContext, useId, useRef, useState } from 'react'
import { Dialog } from '@/pages/home/HomePanels'
import SchoolJoinForm from '@/pages/auth/SchoolJoinForm'
import { RosterReviewContext } from '@/pages/roster/RosterReviewContext'
import {
  useActiveStore, useCreateOwnerStore, useDeleteOwnerStore, useJoinStaffStore, useLeaveStaffStore,
  useOwnerProfile, useOwnerStore, useOwnerStores, useStaffProfile, useStaffStores,
  useUpdateActiveStore, useUpdateOwnerProfile, useUpdateOwnerStore, useUpdateStaffProfile,
} from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration'
import './profileSchool.css'

export default function ProfileSchoolDialog({
  isAdmin, onClose, initialTab = 'account', initialSchoolName = '', onSchoolConfirmed,
}) {
  const active = useActiveStore()
  const ownerProfile = useOwnerProfile({ enabled: isAdmin })
  const staffProfile = useStaffProfile({ enabled: !isAdmin })
  const profile = isAdmin ? ownerProfile : staffProfile
  const ownerSchools = useOwnerStores({ enabled: isAdmin })
  const staffSchools = useStaffStores({ enabled: !isAdmin })
  const schools = (isAdmin ? ownerSchools : staffSchools).data ?? []
  const ownerSchool = useOwnerStore({ enabled: isAdmin })
  const updateOwner = useUpdateOwnerProfile()
  const updateStaff = useUpdateStaffProfile()
  const updateSchool = useUpdateOwnerStore()
  const createSchool = useCreateOwnerStore()
  const deleteSchool = useDeleteOwnerStore()
  const joinSchool = useJoinStaffStore()
  const leaveSchool = useLeaveStaffStore()
  const switchSchool = useUpdateActiveStore()
  const onReviewRoster = useContext(RosterReviewContext)

  const id = useId()
  const body = useRef(null)
  const tabs = useRef(null)
  const touch = useRef(null)
  const saving = useRef(false)
  const [tab, setTab] = useState(initialTab)
  const [nameDraft, setNameDraft] = useState(null)
  const [schoolDraft, setSchoolDraft] = useState({})
  const [managing, setManaging] = useState(false)
  const [joining, setJoining] = useState(false)
  const [actions, setActions] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const me = profile.data
  const name = nameDraft ?? me?.username ?? ''
  const schoolValue = (key) => schoolDraft[key] ?? ownerSchool.data?.[key] ?? ''
  const schoolDirty = Object.keys(schoolDraft).some((key) => schoolDraft[key] !== (ownerSchool.data?.[key] ?? ''))
  const busy = joining || [updateOwner, updateStaff, updateSchool, createSchool, deleteSchool,
    leaveSchool, switchSchool].some(mutation => mutation.isPending)

  function canLeave() {
    if (busy || saving.current) return false
    const joinFields = body.current?.querySelectorAll('form.entry-form input')
    const dirty = name !== (me?.username ?? '') || schoolDirty
      || Array.from(joinFields ?? []).some(input => input.value !== input.defaultValue)
    return !dirty || window.confirm('변경을 저장하지 않고 나갈까요?')
  }

  function selectTab(next, focus = false) {
    setTab(next)
    setMessage('')
    setError('')
    if (body.current) body.current.scrollTop = 0
    if (focus) tabs.current?.querySelector(`[data-tab="${next}"]`)?.focus()
  }

  function pressTab(event) {
    const next = { ArrowLeft: tab === 'account' ? 'join' : 'account',
      ArrowRight: tab === 'account' ? 'join' : 'account', Home: 'account', End: 'join' }[event.key]
    if (!next) return
    event.preventDefault()
    selectTab(next, true)
  }

  function touchStart(event) {
    touch.current = null
    if (event.touches.length === 1 && !event.target.closest('input,textarea,select,button,a,label,summary')) {
      touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }
  }
  function touchEnd(event) {
    const start = touch.current
    touch.current = null
    if (!start || event.changedTouches.length !== 1) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return
    const next = dx < 0 ? 'join' : 'account'
    if (next !== tab) selectTab(next)
  }

  async function perform(action, success, fallback) {
    if (busy || saving.current) return
    saving.current = true
    setMessage('')
    setError('')
    try {
      await action()
      setMessage(success)
    } catch (cause) {
      setError(getApiErrorMessage(cause, fallback))
    } finally {
      saving.current = false
    }
  }
  function saveName(event) {
    event.preventDefault()
    const username = name.trim()
    if (!username) { setError('계정 이름을 입력해 주세요.'); return }
    return perform(async () => {
      await (isAdmin ? updateOwner : updateStaff).mutateAsync({ username })
      setNameDraft(null)
    }, '계정 이름을 저장했습니다.', '계정 이름을 저장하지 못했습니다.')
  }
  function saveSchool(add) {
    const input = Object.fromEntries(['name', 'address', 'phoneNumber'].map(key => [key, schoolValue(key).trim()]))
    return perform(async () => {
      if (add) await createSchool.mutateAsync({ ...input, hireDate: schoolDraft.hireDate || undefined })
      else await updateSchool.mutateAsync(input)
      setSchoolDraft({})
    }, add ? '학교를 추가했습니다.' : '학교 정보를 저장했습니다.', '학교 정보를 저장하지 못했습니다.')
  }

  return (
    <Dialog title="프로필·학교" className="profile-school" onClose={() => { if (canLeave()) onClose() }}>
      <div className="profile-tabs" role="tablist" aria-label="프로필 설정" data-current={tab}
        ref={tabs} onKeyDown={pressTab}>
        {['account', 'join'].map((key) => <button key={key} type="button" role="tab" id={id + key}
          aria-selected={tab === key} aria-controls={id + key + '-panel'} tabIndex={key === tab ? 0 : -1}
          data-tab={key} onClick={() => selectTab(key)}>{key === 'account' ? '계정 정보' : '기존 학교 가입'}</button>)}
      </div>
      <div className="profile-body" ref={body} onTouchStart={touchStart} onTouchEnd={touchEnd}
        onTouchCancel={() => { touch.current = null }}>
        <section role="tabpanel" aria-labelledby={id + 'account'} id={id + 'account-panel'} hidden={tab !== 'account'}>
          {profile.isLoading && <p role="status">계정 정보를 불러오고 있습니다.</p>}
          {profile.isError && <p role="alert">계정 정보를 불러오지 못했습니다. <button onClick={() => profile.refetch()}>다시 조회</button></p>}
          <form id={id + '-name'} onSubmit={saveName} className="profile-fields">
            <label>계정 이름<input name="username" required maxLength={100} value={name} autoComplete="name"
              disabled={busy || !me} onChange={e => { setNameDraft(e.target.value); setMessage(''); setError('') }} /></label>
            <label>인증 이메일<input type="text" readOnly value={me?.verifiedEmail ?? ''}
              placeholder={me ? '인증된 이메일 없음' : ''} /></label>
          </form>
          {onReviewRoster && !isAdmin && <button className="tt-text" type="button"
            onClick={() => { if (canLeave()) onReviewRoster() }}>학교 명부 다시 확인</button>}
          {isAdmin && <details open={managing} onToggle={e => setManaging(e.currentTarget.open)}>
            <summary>학교 정보 관리</summary>
            <div className="profile-fields">
              {[['name','학교명'], ['address','주소'], ['phoneNumber','전화'], ['hireDate','고용일 (새 학교 추가 시)']].map(([key,label]) =>
                <label key={key}>{label}<input type={key === 'hireDate' ? 'date' : 'text'} disabled={busy}
                  value={schoolValue(key)} onChange={e => setSchoolDraft({ ...schoolDraft, [key]: e.target.value })} /></label>)}
            </div>
          </details>}
        </section>
        <section role="tabpanel" aria-labelledby={id + 'join'} id={id + 'join-panel'} hidden={tab !== 'join'}>
          <SchoolJoinForm actions={actions} currentSchoolId={active.data?.schoolId} initialCode={active.data?.schoolCode ?? ''} initialName={initialSchoolName}
            onBusyChange={setJoining} label="가입 요청" submit={input => joinSchool.mutateAsync(input)}
            onComplete={async result => {
              setError('')
              setMessage(result.employmentStatus === 'PENDING' ? '학교 가입 승인 대기 중입니다.' : '학교별 이름을 확인했습니다.')
              await onSchoolConfirmed?.()
            }}>
            <label>고용일 (선택)<input type="date" name="hireDate" /></label>
          </SchoolJoinForm>
          <details><summary>내 학교 목록</summary>
            {schools.length === 0 && <p>등록된 학교가 없습니다.</p>}
            <ul className="profile-schools">{schools.map(school => <li key={school.schoolId}>
              <div><strong>{school.name}</strong><small>{school.schoolCode}{school.employmentStatus === 'PENDING' && ' · 승인 대기'}</small></div>
              <button className="tt-text" disabled={busy || school.schoolId === active.data?.schoolId ||
                (!isAdmin && school.employmentStatus !== 'HIRED')}
                onClick={() => { if (canLeave()) perform(() => switchSchool.mutateAsync(school.schoolId), '활성 학교를 바꿨습니다.', '학교를 바꾸지 못했습니다.') }}>
                {school.schoolId === active.data?.schoolId ? '사용 중' : '전환'}</button>
              <button className="tt-text" disabled={busy || school.employmentStatus === 'PENDING'}
                onClick={() => perform(() => (isAdmin ? deleteSchool : leaveSchool).mutateAsync(school.schoolId),
                  isAdmin ? '학교를 삭제했습니다.' : '학교를 나갔습니다.', '처리에 실패했습니다.')}>
                {isAdmin ? '삭제' : '나가기'}</button>
            </li>)}</ul>
          </details>
        </section>
      </div>
      <footer className="profile-actions">
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {tab === 'account' && <>
          {isAdmin && managing && <div className="profile-secondary">
            <button className="tt-secondary" type="button" disabled={busy || !ownerSchool.data} onClick={() => saveSchool(false)}>학교 저장</button>
            <button className="tt-secondary" type="button" disabled={busy} onClick={() => saveSchool(true)}>새 학교 추가</button>
          </div>}
          <button type="submit" className="entry-primary" form={id + '-name'} disabled={busy || !me}>
            {updateOwner.isPending || updateStaff.isPending ? '저장 중…' : '수정 완료'}</button>
        </>}
        <div hidden={tab !== 'join'} ref={setActions} />
      </footer>
    </Dialog>
  )
}
