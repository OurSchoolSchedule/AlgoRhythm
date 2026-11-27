import { useLayoutEffect, useRef, useState } from 'react'
import { hashKey, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { registerTerm, updateTerm, termsKey, type NewTerm, type RegisteredTerm } from '@/api/terms'
import { operationError } from '@/utils/operationInputs'
import { assertHiredSchool } from './useSchoolTerm'
import { publicationTimetables } from './publicationCache'
import type { HomeSession } from './useHomeSession'

export function useSaveSchoolTerm(session: HomeSession, onSaved: (term: RegisteredTerm) => void) {
  const cache = useQueryClient()
  const flight = useRef<AbortController | null>(null)
  useLayoutEffect(() => () => flight.current?.abort(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(input: NewTerm, original?: RegisteredTerm) {
    if (flight.current || !session.access.actions.generate) return
    const startsBeforeYear = input.startDate.slice(0, 4) < String(input.academicYear)
    const endsAfterFebruary = input.endDate.slice(0, 7) > `${input.academicYear + 1}-02`
    const datesChanged = !original || original.startDate !== input.startDate || original.endDate !== input.endDate
    if (
      datesChanged &&
      (startsBeforeYear || endsAfterFebruary) &&
      !window.confirm(
        `${input.academicYear}학년도 ${input.semester}학기와 입력한 기간(${input.startDate} ~ ${input.endDate})의 연도가 다릅니다. 이 설정으로 저장할까요?`,
      )
    ) return
    const controller = new AbortController()
    flight.current = controller
    setBusy(true)
    setError('')
    const queryKey = [...termsKey, session.scope]
    function checkAccess() {
      controller.signal.throwIfAborted()
      assertHiredSchool(cache, session)
    }
    try {
      checkAccess()
      const { startDate, endDate, excludedDates = [] } = input
      const saved = original
        ? await updateTerm(
            original.termId,
            {
              startDate,
              endDate,
              excludedDates,
              expectedCalendar: {
                startDate: original.startDate,
                endDate: original.endDate,
                excludedDates: original.excludedDates ?? [],
              },
            },
            controller.signal,
          )
        : { ...input, termId: await registerTerm(input, controller.signal) }
      checkAccess()
      await cache.cancelQueries({ queryKey, exact: true })
      checkAccess()
      cache.setQueryData<RegisteredTerm[]>(queryKey, (list = []) =>
        [saved, ...list.filter((t) => t.termId !== saved.termId)].sort(
          (a, b) => b.startDate.localeCompare(a.startDate) || b.termId - a.termId,
        ),
      )
      if (original && session.school) {
        const term = { ...saved, schoolId: session.school.schoolId }
        const affectedTimetables = publicationTimetables(term, session.scope, '')
        const owner = hashKey([session.scope])
        void cache.invalidateQueries({
          predicate: (q) =>
            affectedTimetables(q) ||
            (q.queryKey[0] === 'lesson-change-candidates' &&
              q.queryKey[1] === original.termId &&
              hashKey([q.queryKey.at(-1)]) === owner),
        })
      }
      onSaved(saved)
      void cache.invalidateQueries({ queryKey, exact: true })
    } catch (err) {
      if (controller.signal.aborted) return
      if (isAxiosError(err) && err.response?.status === 409) {
        setError(
          err.response.data?.code === 'TERM_EXISTS'
            ? '이미 등록된 학기 또는 기간입니다. 목록에서 기존 학기를 선택하거나 기간을 조정하세요.'
            : operationError(err),
        )
        void cache.invalidateQueries({ queryKey, exact: true })
      } else {
        setError(operationError(err))
      }
    } finally {
      flight.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return { save, busy, error, clearError: () => setError('') }
}
