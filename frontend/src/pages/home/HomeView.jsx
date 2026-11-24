import { useState } from 'react'
import { useHomeSession } from '@/hooks/useHomeSession'
import { useSchoolHome } from '@/hooks/useSchoolHome'
import { useTermChoice } from '@/hooks/useTermChoice'
import { getStoredTheme, setThemePreference } from '@/theme'
import { ThemeSwitch } from '@/components/layout/HeaderUserMenu'
import AIFloatingChat from '@/components/common/AIFloatingChat'
import NotificationSidebar from '@/components/layout/NotificationSidebar'
import ProfileSchoolDialog from '@/components/layout/ProfileSchoolDialog'
import UnavailabilityDialog from '@/components/schedule/UnavailabilityDialog'
import { Actions, Dialog, Icon, Notices, Profile, TermForm } from './HomePanels'
import HomeTimetable from './HomeTimetable'
import './home.css'

function Workspace({ session, navigate, onLogout }) {
  const school = session.school
  const { choice, saveChoice, term, weeklyTerm } = useTermChoice(session)
  const [date, setDate] = useState()
  const [classId, setClassId] = useState(null)
  const [panel, setPanel] = useState(null)
  const [theme, setTheme] = useState(getStoredTheme)
  const home = useSchoolHome({ term, weeklyTerm, classId, date })
  const { menus } = home.access
  const go = (view) => {
    setPanel(null)
    navigate(view)
  }
  const openCenter = () => setPanel('notices')
  const nav = [
    { icon: 'home', label: '업무 홈', current: true, run: () => setPanel(null) },
    ...(menus.timetable
      ? [
          { icon: 'timetable', label: '시간표', run: () => go('timetable') },
          { icon: 'todos', label: '할 일', run: () => go('todos') },
          ...(menus.respondToChange || menus.approve
            ? [{ icon: 'history', label: '보결·교환 업무', run: () => go('lesson-changes') }]
            : []),
          { icon: 'history', label: '요청 내역', run: () => go('history') },
        ]
      : []),
    ...(menus.generate
      ? [
          { icon: 'create', label: '시간표 생성', run: () => go('schedule-create') },
          { icon: 'settings', label: '과목·수업 관리', run: () => go('subject-manage') },
          { icon: 'school', label: '관리자 도구', run: () => go('admin') },
        ]
      : []),
  ]
  const shortcuts = [
    ...(menus.generate
      ? [{ icon: 'create', label: '시간표 생성', run: () => go('schedule-create') }]
      : []),
    ...(menus.requestSwap
      ? [{ icon: 'timetable', label: '수업 교환 신청', run: () => go('lesson-changes') }]
      : []),
    ...(menus.respondToChange || menus.approve
      ? [
          {
            icon: 'bell',
            label: menus.approve ? '변경 신청 승인' : '변경 신청 응답',
            run: () => go('lesson-changes'),
          },
        ]
      : []),
    { icon: 'todos', label: '할 일 확인', run: () => go('todos') },
  ]
  const profile = (
    <Profile
      home={home}
      onSettings={() => setPanel('settings')}
      onPreferences={() => setPanel('preferences')}
    />
  )
  const menu = (
    <>
      <p className="desk-group-label">업무 메뉴</p>
      <nav aria-label="업무 메뉴">
        <Actions items={nav} />
      </nav>
    </>
  )
  const role = home.access.queries.adminProfile ? 'admin' : 'worker'
  const signout = (
    <button className="desk-logout" onClick={onLogout}>
      <Icon name="logout" />
      로그아웃
    </button>
  )
  const schoolName = school?.name
  let accessMessage = '이 계정에서 사용할 수 있는 학교 시간표 조회 권한이 없습니다.'
  if (home.activeSchool.state === 'loading') accessMessage = '활성 학교를 확인하고 있습니다.'
  else if (home.activeSchool.state === 'error') accessMessage = '활성 학교 조회에 실패했습니다.'
  else if (home.activeSchool.state === 'forbidden')
    accessMessage = '활성 학교 조회 권한이 없습니다.'
  else if (!session.userId) accessMessage = '학교 계정으로 로그인하면 시간표를 확인할 수 있습니다.'
  return (
    <div className="school-desk">
      <a className="desk-skip" href="#desk-main">
        시간표로 건너뛰기
      </a>
      <header className="desk-brand">
        <span className="desk-mark">
          <Icon name="brand" />
        </span>
        <strong>우리학교시간표</strong>
      </header>
      <header className="desk-top">
        <button
          className="desk-icon desk-menu-trigger"
          onClick={() => setPanel('menu')}
          aria-label="업무 메뉴 열기"
        >
          <Icon name="menu" />
        </button>
        <div className="desk-school">
          <Icon name="school" />
          <span>{schoolName || '우리학교시간표'}</span>
        </div>
        <div className="desk-tools">
          <ThemeSwitch
            value={theme}
            onChange={(id) => {
              setThemePreference(id)
              setTheme(id)
            }}
          />
          {menus.notifications && (
            <button className="desk-icon desk-bell" onClick={openCenter} aria-label="알림센터 열기">
              <Icon name="bell" />
              {home.notifications.items.state === 'value' &&
                home.notifications.items.value.some((n) => !n.read) && <i />}
            </button>
          )}
          {menus.profile && (
            <button
              className="desk-icon desk-profile-trigger"
              onClick={() => setPanel('profile')}
              aria-label="프로필 열기"
            >
              <Icon name="person" />
            </button>
          )}
        </div>
      </header>
      <aside className="desk-sidebar">
        {menu}
        {signout}
      </aside>
      <main className="desk-main" id="desk-main" tabIndex="-1">
        <div className="desk-title">
          <div>
            <p>
              {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full', timeZone: 'UTC' }).format(
                new Date(home.today + 'T12:00:00Z'),
              )}
            </p>
            <h1>업무 홈</h1>
          </div>
          {menus.timetable && (
            <button
              className="desk-term-button"
              aria-label="조회 학기 설정"
              onClick={() => setPanel('term')}
            >
              <Icon name="settings" />
              {choice.academicYear}학년도 {choice.semester}학기
            </button>
          )}
        </div>
        {menus.timetable ? (
          <>
            <HomeTimetable
              key={choice.academicYear + '-' + choice.semester + '-' + choice.termId}
              term={term}
              home={home}
              setDate={setDate}
              setRoom={setClassId}
              onSettings={() => setPanel('term')}
            />
            <div className="desk-lower">
              <Notices home={home} onOpen={openCenter} />
              <section className="desk-card desk-section">
                <header>
                  <h2>자주 쓰는 기능</h2>
                </header>
                <Actions compact items={shortcuts} />
                <AIFloatingChat />
              </section>
            </div>
          </>
        ) : (
          <section className="desk-card desk-section" role="status">
            <h2>학교 시간표</h2>
            <p>{accessMessage}</p>
          </section>
        )}
      </main>
      {menus.profile && (
        <aside className="desk-profile">
          <section className="desk-card desk-section">
            <header>
              <h2>내 프로필</h2>
              <Icon name="person" />
            </header>
            {profile}
          </section>
        </aside>
      )}
      {panel === 'menu' && (
        <Dialog title="메뉴" onClose={() => setPanel(null)}>
          {menu}
          {signout}
        </Dialog>
      )}
      {panel === 'profile' && menus.profile && (
        <Dialog title="내 프로필" onClose={() => setPanel(null)}>
          {profile}
        </Dialog>
      )}
      {panel === 'notices' && menus.notifications && (
        <Dialog title="알림센터" onClose={() => setPanel(null)}>
          <NotificationSidebar
            onOpenChanges={() => go('lesson-changes')}
            open
            userRole={role}
            onClose={() => setPanel(null)}
          />
        </Dialog>
      )}
      {panel === 'settings' && menus.profile && (
        <ProfileSchoolDialog isAdmin={role === 'admin'} onClose={() => setPanel(null)} />
      )}
      {panel === 'preferences' && home.access.queries.teacherProfile && (
        <UnavailabilityDialog onClose={() => setPanel(null)} />
      )}
      {panel === 'term' && menus.timetable && (
        <Dialog title="조회 학기 설정" onClose={() => setPanel(null)}>
          <TermForm
            current={choice}
            onApply={(v) => {
              saveChoice(v)
              setClassId(null)
              setDate(undefined)
              setPanel(null)
            }}
          />
        </Dialog>
      )}
    </div>
  )
}

export default function HomeView(props) {
  const session = useHomeSession()
  return (
    <Workspace
      key={[
        session.userId,
        session.identity.generation,
        session.scope.schoolId,
        session.scope.position,
      ].join('/')}
      session={session}
      {...props}
    />
  )
}
