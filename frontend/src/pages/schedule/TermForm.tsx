import { useId, useState } from 'react'
import type { HomeSession } from '@/hooks/useHomeSession'
import type { TermChoice } from '@/hooks/useTermChoice'
import type { RegisteredTerm } from '@/api/terms'
import RegisterTerm from './RegisterTerm'
import './term-form.css'

export function TermStatus({ state, onRegister }: { state: TermChoice; onRegister?: () => void }) {
  if (state.list.isError)
    return (
      <div role="alert">
        학기 목록을 불러오지 못했습니다.{' '}
        <button type="button" onClick={() => state.list.refetch()}>
          다시 조회
        </button>
      </div>
    )
  if (!state.list.isSuccess) return <p role="status">학교 학기를 불러오는 중입니다.</p>
  return (
    <div>
      <p>등록된 학기가 없습니다.</p>
      {onRegister && (
        <button type="button" onClick={onRegister}>
          새 학기 등록
        </button>
      )}
    </div>
  )
}

export default function TermForm({
  session,
  state,
  onClose,
  onApplied,
}: {
  session: HomeSession
  state: TermChoice
  onClose: () => void
  onApplied?: () => void
}) {
  const selectId = useId()
  const [draft, setDraft] = useState<number | null>(null)
  const selected = state.terms.find((t) => t.termId === draft) ?? state.term
  function apply(value: RegisteredTerm) {
    state.saveChoice(value)
    onApplied?.()
    onClose()
  }
  return (
    <div className="term-settings">
      <form
        className="desk-form"
        onSubmit={(event) => {
          event.preventDefault()
          const value = state.terms.find((t) => t.termId === selected?.termId)
          if (value) apply(value)
        }}
      >
        {state.terms.length ? (
          <div className="term-field">
            <label htmlFor={selectId}>등록된 학기</label>
            <select
              id={selectId}
              value={selected?.termId}
              onChange={(event) => setDraft(Number(event.target.value))}
            >
              {state.terms.map((t) => (
                <option key={t.termId} value={t.termId}>
                  {t.academicYear}학년도 {t.semester}학기
                </option>
              ))}
            </select>
          </div>
        ) : (
          <TermStatus state={state} />
        )}
        <div className="term-actions">
          {state.terms.length > 0 && (
            <button className="term-apply" type="submit">
              선택한 학기 적용
            </button>
          )}
          <button type="button" onClick={onClose}>
            취소
          </button>
        </div>
      </form>
      {session.access.actions.generate && state.list.isSuccess && (
        <RegisterTerm
          session={session}
          choice={state.choice}
          empty={!state.terms.length}
          onRegistered={apply}
        />
      )}
    </div>
  )
}
