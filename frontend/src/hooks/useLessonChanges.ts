import { useLayoutEffect, useRef } from 'react'
import { hashKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getDatedLessons, type DirectoryMember } from '@/api/home'
import {
  approveLessonChange,
  createLessonChange,
  getLessonChanges,
  respondToLessonChange,
} from '@/api/lessonChanges'
import type { DatedLessonDto } from '@/types/datedLesson'
import type {
  ChangeApproval,
  ChangeConflict,
  ChangeDecision,
  ChangeOutcome,
  ChangeResult,
  LessonChange,
  NewLessonChange,
} from '@/types/lessonChange'
import { homeQueryState } from '@/utils/homeQueryState'
import { useHomeDirectory } from './homeReads'
import { lessonDayKey, refreshLessonChanges } from './lessonChangeCache'
import { queryKeys } from './queryKeys.js'
import { useScopedRead, type HomeSession } from './useHomeSession'
import { useSchoolTerm, type SchoolTerm } from './useSchoolTerm'

type Command =
  | { kind: 'create'; body: NewLessonChange }
  | { kind: 'respond'; changeId: number; body: ChangeDecision }
  | { kind: 'approve'; changeId: number; body: ChangeApproval; key: string }

interface Attempt {
  command: Command
  dates: string[]
  signal: AbortSignal
  lock: string
}

function useDay(session: HomeSession, termId: number | null, date: string | null) {
  return useScopedRead(
    session,
    lessonDayKey(termId, date),
    termId !== null && !!date,
    (signal) => getDatedLessons(termId!, date!, signal),
    { retry: false, networkMode: 'always' },
  )
}

async function sendCommand(
  termId: number,
  command: Command,
  signal: AbortSignal,
): Promise<ChangeOutcome> {
  switch (command.kind) {
    case 'create':
      return { phase: 'created', change: await createLessonChange(termId, command.body, signal) }
    case 'respond':
      return {
        phase: 'responded',
        change: await respondToLessonChange(termId, command.changeId, command.body, signal),
      }
    case 'approve':
      return {
        phase: 'approved',
        receipt: await approveLessonChange(
          termId,
          command.changeId,
          command.body,
          command.key,
          signal,
        ),
      }
  }
}

