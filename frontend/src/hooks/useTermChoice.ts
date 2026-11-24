import { useState } from 'react'
import type { HomeTerm } from '@/types/datedLesson'
import type { HomeSession } from './useHomeSession'
import { schoolDate } from '@/utils/homeContract'

type Choice = Pick<HomeTerm, 'academicYear' | 'semester'> & { termId: number | null }

// Callers key their subtree by account and active school, including during school switches.
export function useTermChoice(session: HomeSession) {
  const [year, month] = schoolDate(new Date()).split('-').map(Number)
  const fallback: Choice = {
    academicYear: month < 3 ? year - 1 : year,
    semester: month >= 3 && month <= 7 ? 1 : 2,
    termId: null,
  }
  const key = `school-home-term/${session.userId}/${session.school?.schoolId}/${fallback.academicYear}/${fallback.semester}`
  const [choice, setChoice] = useState<Choice>(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(key) ?? 'null')
      if (
        v &&
        Number.isSafeInteger(v.academicYear) &&
        v.academicYear >= 1900 &&
        v.academicYear <= 9999 &&
        [1, 2].includes(v.semester) &&
        (v.termId === null || (Number.isSafeInteger(v.termId) && v.termId > 0))
      ) {
        return { academicYear: v.academicYear, semester: v.semester, termId: v.termId }
      }
    } catch {
      /* Storage is optional. */
    }
    return fallback
  })
  function saveChoice(next: Choice) {
    setChoice(next)
    try {
      sessionStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* Keep this selection in memory. */
    }
  }
  const weeklyTerm = session.school ? { ...choice, schoolId: session.school.schoolId } : null
  const term =
    weeklyTerm && choice.termId !== null ? { ...weeklyTerm, termId: choice.termId } : null
  return { choice, saveChoice, weeklyTerm, term }
}
