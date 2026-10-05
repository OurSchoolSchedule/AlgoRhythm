import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmVoiceCommand, previewVoiceCommand } from '@/api'
import { queryKeys } from './queryKeys.js'

export function usePreviewVoiceCommand() {
  return useMutation({
    mutationFn: (text) => previewVoiceCommand({ text, lang: 'ko' }),
  })
}

export function useConfirmVoiceCommand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draftToken) => confirmVoiceCommand(draftToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitute'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailability.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notification.list() })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}
