import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getActiveStore,
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
import { queryKeys } from './queryKeys.js'

// ===== 활성 매장 =====

export function useActiveStore(options = {}) {
  return useQuery({
    queryKey: queryKeys.mypage.activeStore(),
    queryFn: getActiveStore,
    ...options,
  })
}

export function useUpdateActiveStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storeId) => updateActiveStore(storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mypage'] })
      queryClient.invalidateQueries({ queryKey: ['store'] })
    },
  })
}

// ===== 사장(Owner) =====

export function useOwnerProfile(options = {}) {
  return useQuery({
    queryKey: queryKeys.mypage.ownerProfile(),
    queryFn: getOwnerProfile,
    ...options,
  })
}

export function useUpdateOwnerProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => updateOwnerProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.ownerProfile() })
    },
  })
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
  return useQuery({
    queryKey: queryKeys.mypage.staffProfile(),
    queryFn: getStaffProfile,
    ...options,
  })
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => updateStaffProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.staffProfile() })
    },
  })
}

export function useStaffStores(options = {}) {
  return useQuery({
    queryKey: queryKeys.mypage.staffStores(),
    queryFn: getStaffStores,
    ...options,
  })
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
