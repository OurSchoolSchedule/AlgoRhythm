import { useState, type FormEvent, type ReactNode } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import type { RegisteredTerm } from '@/api/terms'
import type { HomeSession } from '@/hooks/useHomeSession'
import type { TermChoice } from '@/hooks/useTermChoice'
import { useSaveSchoolTerm } from '@/hooks/useSaveSchoolTerm'
import { queryKeys } from '@/hooks/queryKeys'
import { excludedDatesError } from '@/utils/termExcludedDates'
import TermExcludedDates from './TermExcludedDates'
import { TermStatus } from './TermForm'

interface Fields {
  original?: RegisteredTerm
  academicYear: string
  semester: number
  startDate: string
  endDate: string
  excludedDates: string[]
}

function fields(year: number | string, semester: number, term?: RegisteredTerm): Fields {
  return {
    original: term,
    academicYear: String(year),
    semester,
    startDate: term?.startDate ?? '',
    endDate: term?.endDate ?? '',
    excludedDates: term?.excludedDates ?? [],
  }
}

function sameDates(
  a: Pick<RegisteredTerm, 'startDate' | 'endDate' | 'excludedDates'>,
  b: RegisteredTerm,
) {
  return (
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    JSON.stringify(a.excludedDates ?? []) === JSON.stringify(b.excludedDates ?? [])
  )
}

interface Props {
  session: HomeSession
  state: TermChoice
  children: ReactNode
}

export default function GenerationTermSetup({ session, state, children }: Props) {
  const { terms, term, choice } = state
  const [draft, setDraft] = useState<Fields | null>(null)
  const [message, setMessage] = useState('')
  const activeId = term?.termId ?? null
  const generating = useIsMutating({
    mutationKey: queryKeys.schedule.generationAccepted(activeId, session.scope),
    exact: true,
  })
  const publishing = useIsMutating({
    mutationKey: queryKeys.schedule.publication(activeId, session.scope),
    exact: true,
  })
  function apply(saved: RegisteredTerm) {
    state.saveChoice(saved)
    setDraft(null)
    setMessage(`${saved.academicYear}학년도 ${saved.semester}학기를 적용했습니다.`)
  }
  const operation = useSaveSchoolTerm(session, apply)
  if (!state.list.isSuccess)
    return (
      <section className="work-card">
        <TermStatus state={state} />
      </section>
    )
  const active = terms.find((t) => t.termId === activeId)
  const form = draft ?? fields(choice.academicYear, choice.semester, active)
  const existing = terms.find(
    (t) => t.academicYear === Number(form.academicYear) && t.semester === form.semester,
  )
  const unchanged = Boolean(existing && sameDates(form, existing))
  const stale = Boolean(
    draft && existing && !unchanged && (!form.original || !sameDates(form.original, existing)),
  )
  const applied = unchanged && activeId === existing?.termId
  const busy = operation.busy || generating > 0 || publishing > 0
  const datesError = excludedDatesError(form.startDate, form.endDate, form.excludedDates)
  function edit(next: Fields) {
    setMessage('')
    operation.clearError()
    setDraft(next)
  }
  function changeIdentity(year: string, semester: number) {
    const saved = terms.find((t) => t.academicYear === Number(year) && t.semester === semester)
    // Never propose another registered term's dates or exceptions for a new identity.
    edit(
      saved || existing ? fields(year, semester, saved) : { ...form, academicYear: year, semester },
    )
  }
  function choose(id: string) {
    const saved = terms.find((t) => t.termId === Number(id))
    if (saved) {
      edit(fields(saved.academicYear, saved.semester, saved))
      return
    }
    let { academicYear, semester } = choice
    while (terms.some((t) => t.academicYear === academicYear && t.semester === semester)) {
      academicYear += semester === 2 ? 1 : 0
      semester = semester === 1 ? 2 : 1
    }
    edit(fields(academicYear, semester))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (
      busy ||
      stale ||
      datesError ||
      !form.startDate ||
      !form.endDate ||
      form.startDate > form.endDate
    )
      return
    if (existing && unchanged) apply(existing)
    else
      await operation.save(
        {
          academicYear: Number(form.academicYear),
          semester: form.semester,
          startDate: form.startDate,
          endDate: form.endDate,
          excludedDates: form.excludedDates,
        },
        form.original,
      )
  }
  return (
    <>
      <section className="work-card generation-term" aria-label="생성할 학기 설정">
        <h2>생성할 학기 설정</h2>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            {terms.length > 0 && (
              <label>
                등록된 학기
                <select
                  aria-label="등록된 학기"
                  value={existing?.termId ?? 'new'}
                  onChange={(e) => choose(e.target.value)}
                >
                  {terms.map((t) => (
                    <option key={t.termId} value={t.termId}>
                      {t.academicYear}학년도 {t.semester}학기
                    </option>
                  ))}
                  <option value="new">새 학기 등록</option>
                </select>
              </label>
            )}
            <div className="generation-term-fields">
              <label>
                학년도
                <input
                  type="number"
                  min="1900"
                  max="9999"
                  required
                  value={form.academicYear}
                  onChange={(e) => changeIdentity(e.target.value, form.semester)}
                />
              </label>
              <label>
                학기
                <select
                  aria-label="학기"
                  value={form.semester}
                  onChange={(e) => changeIdentity(form.academicYear, Number(e.target.value))}
                >
                  <option value="1">1학기</option>
                  <option value="2">2학기</option>
                </select>
              </label>
              <label>
                시작일자
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => edit({ ...form, startDate: e.target.value })}
                />
              </label>
              <label>
                마감일자
                <input
                  type="date"
                  required
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) => edit({ ...form, endDate: e.target.value })}
                />
              </label>
            </div>
            <TermExcludedDates
              key={existing?.termId ?? `${form.academicYear}/${form.semester}`}
              startDate={form.startDate}
              endDate={form.endDate}
              value={form.excludedDates}
              onChange={(excludedDates) => edit({ ...form, excludedDates })}
            />
            <div className="term-actions">
              <button
                type="submit"
                className="work-primary"
                disabled={(applied && !operation.error) || Boolean(datesError) || stale}
              >
                {operation.busy
                  ? '저장 중…'
                  : applied && !operation.error
                    ? '적용 중인 학기'
                    : !existing
                      ? '새 학기 등록 및 적용'
                      : unchanged
                        ? '선택한 학기 적용'
                        : '학기 변경 저장'}
              </button>
              {draft && !applied && active && (
                <button
                  type="button"
                  onClick={() => {
                    operation.clearError()
                    setDraft(null)
                  }}
                >
                  취소
                </button>
              )}
            </div>
          </fieldset>
        </form>
        {stale && existing && (
          <div className="work-error" role="alert">
            다른 사용자가 학기 설정을 저장했습니다. 현재 입력을 확인한 뒤 최신 설정을 불러오세요.{' '}
            <button type="button" onClick={() => choose(String(existing.termId))}>
              최신 설정 불러오기
            </button>
          </div>
        )}
        {operation.error && !stale && (
          <p role="alert" className="work-error">
            {operation.error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {active && !applied && <p>학기를 적용하면 해당 학기의 시수표를 검증할 수 있습니다.</p>}
      </section>
      <div hidden={!applied}>{children}</div>
    </>
  )
}
