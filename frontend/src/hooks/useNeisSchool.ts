import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getActiveStore } from '@/api/mypage'
import { getSessionVersion, hasPendingSchool } from '@/api/tokenStorage'
import {
  getSchoolLink,
  patchSchoolLink,
  searchSchools,
  type SchoolOption,
  type SchoolSearch,
} from '@/api/neisSchool'
import { useScopedRead, type HomeSession } from './useHomeSession'
import { queryKeys } from './queryKeys'

export const neisKeys = {
  link: (schoolId: number | null) => ['neis', 'link', schoolId] as const,
  meals: (schoolId: number) => ['neis', 'meals', schoolId] as const,
  registration: (identity: HomeSession['identity']) => ['neis', 'registration', identity] as const,
}

export function canManageSchoolLink(scope: HomeSession['scope']) {
  return scope.schoolId !== null && scope.position === 'ADMIN' && scope.employment === 'HIRED'
}

export function useSchoolSearch(session: HomeSession, params: SchoolSearch, enabled: boolean) {
  return useScopedRead(
    session,
    ['neis', 'search', params],
    enabled &&
      session.userId !== null &&
      !session.switching &&
      (canManageSchoolLink(session.scope) ||
        (session.scope.schoolId === null && hasPendingSchool())),
    (signal) => searchSchools(params, signal),
    { retry: false },
  )
}

export function useSchoolLink(session: HomeSession) {
  const id = session.scope.schoolId
  return useScopedRead(
    session,
    neisKeys.link(id),
    id !== null &&
      session.scope.employment === 'HIRED' &&
      (session.scope.position === 'ADMIN' || session.scope.position === 'TEACHER'),
    (signal) => getSchoolLink(id!, signal),
    { retry: false },
  )
}

export function useChangeSchoolLink(session: HomeSession) {
  const cache = useQueryClient()
  const { scope, identity } = session
  const activeKey = queryKeys.home.active(identity)
  const linkKey = [...neisKeys.link(scope.schoolId), scope]
  function stillCurrent() {
    return (
      scope.generation === getSessionVersion() &&
      !cache.isMutating({
        mutationKey: queryKeys.home.switchSchool(identity),
      }) &&
      cache.getQueryData<{ schoolId: number }>(activeKey)?.schoolId === scope.schoolId
    )
  }
  return useMutation({
    retry: false,
    mutationFn: async ({ option, version }: { option: SchoolOption; version: number }) => {
      const id = scope.schoolId
      if (!id || !stillCurrent() || !canManageSchoolLink(scope))
        throw new Error('활성 학교를 다시 확인해 주세요.')
      // Switch acknowledgements and cached profile values are insufficient for a write.
      const active = await getActiveStore()
      if (
        active.schoolId !== id ||
        active.position !== 'ADMIN' ||
        active.employmentStatus !== 'HIRED' ||
        !stillCurrent()
      ) {
        await cache.invalidateQueries({ queryKey: activeKey, exact: true })
        throw new Error('활성 학교가 바뀌었습니다. 학교를 확인해 주세요.')
      }
      return patchSchoolLink(id, option, version)
    },
    onSuccess: async (link) => {
      if (!stillCurrent()) return
      await cache.cancelQueries({ queryKey: linkKey, exact: true })
      if (!stillCurrent()) return
      cache.setQueryData(linkKey, link)
      const meals = { queryKey: neisKeys.meals(link.schoolId) }
      await cache.cancelQueries(meals)
      await cache.invalidateQueries(meals)
    },
    onError: async (error) => {
      if (isAxiosError(error) && error.response?.status === 409 && stillCurrent())
        await cache.invalidateQueries({ queryKey: linkKey, exact: true })
    },
  })
}
