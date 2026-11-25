import { useLayoutEffect, useRef } from 'react'
import {
  hashKey,
  skipToken,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getGenerationStatus, submitGeneration } from '@/api/generationJobs'
import type { AcceptedGeneration, GenerationJob, GenerationRequest } from '@/types/generationJob'
import { generationProgress } from '@/utils/scheduleProgress'
import { queryKeys } from './queryKeys.js'
import { useAdminTerm, type SchoolTerm } from './useAdminTerm'

function inProgress(state: GenerationJob['state']) {
  return state === 'QUEUED' || state === 'RUNNING'
}

export function useGenerationJob(term: SchoolTerm | null) {
  const { session, termId, assertAccess } = useAdminTerm(term)
  const cache = useQueryClient()
  const acceptedKey = queryKeys.schedule.generationAccepted(termId, session.scope)
  const scope = hashKey(acceptedKey)
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
  const { data: accepted } = useQuery<AcceptedGeneration>({
    queryKey: acceptedKey,
    queryFn: skipToken,
    staleTime: Infinity,
  })
  const statusKey = (jobId?: string) =>
    queryKeys.schedule.generationJob(termId, jobId, session.scope)
  const status = useQuery({
    queryKey: statusKey(accepted?.jobId),
    queryFn:
      termId && accepted
        ? ({ signal }) => {
            assertAccess()
            return getGenerationStatus(termId, accepted, signal)
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

  const submitting = useIsMutating({ mutationKey: acceptedKey, exact: true }) > 0
  const submission = useMutation({
    mutationKey: acceptedKey,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async ({
      request,
      signal,
    }: {
      request: GenerationRequest
      signal: AbortSignal
    }) => {
      signal.throwIfAborted()
      assertAccess()
      if (termId === null) throw new Error('편성할 학기를 선택하세요.')
      const receipt = await submitGeneration(termId, request, signal)
      signal.throwIfAborted()
      assertAccess()
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
    return submission.mutateAsync({ request, signal: current.signal })
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
    canStart: termId !== null && !submitting && (!latest || !inProgress(latest.state)),
    submitting,
    accepted,
    job,
    progress: latest ? generationProgress(latest) : null,
    candidates: job?.state === 'READY' ? job.result.candidates : [],
    submissionError: submission.variables?.signal.aborted ? null : submission.error,
    statusError: status.error,
    refetchStatus,
  }
}
