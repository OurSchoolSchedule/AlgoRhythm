import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmVoiceCommand, previewVoiceCommand } from '@/api'
import { queryKeys } from './queryKeys.js'

export function usePreviewVoiceCommand() {
  return useMutation({
    mutationFn: (request) => previewVoiceCommand(typeof request === 'string' ? { text: request, lang: 'ko' } : request),
  })
}

export function useConfirmVoiceCommand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: confirmVoiceCommand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitute'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notification.list() })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}
