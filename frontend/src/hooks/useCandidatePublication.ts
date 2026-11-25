import { useLayoutEffect, useRef } from 'react'
import { hashKey, useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { publishCandidate } from '@/api/publications'
import type { HomeTerm } from '@/types/datedLesson'
import type { AcceptedGeneration, GenerationJob } from '@/types/generationJob'
import type {
  PublicationConflict,
  PublicationOutcome,
  PublicationRecovery,
  PublicationRequest,
  PublicationState,
} from '@/types/publication'
import { refreshPublication, publicationTimetables } from './publicationCache'
import { queryKeys } from './queryKeys.js'
import { useAdminTerm } from './useAdminTerm'

function recoveryFor(code?: string): PublicationRecovery {
  switch (code) {
    case 'JOB_NOT_READY':
      return 'reselect-candidate'
    case 'STALE_INPUT':
      return 'revalidate-load'
    case 'STALE_PUBLICATION':
    case 'JOB_EXPIRED':
      return 'regenerate'
    case 'DATED_CHANGES_EXIST':
      return 'review-dated-lessons'
    default:
      return 'review-publication'
  }
}

type Selection = Pick<PublicationRequest, 'candidateId' | 'effectiveFrom'>
interface Attempt {
  request: PublicationRequest
  accepted: AcceptedGeneration
  signal: AbortSignal
}

export function useCandidatePublication(term: HomeTerm | null, jobId: string | null) {
  const { session, termId, assertAccess } = useAdminTerm(term, 'publish')
  const cache = useQueryClient()
  const key = queryKeys.schedule.publication(termId, session.scope)
  const scope = hashKey([...key, jobId])
  const lease = useRef<{ scope: string; signal: AbortSignal } | null>(null)
  useLayoutEffect(() => {
    const controller = new AbortController()
    lease.current = { scope, signal: controller.signal }
    return () => {
      controller.abort()
      lease.current = null
    }
  }, [scope])

  const isPublishing = useIsMutating({ mutationKey: key, exact: true }) > 0
  const mutation = useMutation({
    mutationKey: key,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async ({ request, accepted, signal }: Attempt): Promise<PublicationOutcome> => {
      signal.throwIfAborted()
      assertAccess()
      if (!term || term.termId !== termId) throw new Error('게시할 학기를 선택하세요.')
      let result
      try {
        const receipt = await publishCandidate(termId, request, signal)
        result = { phase: 'published' as const, receipt }
      } catch (error) {
        if (!isAxiosError<PublicationConflict>(error) || error.response?.status !== 409) {
          // A lost response can still mean the server committed the publication.
          if (isAxiosError(error) && !error.response) {
            await cache.invalidateQueries({
              predicate: publicationTimetables(term, session.scope, request.effectiveFrom),
              refetchType: 'none',
            })
          }
          throw error
        }
        const body = error.response.data
        const problem = body && typeof body === 'object' ? body : {}
        result = { phase: 'conflict' as const, problem, recovery: recoveryFor(problem.code) }
      }
      const refresh = await refreshPublication(
        cache,
        term,
        session.scope,
        request.effectiveFrom,
        result.phase === 'conflict' ? accepted : null,
        signal,
        assertAccess,
      )
      signal.throwIfAborted()
      assertAccess()
      return { ...result, request, refresh }
    },
  })

  async function publish({ candidateId, effectiveFrom }: Selection) {
    const current = lease.current
    if (current?.scope !== scope) throw new Error('게시 화면이 변경되었습니다.')
    assertAccess()
    const accepted = cache.getQueryData<AcceptedGeneration>(
      queryKeys.schedule.generationAccepted(termId, session.scope),
    )
    const status = cache.getQueryState<GenerationJob>(
      queryKeys.schedule.generationJob(termId, jobId, session.scope),
    )
    if (
      !accepted ||
      accepted.jobId !== jobId ||
      status?.status !== 'success' ||
      status.data?.state !== 'READY' ||
      status.data.jobId !== jobId ||
      !status.data.result.candidates.some((candidate) => candidate.candidateId === candidateId)
    ) {
      throw new Error('현재 작업에서 게시할 준비가 된 후보를 선택하세요.')
    }
    const day = new Date(effectiveFrom + 'T00:00:00Z')
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== effectiveFrom) {
      throw new Error('적용일을 연-월-일 형식으로 선택하세요.')
    }
    if (cache.isMutating({ mutationKey: key, exact: true })) {
      throw new Error('이미 게시 요청을 처리 중입니다.')
    }
    const request = {
      jobId,
      candidateId,
      effectiveFrom,
      expectedPublishRev: accepted.expectedPublishRev,
    }
    return mutation.mutateAsync({ request, accepted, signal: current.signal })
  }

  const attempt = mutation.variables
  let state: PublicationState = { phase: 'idle' }
  if (termId !== null && attempt && attempt.request.jobId === jobId && !attempt.signal.aborted) {
    if (mutation.isSuccess) state = mutation.data
    else if (mutation.isError)
      state = { phase: 'error', request: attempt.request, error: mutation.error }
    else if (mutation.isPending) state = { phase: 'publishing', request: attempt.request }
  }
  return { publish, state, isPublishing }
}
