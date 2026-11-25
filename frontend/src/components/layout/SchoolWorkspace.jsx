import { lazy, Suspense, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { neisKeys } from '@/hooks/useNeisSchool'
import { useHomeSession } from '@/hooks/useHomeSession'
import { useHomeNotices, useHomeProfile } from '@/hooks/homeReads'
import { useTermChoice } from '@/hooks/useTermChoice'
import { getStoredTheme, setThemePreference } from '@/theme'
import { toISODate } from '@/utils'
import HomeContent from '@/pages/home/HomeContent'
import { Dialog, Icon, Profile } from '@/pages/home/HomePanels'
import '@/pages/home/home.css'
import TimetableView from '@/pages/schedule/TimetableView'
import ScheduleTodoTab from '@/pages/schedule/ScheduleTodoTab'
import SubjectManageView from '@/pages/store/SubjectManageView'
import HistoryView, { AdminView } from '@/pages/history/HistoryView'
import UnavailabilityDialog from '@/components/schedule/UnavailabilityDialog'
import AIFloatingChat from '@/components/common/AIFloatingChat'
import { ThemeSwitch } from './HeaderUserMenu'
import NotificationSidebar from './NotificationSidebar'
import ProfileSchoolDialog from './ProfileSchoolDialog'
import ServiceFooter from './ServiceFooter'
import { MobileNavigation, WorkspaceNavigation } from './WorkspaceNavigation'

const ScheduleCreateView = lazy(() => import('@/pages/schedule/ScheduleCreateView'))
const LessonChangesView = lazy(() => import('@/pages/schedule/LessonChangesView'))
const PasskeySettings = lazy(() => import('@/pages/auth/PasskeySettings'))
const phoneQuery = '(max-width: 719px)'

function workspaceMenu(menus) {
  return [
    { view: 'home', icon: 'home', label: '업무 홈', allowed: true },
    {
      view: 'timetable',
      icon: 'timetable',
      label: '시간표',
      allowed: menus.timetable,
    },
    { view: 'todos', icon: 'todos', label: '할 일', allowed: menus.timetable },
    {
      view: 'lesson-changes',
      icon: 'history',
      label: '보결·교환 업무',
      allowed: menus.respondToChange || menus.approve,
    },
    {
      view: 'history',
      icon: 'history',
      label: '요청 내역',
      allowed: menus.timetable,
    },
    {
      view: 'schedule-create',
      icon: 'create',
      label: '시간표 생성',
      allowed: menus.generate,
    },
    {
      view: 'subject-manage',
      icon: 'settings',
      label: '과목·수업 관리',
      allowed: menus.generate,
    },
    {
      view: 'admin',
      icon: 'school',
      label: '관리자 도구',
      allowed: menus.generate,
    },
  ].filter((item) => item.allowed)
}

function observePhone(change) {
  const media = window.matchMedia?.(phoneQuery)
  media?.addEventListener('change', change)
  return () => media?.removeEventListener('change', change)
}

function DetailView({ view, date, navigate, role }) {
  switch (view) {
    case 'timetable':
      return <TimetableView navigate={navigate} userRole={role} />
    case 'todos':
      return <ScheduleTodoTab date={toISODate()} userRole={role} />
    case 'lesson-changes':
      return <LessonChangesView initialDate={date} />
    case 'schedule-create':
      return <ScheduleCreateView />
    case 'subject-manage':
      return <SubjectManageView />
    case 'history':
      return <HistoryView navigate={navigate} userRole={role} />
    case 'admin':
      return <AdminView navigate={navigate} />
  }
}

function DetailProfile({ session, openPanel }) {
  const { choice } = useTermChoice(session)
  const { profile } = useHomeProfile(session, choice.academicYear, choice.termId)
  return (
    <Dialog title="내 프로필" onClose={() => openPanel(null)}>
      <Profile
        home={{ access: session.access, profile }}
        onSettings={() => openPanel('settings')}
        onPreferences={() => openPanel('preferences')}
      />
    </Dialog>
  )
}

function Workspace({ session, navigate: onNavigate, onLogout, onOpenPasskeys }) {
  const [page, setPage] = useState({ view: 'home' })
  const cache = useQueryClient()
  const [panel, openPanel] = useState(() => {
    const pending = cache.getQueryData(neisKeys.registration(session.identity))
    return pending?.schoolId === session.scope.schoolId ? 'settings' : null
  })
  const [theme, setTheme] = useState(getStoredTheme)
  const phone = useSyncExternalStore(
    observePhone,
    () => window.matchMedia?.(phoneQuery).matches ?? false,
  )
  const notices = useHomeNotices(session)
  const { menus, queries } = session.access
  const items = workspaceMenu(menus)
  const navigate = (view, ...args) => {
    if (!items.some((item) => item.view === view)) return
    openPanel(null)
    setPage({ view, date: args[0] })
    onNavigate?.(view, ...args)
  }
  const home = page.view === 'home'
  const role = queries.adminProfile ? 'admin' : 'worker'
  const nav = { items, currentView: page.view, navigate, onLogout }
  return (
    <div className={home ? 'school-desk' : 'school-desk desk-detail'}>
      <a className="desk-skip" href="#desk-main">
        본문으로 건너뛰기
      </a>
      <header className="desk-brand">
        <span className="desk-mark">
          <Icon name="brand" />
        </span>
        <strong>우리학교시간표</strong>
      </header>
      <header className="desk-top">
        {phone && <MobileNavigation {...nav} />}
        <div className="desk-school">
          <Icon name="school" />
          <span>{session.school?.name || '우리학교시간표'}</span>
        </div>
        <div className="desk-tools">
          <ThemeSwitch
            value={theme}
            onChange={(value) => {
              setThemePreference(value)
              setTheme(value)
            }}
          />
          {session.userId != null && (
            <button
              type="button"
              className="desk-icon"
              aria-label="패스키 관리"
              title="패스키 관리"
              onClick={onOpenPasskeys}
            >
              <Icon name="settings" />
            </button>
          )}
          {menus.notifications && (
            <button
              className="desk-icon desk-bell"
              onClick={() => openPanel('notices')}
              aria-label="알림센터 열기"
            >
              <Icon name="bell" />
              {!notices.isError && notices.data?.some((notice) => !notice.read) && <i />}
            </button>
          )}
          {menus.profile && (
            <button
              className="desk-icon desk-profile-trigger"
              onClick={() => openPanel('profile')}
              aria-label="프로필 열기"
            >
              <Icon name="person" />
            </button>
          )}
        </div>
      </header>
      {!phone && (
        <aside className="desk-sidebar">
          <p className="desk-group-label">업무 메뉴</p>
          <WorkspaceNavigation {...nav} />
        </aside>
      )}
      {home ? (
        <HomeContent session={session} navigate={navigate} panel={panel} openPanel={openPanel} />
      ) : (
        <main className="desk-main" id="desk-main" tabIndex="-1">
          <Suspense fallback={<p role="status">업무 화면을 여는 중입니다.</p>}>
            <DetailView view={page.view} date={page.date} navigate={navigate} role={role} />
          </Suspense>
          <AIFloatingChat />
        </main>
      )}
      <ServiceFooter />
      {panel === 'profile' && menus.profile && !home && (
        <DetailProfile session={session} openPanel={openPanel} />
      )}
      {panel === 'notices' && menus.notifications && (
        <Dialog title="알림센터" onClose={() => openPanel(null)}>
          <NotificationSidebar
            open
            userRole={role}
            onOpenChanges={() => navigate('lesson-changes')}
            onClose={() => openPanel(null)}
          />
        </Dialog>
      )}
      {panel === 'settings' && menus.profile && (
        <ProfileSchoolDialog isAdmin={queries.adminProfile} onClose={() => openPanel(null)} />
      )}
      {panel === 'preferences' && queries.teacherProfile && (
        <UnavailabilityDialog onClose={() => openPanel(null)} />
      )}
    </div>
  )
}

function AccountWorkspace({ session, ...props }) {
  const [passkeysOpen, setPasskeysOpen] = useState(false)
  const scope = session.scope
  return (
    <>
      <Workspace
        key={[
          scope.userId,
          scope.generation,
          scope.schoolId,
          scope.position,
          scope.employment,
        ].join('/')}
        session={session}
        onOpenPasskeys={() => setPasskeysOpen(true)}
        {...props}
      />
      {passkeysOpen && session.userId != null && (
        <Dialog title="패스키 관리" onClose={() => setPasskeysOpen(false)}>
          <Suspense fallback={<p role="status">등록 기기를 불러오는 중입니다.</p>}>
            <PasskeySettings />
          </Suspense>
        </Dialog>
      )}
    </>
  )
}

export default function SchoolWorkspace(props) {
  const session = useHomeSession()
  return <AccountWorkspace key={session.userId} session={session} {...props} />
}
