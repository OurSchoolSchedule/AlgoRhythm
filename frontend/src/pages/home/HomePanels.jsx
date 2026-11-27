import { useLayoutEffect, useRef } from 'react'
import { localizeNotificationMessage } from '@/constants/domainLabels.js'

const strokes = {
  brand: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 13h2 M13 13h3 M8 16h4',
  home: 'm3 10 9-7 9 7 M5 9v11h5v-6h4v6h5V9',
  timetable: 'M3 5h18v15H3z M3 10h18 M9 10v10 M15 10v10',
  todos: 'm3 7 2 2 4-5 M12 7h9 M3 15l2 2 4-5 M12 15h9',
  history: 'M3 11a9 9 0 1 1 2 7 M3 5v6h6 M12 7v5l3 2',
  create: 'M4 5h16v15H4z M8 3v4 M16 3v4 M8 13h8 M12 9v8',
  key: 'M14 4a5 5 0 0 1 6 7 5 5 0 0 1-6 2l-3 3H8v3H5v2H2v-5l9-9a5 5 0 0 1 3-3z M16 7h.01',
  settings: 'M3 6h9m4 0h5 M3 12h3m4 0h11 M3 18h10m4 0h4 M12 4v4 M7 10v4 M14 16v4',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  bell: 'M5 16c2-2 2-5 2-7a5 5 0 0 1 10 0c0 2 0 5 2 7l1 1H4z M10 20a2 2 0 0 0 4 0',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  close: 'm6 6 12 12 M18 6 6 18',
  next: 'm9 5 7 7-7 7',
  prev: 'm15 5-7 7 7 7',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  logout: 'M10 4H4v16h6 M10 12h11m-4-4 4 4-4 4',
  school: 'm2 9 10-6 10 6 M4 10v11h16V10 M9 21v-6h6v6 M8 10h1m6 0h1',
}

export function Icon({ name }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={strokes[name]} />
    </svg>
  )
}

export function Actions({ items, compact = false }) {
  return (
    <div className={compact ? 'desk-quick' : 'desk-links'}>
      {items.map(({ icon, label, run, current }) => (
        <button type="button" key={label} onClick={run} aria-current={current ? 'page' : undefined}>
          <span className="desk-action-icon">
            <Icon name={icon} />
          </span>
          {label}
          {compact && <Icon name="arrow" />}
        </button>
      ))}
    </div>
  )
}

export function Dialog({ title, onClose, children, drawer = false, className = '' }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    const trigger = document.activeElement
    el.showModal()
    return () => {
      el.close()
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`desk-dialog ${drawer ? 'desk-drawer' : ''} ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="desk-dialog-inner">
        <header>
          <h2>{title}</h2>
          <button className="desk-icon" onClick={onClose} aria-label={drawer ? '업무 메뉴 닫기' : '닫기'}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

const fields = {
  pending: '확인 중',
  empty: '등록된 값 없음',
  unsupported: '지원되지 않음',
  unconfirmed: '확인되지 않음',
  error: '조회 실패',
  forbidden: '조회 권한 없음',
}

function fieldText(field, format = (value) => value) {
  return field.state === 'value' ? format(field.value) : fields[field.state]
}

export function Profile({ home, onSettings, onPreferences }) {
  const { profile, access } = home
  const name = fieldText(profile.name)
  return (
    <>
      <div className="desk-identity">
        <span className="desk-avatar" aria-hidden="true">
          {profile.name.state === 'value' ? name.slice(0, 1) : <Icon name="person" />}
        </span>
        <div>
          <strong>{name}</strong>
          <small>{access.queries.adminProfile ? '관리자' : '교사'}</small>
        </div>
      </div>
      <dl className="desk-fields">
        <div>
          <dt>계정 이름</dt>
          <dd>{fieldText(profile.accountName)}</dd>
        </div>
        <div>
          <dt>담당 과목</dt>
          <dd>{fieldText(profile.subjects, (xs) => xs.map((x) => x.subjectName).join(', '))}</dd>
        </div>
        <div>
          <dt>담임 학급</dt>
          <dd>
            {fieldText(profile.homerooms, (xs) =>
              xs.map((x) => `${x.grade}학년 ${x.classNumber}반`).join(', '),
            )}
          </dd>
        </div>
      </dl>
      <details className="desk-extra">
        <summary>추가 프로필 정보</summary>
        <dl className="desk-fields">
          <div>
            <dt>부담임</dt>
            <dd>{fieldText(profile.deputyHomeroom, (rooms) => rooms.map((room) => `${room.grade}학년 ${room.classNumber}반`).join(', '))}</dd>
          </div>
          <div>
            <dt>보직</dt>
            <dd>{fieldText(profile.positionTitle)}</dd>
          </div>
        </dl>
      </details>
      <button className="desk-line-button" onClick={onSettings}>
        <Icon name="settings" />
        프로필·학교 관리
      </button>
      {access.queries.teacherProfile && (
        <button className="desk-text-button" onClick={onPreferences}>
          근무 불가 시간 제출
        </button>
      )}
    </>
  )
}

const groups = {
  substitute: '보결',
  approval: '승인',
  swap: '교환',
  schedule: '시간표',
  unclassified: '기타',
}
export function Notices({ home, onOpen }) {
  const { notificationQuery: query, notifications } = home
  const list = notifications.items
  return (
    <section className="desk-card desk-section" aria-label="최근 알림">
      <header>
        <h2>최근 알림</h2>
        <button className="desk-text-button" onClick={onOpen}>
          전체 보기 <Icon name="next" />
        </button>
      </header>
      {list.state === 'value' ? (
        <ul className="desk-notices">
          {list.value.slice(0, 3).map((n) => (
            <li key={n.id}>
              <span className="desk-tag">{groups[n.group]}</span>
              <div>
                {localizeNotificationMessage(n.message)}
                {n.schoolName && <small>{n.schoolName}</small>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="desk-muted" role="status">
          {query.state === 'loading'
            ? '알림을 불러오는 중입니다.'
            : list.state === 'empty'
              ? '받은 알림이 없습니다.'
              : fieldText(list)}
        </p>
      )}
      {query.state === 'error' && home.retryNotices && (
        <button className="desk-text-button" onClick={() => home.retryNotices()}>
          알림 다시 시도
        </button>
      )}
      {query.refreshError && <p className="desk-muted">최근 알림을 갱신하지 못했습니다.</p>}
      <small className="desk-note">학교공지 · {fieldText(notifications.schoolAnnouncements)}</small>
    </section>
  )
}
