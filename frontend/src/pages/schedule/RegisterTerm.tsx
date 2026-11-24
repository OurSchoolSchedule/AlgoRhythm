import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { registerTerm } from '@/api/terms'
import type { HomeSession } from '@/hooks/useHomeSession'
import { assertHiredSchool } from '@/hooks/useSchoolTerm'
import { operationError } from '@/utils/operationInputs'
import type { HomeTerm } from '@/types/datedLesson'

type Choice = Omit<HomeTerm, 'schoolId' | 'termId'> & { termId: number | null }
export default function RegisterTerm({
  session,
  choice,
  onRegistered,
}: {
  session: HomeSession
  choice: Choice
  onRegistered: (choice: Choice) => void
}) {
  const cache = useQueryClient()
  const flight = useRef<AbortController | null>(null)
  useLayoutEffect(() => () => flight.current?.abort(), [])
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (flight.current || !session.access.actions.generate) return
    const input = new FormData(e.currentTarget)
    const request = {
      academicYear: Number(input.get('year')),
      semester: Number(input.get('semester')),
      startDate: String(input.get('start')),
      endDate: String(input.get('end')),
    }
    const controller = new AbortController()
    flight.current = controller
    setBusy(true)
    setError('')
    try {
      assertHiredSchool(cache, session)
      const termId = await registerTerm(request, controller.signal)
      controller.signal.throwIfAborted()
      assertHiredSchool(cache, session)
      onRegistered({ academicYear: request.academicYear, semester: request.semester, termId })
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          isAxiosError(err) && err.response?.status === 409
            ? '이미 등록된 학기 또는 기간입니다 (409). 학교에서 확인한 학기 ID로 연결하세요.'
            : operationError(err),
        )
    } finally {
      flight.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <details>
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
            <label>
              학기
              <select name="semester" defaultValue={choice.semester}>
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
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
      {error && <p role="alert">{error}</p>}
    </details>
  )
}
