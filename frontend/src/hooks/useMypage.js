import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  updateActiveStore,
  getOwnerProfile,
  updateOwnerProfile,
  getOwnerStore,
  updateOwnerStore,
  getOwnerStores,
  createOwnerStore,
  deleteOwnerStore,
  getStaffProfile,
  updateStaffProfile,
  getStaffStores,
  joinStaffStore,
  leaveStaffStore,
} from '@/api'
import { useHomeSession, useScopedRead } from './useHomeSession'
import { getSessionVersion, notifySchoolSwitch } from '@/api/tokenStorage.js'
import { queryKeys } from './queryKeys.js'

// ===== 활성 매장 =====

export function useActiveStore(options = {}) {
  const { active, school, switching } = useHomeSession(options)
  return { ...active, data: school ?? undefined, isLoading: switching || active.isLoading }
}

export function useUpdateActiveStore() {
  const queryClient = useQueryClient()
  const { identity } = useHomeSession()
  const activeKey = queryKeys.home.active(identity)
  return useMutation({
    mutationKey: queryKeys.home.switchSchool(identity),
    scope: { id: 'switch-active-school' },
    onMutate: async () => {
      await queryClient.cancelQueries({
        predicate: ({ queryKey }) => {
          const scope = queryKey.at(-1)
          return scope?.userId === identity.userId && scope.generation === identity.generation
        },
      })
      return identity
    },
    mutationFn: (/** @type {number} */ schoolId) => {
      if (identity.generation !== getSessionVersion()) throw new Error('로그인 세션이 변경되었습니다.')
      return updateActiveStore(schoolId)
    },
    onSuccess: (school, _id, previous) => {
      if (previous.generation !== getSessionVersion()) return
      queryClient.removeQueries({
        predicate: ({ queryKey }) => {
          const scope = queryKey.at(-1)
          return scope?.userId === previous.userId && scope.generation === previous.generation
            && scope.schoolId != null && scope.schoolId !== school.schoolId
        },
      })
      notifySchoolSwitch()
      queryClient.setQueryData(activeKey, school)
      queryClient.invalidateQueries({ queryKey: ['store'], refetchType: 'none' })
      queryClient.invalidateQueries({ queryKey: ['mypage'], predicate: q => q.queryKey[1] !== 'active-store' })
    },
    // A lost PATCH response can still mean the server switched school.
    onError: async (_error, _id, previous) => {
      if (previous?.generation === getSessionVersion()) {
        await queryClient.resetQueries({ queryKey: activeKey })
      }
    },
  })
}

// ===== 사장(Owner) =====

export function useOwnerProfile(options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.mypage.ownerProfile(), session.access.queries.adminProfile,
    signal => getOwnerProfile({ signal }), options)
}

function useSaveAccountName(update, prefix) {
  const cache = useQueryClient()
  const { scope } = useHomeSession()
  return useMutation({
    mutationFn: update,
    onSuccess: async (saved) => {
      if (saved.userId !== scope.userId || scope.generation !== getSessionVersion()) return
      const key = [...prefix, scope]
      await cache.cancelQueries({ queryKey: key, exact: true })
      if (scope.generation !== getSessionVersion()) return
      cache.setQueryData(key, saved)
      // A legacy directory can display the account name when there is no roster name.
      void cache.invalidateQueries({ queryKey: queryKeys.home.directory() })
      for (const profileKey of [queryKeys.mypage.ownerProfile(), queryKeys.mypage.staffProfile()]) {
        void cache.invalidateQueries({
          queryKey: profileKey,
          predicate: (query) => query.queryKey.at(-1)?.userId === saved.userId,
        })
      }
    },
  })
}

export function useUpdateOwnerProfile() {
  return useSaveAccountName(updateOwnerProfile, queryKeys.mypage.ownerProfile())
}

export function useOwnerStore(options = {}) {
  return useQuery({
    queryKey: queryKeys.mypage.ownerStore(),
    queryFn: getOwnerStore,
    ...options,
  })
}

export function useUpdateOwnerStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => updateOwnerStore(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.ownerStore() })
    },
  })
}

export function useOwnerStores(options = {}) {
  return useQuery({
    queryKey: queryKeys.mypage.ownerStores(),
    queryFn: getOwnerStores,
    ...options,
  })
}

export function useCreateOwnerStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => createOwnerStore(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.ownerStores() })
    },
  })
}

export function useDeleteOwnerStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storeId) => deleteOwnerStore(storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.ownerStores() })
    },
  })
}

// ===== 알바(Staff) =====

export function useStaffProfile(options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.mypage.staffProfile(), session.access.queries.teacherProfile,
    signal => getStaffProfile({ signal }), options)
}

export function useUpdateStaffProfile() {
  return useSaveAccountName(updateStaffProfile, queryKeys.mypage.staffProfile())
}

export function useStaffStores(options = {}) {
  const session = useHomeSession()
  return useScopedRead(session, queryKeys.mypage.staffStores(), session.access.queries.teacherProfile,
    signal => getStaffStores({ signal }), options)
}

export function useJoinStaffStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => joinStaffStore(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.staffStores() })
    },
  })
}

export function useLeaveStaffStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storeId) => leaveStaffStore(storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.staffStores() })
    },
  })
}
