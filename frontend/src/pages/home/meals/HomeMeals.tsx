import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { neisKeys, useSchoolLink } from '@/hooks/useNeisSchool'
import type { HomeSession } from '@/hooks/useHomeSession'
import { useMealsPaused, useSchoolMeals } from '@/hooks/useSchoolMeals'
import MealsCard, { type MealRead } from './MealsCard'
import { mealWeek } from './mealWeek'
import { MealContextError } from '@/api/meals'

interface Props {
  today: string
  session: HomeSession
  onOpenSchoolSettings: () => void
}

type Selection = Omit<Props, 'onOpenSchoolSettings'> & {
  date: string
  selectDate: (date: string) => void
  openSchoolSettings?: () => void
}

function LinkedMeals({
  schoolId,
  version,
  refreshLink,
  ...props
}: Selection & {
  schoolId: number
  version: number
  refreshLink: () => void
}) {
  const { today, date, session } = props
  const days = mealWeek(today)
  const range =
    date === today
      ? { from: today, to: today, today: true }
      : { from: days[0], to: days[6], today: false }
  const meals = useSchoolMeals(session, schoolId, version, range)
  let result: MealRead = { state: 'loading' }
  if (meals.isError) {
    result = {
      state: 'error',
      retry: meals.error instanceof MealContextError ? refreshLink : () => void meals.refetch(),
    }
  } else if (meals.data) {
    result = { state: 'ready', data: meals.data }
  }
  return <MealsCard {...props} result={result} />
}

function ScopedMeals({ session, today, onOpenSchoolSettings }: Props) {
  const cache = useQueryClient()
  const link = useSchoolLink(session)
  const [choice, setChoice] = useState<string | null>(null)
  const days = mealWeek(today)
  const date = choice && days.includes(choice) ? choice : today
  const selection = {
    today,
    date,
    session,
    selectDate: (d: string) => setChoice(d === today ? null : d),
    openSchoolSettings: session.scope.position === 'ADMIN' ? onOpenSchoolSettings : undefined,
  }
  async function refreshLink() {
    const refreshed = await link.refetch()
    const current = refreshed.data
    if (refreshed.isError || current?.status !== 'LINKED') return
    // A fast link read can finish in the same render with the same version.
    // Resume the failed, still-observed meal read even when no remount occurs.
    await cache.refetchQueries(
      {
        queryKey: [...neisKeys.meals(current.schoolId), current.version],
        type: 'active',
        predicate: (query) => query.state.status === 'error',
      },
      { cancelRefetch: false },
    )
  }
  let result: MealRead = { state: 'loading' }
  if (link.isError) result = { state: 'error', retry: refreshLink }
  else if (!link.isFetching && link.data) {
    if (link.data.schoolId !== session.scope.schoolId)
      result = { state: 'error', retry: refreshLink }
    else if (link.data.status === 'NOT_LINKED') result = { state: 'unlinked' }
    else
      return (
        <LinkedMeals
          key={link.data.version}
          {...selection}
          schoolId={link.data.schoolId}
          version={link.data.version}
          refreshLink={refreshLink}
        />
      )
  }
  return <MealsCard {...selection} result={result} />
}

export default function HomeMeals(props: Props) {
  const paused = useMealsPaused()
  if (paused || props.session.switching || !props.session.access.queries.datedLessons) return null
  return <ScopedMeals {...props} />
}
