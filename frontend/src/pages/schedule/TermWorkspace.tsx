import { useState, type ReactNode } from 'react'
import { useHomeSession, type HomeSession } from '@/hooks/useHomeSession'
import { useTermChoice } from '@/hooks/useTermChoice'
import type { HomeTerm } from '@/types/datedLesson'
import { Dialog, TermForm } from '@/pages/home/HomePanels'
import RegisterTerm from './RegisterTerm'
import './operations.css'

interface Props {
  title: string
  adminOnly?: boolean
  children: (term: HomeTerm, session: HomeSession) => ReactNode
}
function ScopedWorkspace({
  title,
  adminOnly,
  children,
  session,
}: Props & { session: HomeSession }) {
  const { choice, term, saveChoice } = useTermChoice(session)
  const [editing, setEditing] = useState(false)
  const allowed = adminOnly ? session.access.actions.generate : session.access.queries.datedLessons
  return (
    <section className="schedule-work">
      <header className="work-heading">
        <div>
          <small>{session.school?.name ?? '학교 업무'}</small>
          <h1>{title}</h1>
        </div>
        {allowed && (
          <button onClick={() => setEditing(true)}>
            {choice.academicYear}학년도 {choice.semester}학기 · 학기 설정
          </button>
        )}
      </header>
      {!allowed ? (
        <p role="status">
          {session.active.isLoading || session.switching
            ? '학교 권한을 확인하고 있습니다.'
            : session.active.isError
              ? '활성 학교 조회에 실패했습니다.'
              : '이 업무를 수행할 권한이 없습니다.'}
        </p>
      ) : term ? (
        <div key={[term.academicYear, term.semester, term.termId].join('/')}>
          {children(term, session)}
        </div>
      ) : (
        <section className="work-card">
          <h2>업무 학기 연결</h2>
          <p>학교에서 발급한 학기 ID를 입력하세요. 홈과 같은 학기를 사용합니다.</p>
          <button className="work-primary" onClick={() => setEditing(true)}>
            학기 연결
          </button>
          {adminOnly && (
            <RegisterTerm session={session} choice={choice} onRegistered={saveChoice} />
          )}
        </section>
      )}
      {editing && allowed && (
        <Dialog title="업무 학기 설정" onClose={() => setEditing(false)}>
          <TermForm
            current={choice}
            onApply={(v: typeof choice) => {
              saveChoice(v)
              setEditing(false)
            }}
          />
        </Dialog>
      )}
    </section>
  )
}
export default function TermWorkspace(props: Props) {
  const session = useHomeSession()
  return <ScopedWorkspace {...props} session={session} key={JSON.stringify(session.scope)} />
}