export function useLessonChanges(term: SchoolTerm | null, date: string, secondDate?: string) {
  const { session, termId, assertAccess } = useSchoolTerm(term)
  const cache = useQueryClient()
  const { actions } = session.access
  const enabled = termId !== null
  const listKey = [...queryKeys.home.lessonChanges(termId), session.scope]
  const list = useScopedRead(
    session,
    queryKeys.home.lessonChanges(termId),
    enabled,
    (signal) => getLessonChanges(termId!, signal),
    { retry: false, networkMode: 'always' },
  )
  const directory = useHomeDirectory(session, enabled)
  const memberId =
    enabled && !directory.isError
      ? directory.data?.find((m) => m.userId === session.userId)?.schoolUserId
      : undefined
  const firstDay = useDay(session, termId, date)
  const otherDate = secondDate && secondDate !== date ? secondDate : null
  const dates = otherDate ? [date, otherDate] : [date]
  const otherDay = useDay(session, termId, otherDate)
  const scope = hashKey(listKey)
  const lease = useRef<{ scope: string; signal: AbortSignal } | null>(null)
  useLayoutEffect(() => {
    const controller = new AbortController()
    lease.current = { scope, signal: controller.signal }
    return () => {
      controller.abort()
      lease.current = null
    }
  }, [scope])

  function currentScope() {
    if (!lease.current || lease.current.scope !== scope || termId === null)
      throw new Error('학교 또는 학기를 확인하세요.')
    assertAccess()
    return lease.current
  }

  function myMembership() {
    const members = cache.getQueryState<DirectoryMember[]>([
      ...queryKeys.home.directory(),
      session.scope,
    ])
    return members?.status === 'success'
      ? members.data?.find((m) => m.userId === session.userId)?.schoolUserId
      : undefined
  }

  async function refresh() {
    const { signal } = currentScope()
    if (termId === null) throw new Error('학기를 선택하세요.')
    const error = await refreshLessonChanges(
      cache,
      termId,
      session.scope,
      dates,
      true,
      signal,
      assertAccess,
    )
    signal.throwIfAborted()
    assertAccess()
    if (error) throw error
  }

  function selectedLesson(selected: DatedLessonDto) {
    const day = cache.getQueryState<DatedLessonDto[]>([
      ...lessonDayKey(termId, selected.date),
      session.scope,
    ])
    const lesson = day?.status === 'success' && day.data?.find((row) => row.id === selected.id)
    if (
      !lesson ||
      selected.termId !== termId ||
      lesson.actual.cancelled ||
      lesson.actual.teacherId !== selected.actual.teacherId ||
      lesson.rev !== selected.rev ||
      !(selected.date === date || selected.date === otherDate)
    ) {
      throw new Error('현재 학기의 날짜 수업과 버전을 다시 확인하세요.')
    }
    return lesson
  }

  function selectedChange(selected: LessonChange, required: LessonChange['state']) {
    const changes = cache.getQueryState<LessonChange[]>(listKey)
    const row = changes?.status === 'success' && changes.data?.find((c) => c.id === selected.id)
    if (!row || selected.termId !== termId || row.state !== required || row.rev !== selected.rev) {
      throw new Error('수업 변경 신청의 현재 상태와 버전을 확인하세요.')
    }
    return row
  }

  const mutationKey = ['lesson-change-write', termId, session.scope]
  const mutation = useMutation({
    mutationKey,
    retry: false,
    gcTime: 0,
    networkMode: 'always',
    mutationFn: async ({ command, dates, signal }: Attempt): Promise<ChangeResult> => {
      signal.throwIfAborted()
      assertAccess()
      if (termId === null) throw new Error('학기를 선택하세요.')
      let outcome
      try {
        outcome = await sendCommand(termId, command, signal)
      } catch (error) {
        if (!isAxiosError<ChangeConflict>(error)) throw error
        if (!error.response || error.response.status >= 500) {
          // The write may have committed before the response was lost. Reconcile by reading.
          await refreshLessonChanges(
            cache,
            termId,
            session.scope,
            dates,
            command.kind === 'approve',
            signal,
            assertAccess,
          )
          throw error
        }
        if (error.response.status !== 409) throw error
        const problem = error.response.data
        outcome = {
          phase: 'conflict' as const,
          problem: problem && typeof problem === 'object' ? problem : {},
        }
      }
      const refreshError = await refreshLessonChanges(
        cache,
        termId,
        session.scope,
        outcome.phase === 'approved'
          ? [...dates, ...outcome.receipt.lessons.map((row) => row.date)]
          : dates,
        outcome.phase === 'conflict' || outcome.phase === 'approved',
        signal,
        assertAccess,
      )
      signal.throwIfAborted()
      assertAccess()
      return { ...outcome, refreshError }
    },
  })

  async function execute(command: Command) {
    const { signal } = currentScope()
    const lock = command.kind === 'create' ? JSON.stringify(command.body) : String(command.changeId)
    if (
      cache.isMutating({
        mutationKey,
        exact: true,
        predicate: (m) => (m.state.variables as Attempt | undefined)?.lock === lock,
      })
    ) {
      throw new Error('같은 신청을 처리 중입니다.')
    }
    return mutation.mutateAsync({
      command,
      signal,
      lock,
      dates,
    })
  }

  async function requestSubstitute(first: DatedLessonDto, substituteTeacherId: number) {
    currentScope()
    if (!actions.requestSubstitute) throw new Error('재직 관리자만 보결을 신청할 수 있습니다.')
    const a = selectedLesson(first)
    if (
      !Number.isSafeInteger(substituteTeacherId) ||
      substituteTeacherId <= 0 ||
      substituteTeacherId === a.actual.teacherId
    ) {
      throw new Error('다른 보결 교사를 지정하세요.')
    }
    return execute({
      kind: 'create',
      body: { kind: 'SUBSTITUTE', firstId: a.id, firstRev: a.rev, substituteTeacherId },
    })
  }

  async function requestSwap(first: DatedLessonDto, second: DatedLessonDto) {
    currentScope()
    if (!actions.requestSwap) throw new Error('재직 교사만 수업 교환을 신청할 수 있습니다.')
    const a = selectedLesson(first)
    const b = selectedLesson(second)
    if (
      myMembership() !== a.actual.teacherId ||
      a.actual.teacherId === b.actual.teacherId ||
      a.id === b.id
    ) {
      throw new Error('내가 담당하는 수업과 다른 교사의 수업을 선택하세요.')
    }
    return execute({
      kind: 'create',
      body: { kind: 'SWAP', firstId: a.id, firstRev: a.rev, secondId: b.id, secondRev: b.rev },
    })
  }

  async function respond(selected: LessonChange, accept: boolean) {
    currentScope()
    const row = selectedChange(selected, 'PENDING')
    if (!actions.respondToChange || myMembership() !== row.responder)
      throw new Error('지정된 교사만 응답할 수 있습니다.')
    return execute({
      kind: 'respond',
      changeId: row.id,
      body: { accept, expectedRequestRev: row.rev },
    })
  }

  // One user decision captures one immutable payload and key. Keep its send function for network retries.
  function prepareApproval(selected: LessonChange) {
    const original = currentScope()
    if (!actions.approve) throw new Error('재직 관리자만 승인할 수 있습니다.')
    const row = selectedChange(selected, 'ACCEPTED')
    const body: ChangeApproval = { expectedRequestRev: row.rev, expectedLessonRev: row.firstRev }
    if (row.kind === 'SWAP') body.expectedSecondRev = row.secondRev
    const command = { kind: 'approve' as const, changeId: row.id, body, key: crypto.randomUUID() }
    let finished = false
    return async function sendApproval() {
      original.signal.throwIfAborted()
      if (finished) throw new Error('승인 결과를 확인하고 새 동작을 선택하세요.')
      const result = await execute(command)
      finished = true
      return result
    }
  }

  const visible = enabled && mutation.variables && !mutation.variables.signal.aborted
  return {
    changes: homeQueryState(list, enabled),
    lessons: homeQueryState(firstDay, enabled && !!date),
    secondLessons:
      secondDate === date
        ? homeQueryState(firstDay, enabled && !!date)
        : homeQueryState(otherDay, enabled && !!otherDate),
    directory: homeQueryState(directory, enabled),
    canRequestSubstitute: enabled && actions.requestSubstitute,
    canRequestSwap: enabled && actions.requestSwap && memberId !== undefined,
    memberId,
    canRespond: (row: LessonChange) =>
      enabled &&
      actions.respondToChange &&
      row.termId === termId &&
      row.state === 'PENDING' &&
      memberId === row.responder,
    canApprove: (row: LessonChange) =>
      enabled && actions.approve && row.termId === termId && row.state === 'ACCEPTED',
    requestSubstitute,
    requestSwap,
    respond,
    prepareApproval,
    refresh,
    pending: Boolean(visible && mutation.isPending),
    result: visible ? mutation.data : undefined,
    error: visible ? mutation.error : null,
  }
}
