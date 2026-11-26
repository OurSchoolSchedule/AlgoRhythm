import { DetailHeading } from '@/components/ui/DetailPage'
import { useState, type ReactNode } from 'react'
import { useHomeSession, type HomeSession } from '@/hooks/useHomeSession'
import { useTermChoice } from '@/hooks/useTermChoice'
import type { HomeTerm } from '@/types/datedLesson'
import { Dialog } from '@/pages/home/HomePanels'
import TermForm, { TermStatus } from './TermForm'
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
  const [editing, setEditing] = useState(false)
  const allowed = adminOnly ? session.access.actions.generate : session.access.queries.datedLessons
  const state = useTermChoice(session, allowed)
  const { term } = state
  return (
    <section className="detail-page schedule-work">
      <DetailHeading title={title} context={session.school?.name}>
        {allowed && (
          <button className="desk-term-button" onClick={() => setEditing(true)}>
            {term ? `${term.academicYear}학년도 ${term.semester}학기 · 학기 설정` : '학기 설정'}
          </button>
        )}
      </DetailHeading>
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
          <TermStatus
            state={state}
            onRegister={session.access.actions.generate ? () => setEditing(true) : undefined}
          />
        </section>
      )}
      {editing && allowed && (
        <Dialog title="업무 학기 설정" onClose={() => setEditing(false)}>
          <TermForm session={session} state={state} onClose={() => setEditing(false)} />
        </Dialog>
      )}
    </section>
  )
}
export default function TermWorkspace(props: Props) {
  const session = useHomeSession()
  return <ScopedWorkspace {...props} session={session} key={JSON.stringify(session.scope)} />
}
