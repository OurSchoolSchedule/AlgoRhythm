import { useIsMutating } from '@tanstack/react-query'
import { logout } from '@/api/auth'
import { readMeals, type MealRange } from '@/api/meals'
import { useScopedRead, type HomeSession } from './useHomeSession'
import { neisKeys } from './useNeisSchool'

export function useMealsPaused() {
  // Logout has no mutation key. FE-N1's link mutation accepts { option, version }.
  return (
    useIsMutating({
      predicate: (mutation) => {
        if (mutation.options.mutationFn === logout) return true
        const change = mutation.state.variables as
          | { option?: { standardSchoolCode?: string }; version?: number }
          | undefined
        return (
          typeof change?.option?.standardSchoolCode === 'string' && Number.isInteger(change.version)
        )
      },
    }) > 0
  )
}

export function useSchoolMeals(
  session: HomeSession,
  schoolId: number,
  version: number,
  range: MealRange,
) {
  return useScopedRead(
    session,
    [...neisKeys.meals(schoolId), version, range.from, range.to],
    session.access.queries.datedLessons &&
      !session.switching &&
      schoolId === session.scope.schoolId,
    (signal) => readMeals(schoolId, version, range, signal),
    { retry: false, gcTime: 0 },
  )
}
