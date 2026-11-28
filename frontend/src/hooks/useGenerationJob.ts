import { useLayoutEffect, useRef } from 'react'
import { isAxiosError } from 'axios'
import {
  hashKey,
  skipToken,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { checkGenerationReceipt, getGenerationStatus, submitGeneration } from '@/api/generationJobs'
import type { AcceptedGeneration, GenerationJob, GenerationRequest } from '@/types/generationJob'
import { generationProgress } from '@/utils/scheduleProgress'
import { queryKeys } from './queryKeys.js'
import { useAdminTerm, type SchoolTerm } from './useAdminTerm'

function inProgress(state: GenerationJob['state']) {
  return state === 'QUEUED' || state === 'RUNNING'
}

type GenerationReceipt = AcceptedGeneration & { requestedAt: number }

function restoreReceipt(key: string | null, termId: number | null): GenerationReceipt | undefined {
  if (!key || termId === null) return
  try {
    const receipt = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (!receipt) return
    checkGenerationReceipt(termId, receipt)
    if (Number.isSafeInteger(receipt.requestedAt) && receipt.requestedAt > 0) return receipt
  } catch {
    // The in-memory receipt still works when storage is unavailable.
  }
}

function persistReceipt(key: string | null, receipt: GenerationReceipt, active: boolean) {
  if (!key) return
  try {
    if (active) sessionStorage.setItem(key, JSON.stringify(receipt))
    else if (JSON.parse(sessionStorage.getItem(key) ?? 'null')?.jobId === receipt.jobId) {
      sessionStorage.removeItem(key)
    }
  } catch {
    // Storage is optional.
  }
}

export function useGenerationJob(term: SchoolTerm | null) {
  const { session, termId, assertAccess } = useAdminTerm(term)
  const cache = useQueryClient()
  const acceptedKey = queryKeys.schedule.generationAccepted(termId, session.scope)
  const scope = hashKey(acceptedKey)
  const storageKey = termId
    ? `active-generation/${session.userId}/${session.scope.schoolId}/${termId}`
    : null
  const lease = useRef<{ scope: string; signal: AbortSignal } | null>(null)

  useLayoutEffect(() => {
    const controller = new AbortController()
    lease.current = { scope, signal: controller.signal }
    return () => {
      controller.abort()
      lease.current = null
    }
  }, [scope])

  // Share the receipt across callers, including navigation back to the same term.
  const { data: accepted } = useQuery<GenerationReceipt | null>({
    queryKey: acceptedKey,
    queryFn: skipToken,
    staleTime: Infinity,
    initialData: () => restoreReceipt(storageKey, termId),
  })
  const statusKey = (jobId?: string) =>
    queryKeys.schedule.generationJob(termId, jobId, session.scope)
  const status = useQuery({
    queryKey: statusKey(accepted?.jobId),
    queryFn:
      termId && accepted
        ? async ({ signal }) => {
            assertAccess()
            try {
              const job = await getGenerationStatus(termId, accepted, signal)
              signal.throwIfAborted()
              if (!inProgress(job.state)) persistReceipt(storageKey, accepted, false)
              return job
            } catch (error) {
              // A rehearsal reset may remove an active job while this tab is away.
              if (!signal.aborted && isAxiosError(error) && error.response?.status === 404) {
                persistReceipt(storageKey, accepted, false)
                cache.setQueryData<GenerationReceipt | null>(acceptedKey, (current) =>
                  current?.jobId === accepted.jobId ? null : current,
                )
              }
              throw error
            }
          }
        : skipToken,
    retry: false,
    staleTime: (query) => (query.state.data && !inProgress(query.state.data.state) ? Infinity : 0),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: (query) => (query.state.data ? inProgress(query.state.data.state) : false),
    retryOnMount: false,
    refetchInterval: (query) =>
      query.state.status !== 'error' && query.state.data && inProgress(query.state.data.state)
        ? 2000
        : false,
  })

  const pending = useMutationState({
    filters: { mutationKey: acceptedKey, exact: true, status: 'pending' },
    select: (mutation) => mutation.state.submittedAt,
  })
  const submitting = pending.length > 0
  const submission = useMutation({
    mutationKey: acceptedKey,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async ({
      request,
      signal,
      requestedAt,
    }: {
      request: GenerationRequest
      signal: AbortSignal
      requestedAt: number
    }) => {
      signal.throwIfAborted()
      assertAccess()
      if (termId === null) throw new Error('편성할 학기를 선택하세요.')
      const response = await submitGeneration(termId, request, signal)
      const receipt = { ...response, requestedAt }
      signal.throwIfAborted()
      assertAccess()
      persistReceipt(storageKey, receipt, true)
      cache.setQueryData(acceptedKey, receipt)
      return receipt
    },
  })

  async function start(request: GenerationRequest) {
    const current = lease.current
    if (!current || current.scope !== scope) throw new Error('편성 화면이 변경되었습니다.')
    assertAccess()
    if (!request.validatedLoadId?.trim()) throw new Error('시수표를 먼저 검증하세요.')
    const last = cache.getQueryData<AcceptedGeneration>(acceptedKey)
    const state = last && cache.getQueryData<GenerationJob>(statusKey(last.jobId))?.state
    // Read the cache at click time, before React can render a disabled submit button.
    if (
      cache.isMutating({ mutationKey: acceptedKey, exact: true }) ||
      (last && inProgress(state ?? last.state))
    ) {
      throw new Error('이미 편성 작업이 진행 중입니다.')
    }
    return submission.mutateAsync({ request, signal: current.signal, requestedAt: Date.now() })
  }

  async function refetchStatus() {
    const current = lease.current
    if (
      current?.scope !== scope ||
      !accepted ||
      cache.getQueryData<AcceptedGeneration>(acceptedKey)?.jobId !== accepted.jobId
    ) {
      throw new Error('다시 조회할 편성 작업이 없습니다.')
    }
    assertAccess()
    const refreshed = await status.refetch({ throwOnError: true })
    current.signal.throwIfAborted()
    assertAccess()
    return refreshed.data
  }

  const job = status.data
  const latest = job ?? accepted
  return {
    start,
    discardFinished() {
      if (accepted && job && !inProgress(job.state)) {
        cache.setQueryData(acceptedKey, null)
      }
    },
    canStart: termId !== null && !submitting && (!latest || !inProgress(latest.state)),
    submitting,
    requestedAt: submitting ? pending[0] : accepted?.requestedAt,
    accepted,
    job,
    progress: latest ? generationProgress(latest) : null,
    candidates: job?.state === 'READY' ? job.result.candidates : [],
    submissionError: submission.variables?.signal.aborted ? null : submission.error,
    statusError: status.error,
    refetchStatus,
  }
}
