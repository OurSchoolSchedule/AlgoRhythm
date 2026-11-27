import { useId, type FormEvent } from 'react'
import type { RegisteredTerm } from '@/api/terms'
import type { HomeSession } from '@/hooks/useHomeSession'
import { useSaveSchoolTerm } from '@/hooks/useSaveSchoolTerm'
import type { HomeTerm } from '@/types/datedLesson'

type Choice = Omit<HomeTerm, 'schoolId' | 'termId'> & { termId: number | null }
export default function RegisterTerm({
  session,
  choice,
  empty,
  onRegistered,
}: {
  session: HomeSession
  choice: Choice
  empty: boolean
  onRegistered: (choice: RegisteredTerm) => void
}) {
  const semesterId = useId()
  const { save, busy, error } = useSaveSchoolTerm(session, onRegistered)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = new FormData(e.currentTarget)
    const request = {
      academicYear: Number(input.get('year')),
      semester: Number(input.get('semester')),
      startDate: String(input.get('start')),
      endDate: String(input.get('end')),
    }
    await save(request)
  }
  return (
    <details open={empty || Boolean(error) || undefined}>
      <summary>새 학기 등록</summary>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <legend>등록할 학기</legend>
          <div className="work-row">
            <label>
              학년도
              <input
                type="number"
                name="year"
                defaultValue={choice.academicYear}
                min="1900"
                max="9999"
                required
              />
            </label>
            <div className="term-field">
              <label htmlFor={semesterId}>학기</label>
              <select id={semesterId} name="semester" defaultValue={choice.semester}>
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <label>
              시작일
              <input type="date" name="start" required />
            </label>
            <label>
              종료일
              <input type="date" name="end" required />
            </label>
          </div>
          <button>새 학기 등록 확정</button>
        </fieldset>
      </form>
      {error && (
        <p className="work-error" role="alert">
          {error}
        </p>
      )}
    </details>
  )
}
