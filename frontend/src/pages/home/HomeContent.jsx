import { useState } from 'react'
import { useSchoolHome } from '@/hooks/useSchoolHome'
import { useTimetableDate } from '@/hooks/useTimetableDate'
import { useTermChoice } from '@/hooks/useTermChoice'
import AIFloatingChat from '@/components/common/AIFloatingChat'
import { Actions, Dialog, Icon, Notices, Profile } from './HomePanels'
import TermForm, { TermStatus } from '@/pages/schedule/TermForm'
import HomeTimetable from './HomeTimetable'

export default function HomeContent({ session, navigate, panel, openPanel }) {
  const state = useTermChoice(session)
  const { term, weeklyTerm } = state
  const { date, setDate } = useTimetableDate(session, term)
  const [classId, setClassId] = useState(null)
  const [editingTerm, setEditingTerm] = useState(false)
  const home = useSchoolHome({ term, weeklyTerm, classId, date })
  const { menus } = home.access
  const shortcuts = [
    ...(menus.generate
      ? [
          {
            icon: 'create',
            label: '시간표 생성',
            run: () => navigate('schedule-create'),
          },
        ]
      : []),
    ...(menus.requestSwap
      ? [
          {
            icon: 'timetable',
            label: '수업 교환 신청',
            run: () => navigate('lesson-changes'),
          },
        ]
      : []),
    ...(menus.respondToChange || menus.approve
      ? [
          {
            icon: 'bell',
            label: menus.approve ? '변경 신청 승인' : '변경 신청 응답',
            run: () => navigate('lesson-changes'),
          },
        ]
      : []),
    { icon: 'todos', label: '할 일 확인', run: () => navigate('todos') },
  ]
  const profile = (
    <Profile
      home={home}
      onSettings={() => openPanel('settings')}
      onPreferences={() => openPanel('preferences')}
    />
  )
  let accessMessage = '이 계정에서 사용할 수 있는 학교 시간표 조회 권한이 없습니다.'
  if (home.activeSchool.state === 'loading') accessMessage = '활성 학교를 확인하고 있습니다.'
  else if (home.activeSchool.state === 'error') accessMessage = '활성 학교 조회에 실패했습니다.'
  else if (home.activeSchool.state === 'forbidden')
    accessMessage = '활성 학교 조회 권한이 없습니다.'
  else if (!session.userId) accessMessage = '학교 계정으로 로그인하면 시간표를 확인할 수 있습니다.'
  return (
    <>
      <main className="desk-main" id="desk-main" tabIndex="-1">
        <div className="desk-title">
          <div>
            <p>
              {new Intl.DateTimeFormat('ko-KR', {
                dateStyle: 'full',
                timeZone: 'UTC',
              }).format(new Date(home.today + 'T12:00:00Z'))}
            </p>
            <h1>업무 홈</h1>
          </div>
          {session.access.queries.datedLessons && (
            <button
              className="desk-term-button"
              aria-label="조회 학기 설정"
              onClick={() => setEditingTerm(true)}
            >
              <Icon name="settings" />
              {term ? `${term.academicYear}학년도 ${term.semester}학기` : '학기 설정'}
            </button>
          )}
        </div>
        {menus.timetable ? (
          <>
            <HomeTimetable
              key={term?.termId ?? 'legacy'}
              term={term}
              session={session}
              home={home}
              onRequest={(selection) => navigate('lesson-changes', selection.date, selection)}
              setDate={setDate}
              setRoom={setClassId}
              termStatus={<TermStatus state={state} onRegister={session.access.actions.generate ? () => setEditingTerm(true) : undefined} />}
            />
            <div className="desk-lower">
              <Notices home={home} onOpen={() => openPanel('notices')} />
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
      {panel === 'profile' && menus.profile && (
        <Dialog title="내 프로필" onClose={() => openPanel(null)}>
          {profile}
        </Dialog>
      )}
      {editingTerm && menus.timetable && (
        <Dialog title="조회 학기 설정" onClose={() => setEditingTerm(false)}>
          <TermForm
            session={session}
            state={state}
            onClose={() => setEditingTerm(false)}
            onApplied={() => setClassId(null)}
          />
        </Dialog>
      )}
    </>
  )
}
