import { useLayoutEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { validateTeachingLoad } from '@/api/loadValidation'
import type { LoadUpload } from '@/types/loadValidation'
import { uploadProgress, validatedProgress, type ScheduleProgress } from '@/utils/scheduleProgress'
import { useAdminTerm, type SchoolTerm } from './useAdminTerm'

interface Attempt {
  input: LoadUpload
  scope: string
  termId: number
  controller: AbortController
}

export function useLoadValidation(term: SchoolTerm | null) {
  const { session, termId, assertAccess } = useAdminTerm(term)
  const canValidate = termId !== null
  const scope = canValidate
    ? `${session.identity.generation}/${session.userId}/${session.scope.schoolId}/${termId}`
    : null
  const current = useRef<{ scope: string | null; controller?: AbortController }>({ scope: null })
  const [transfer, setTransfer] = useState<{
    signal: AbortSignal
    progress: ScheduleProgress
  } | null>(null)

  useLayoutEffect(() => {
    current.current = { scope }
    return () => {
      current.current.controller?.abort()
      current.current = { scope: null }
    }
  }, [scope])

  const mutation = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async ({ input, termId, controller }: Attempt) => {
      const { signal } = controller
      signal.throwIfAborted()
      assertAccess()
      const result = await validateTeachingLoad(termId, input, {
        signal,
        onUploadProgress: ({ loaded, total, lengthComputable }) => {
          if (!signal.aborted) {
            setTransfer({
              signal,
              progress: uploadProgress(loaded, lengthComputable ? total : undefined),
            })
          }
        },
      })
      signal.throwIfAborted()
      return result
    },
  })

  async function validate(input: LoadUpload) {
    if (!scope || current.current.scope !== scope || !termId) {
      throw new Error('활성 학교의 재직 관리자만 선택한 학기의 시수표를 검증할 수 있습니다.')
    }
    current.current.controller?.abort()
    const controller = new AbortController()
    current.current.controller = controller
    setTransfer({ signal: controller.signal, progress: uploadProgress() })
    return mutation.mutateAsync({ input, termId, scope, controller })
  }

  const signal = mutation.variables?.controller.signal
  const visible =
    canValidate && mutation.variables?.scope === scope && signal !== undefined && !signal.aborted
  const result = visible ? mutation.data : undefined
  const error = visible ? mutation.error : null
  let progress: ScheduleProgress | null = null
  if (result) progress = validatedProgress(result)
  else if (error) progress = { phase: 'validation-error', error }
  else if (visible && transfer?.signal === signal) progress = transfer.progress

  return { canValidate, validate, progress, result, error }
}
