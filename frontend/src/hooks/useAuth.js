import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  logout,
  issueDevToken,
  submitOnboarding,
  sendEmailVerification,
  verifyEmailVerification,
} from '@/api'

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function useDevToken() {
  return useMutation({
    mutationFn: (email) => issueDevToken(email),
  })
}

export function useOnboarding() {
  return useMutation({
    mutationFn: (payload) => submitOnboarding(payload),
  })
}

export function useSendEmailVerification() {
  return useMutation({
    mutationFn: (payload) => sendEmailVerification(payload),
  })
}

export function useVerifyEmailVerification() {
  return useMutation({
    mutationFn: (payload) => verifyEmailVerification(payload),
  })
}
