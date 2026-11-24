// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import client from '@/api/client.js'
import { LoadValidationError } from '@/api/loadValidation'
import { clearTokens, getRefreshToken, setTokens } from '@/api/tokenStorage.js'
import { useLoadValidation } from './useLoadValidation'

const term = { schoolId: 540001, termId: 547001 }
const url = '/api/v2/terms/547001/load-imports/validate'
const input = { file: new File(['demo'], 'teaching_load_42.xlsx') }
const success = {
  sheet: '시수표',
  dataRows: 1,
  totalPeriods: 1,
  demands: [
    { teacherId: '0010', subjectId: '20', classId: '30', weeklyPeriods: 1, sourceCell: 'D3' },
  ],
  validatedLoadId: '375d0754-c375-42c6-b1f0-f630a9693e37',
}
const oldAdapter = client.defaults.adapter
let cache: QueryClient
let school: { schoolId: number; position: string; employmentStatus: string }
let posts: InternalAxiosRequestConfig[]
let respond: (config: InternalAxiosRequestConfig) => unknown

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } })
  setTokens({ accessToken: 'test-access', userId: 541000 })
  school = { schoolId: term.schoolId, position: 'ADMIN', employmentStatus: 'HIRED' }
  posts = []
  respond = () => success
  client.defaults.adapter = async (config) => {
    if (config.method === 'post') posts.push(config)
    const data = config.url === '/api/mypage/active-school' ? school : await respond(config)
    return { status: 200, statusText: 'OK', data, config, headers: {} }
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = oldAdapter
})

describe('관리자 시수표 업로드', () => {
  it('필수 파일만 보내고 전송 이벤트 → 검증 대기 → 서버 200을 구분한다', async () => {
    const delayed = deferred<unknown>()
    respond = () => delayed.promise
    const { result } = renderHook(() => useLoadValidation(term), { wrapper })
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    let pending!: Promise<unknown>
    act(() => {
      pending = result.current.validate(input)
    })
    await waitFor(() => expect(posts).toHaveLength(1))
    const request = posts[0]
    expect(request.url).toBe(url)
    expect(request.params).toEqual({ forGeneration: true })
    expect(request.headers.Authorization).toBe('Bearer test-access')
    const body: FormData = request.data
    expect(body.get('file')).toBe(input.file)
    expect(body.has('sheet')).toBe(false)
    expect(body.has('subjectAliases')).toBe(false)
    act(() => request.onUploadProgress?.({ loaded: 5, bytes: 5, lengthComputable: false }))
    await waitFor(() =>
      expect(result.current.progress).toEqual({ phase: 'uploading', percent: null }),
    )
    act(() =>
      request.onUploadProgress?.({ loaded: 5, total: 10, bytes: 5, lengthComputable: true }),
    )
    await waitFor(() =>
      expect(result.current.progress).toEqual({ phase: 'uploading', percent: 50 }),
    )
    act(() =>
      request.onUploadProgress?.({ loaded: 10, total: 10, bytes: 5, lengthComputable: true }),
    )
    await waitFor(() => expect(result.current.progress).toEqual({ phase: 'validating' }))
    expect(result.current.result).toBeUndefined()
    await act(async () => {
      delayed.resolve(success)
      expect(await pending).toEqual(success)
    })
    await waitFor(() =>
      expect(result.current.progress).toEqual({
        phase: 'validated',
        validatedLoadId: success.validatedLoadId,
      }),
    )
    expect(result.current.result?.demands[0].teacherId).toBe('0010')
  })

  it.each([
    {
      code: 'INVALID_LOAD_SHEET',
      message: '시수표를 수정한 후 다시 업로드하세요.',
      fieldErrors: [
        {
          code: 'ROW_TOTAL_MISMATCH',
          sheet: '시수표',
          row: 3,
          column: 'F',
          cell: 'F3',
          message: '합계 불일치',
        },
        {
          code: 'UNKNOWN_SUBJECT',
          sheet: '2학년',
          row: 14,
          column: 'AA',
          cell: 'AA14',
          message: '과목 미확인',
        },
      ],
    },
    { code: 'SELECT_SHEET', message: '시트를 선택하세요.', fieldErrors: [] },
  ])('422 $code 원문과 전체 셀 오류 배열을 보존한다', async (problem) => {
    respond = (config) => {
      throw new AxiosError('422', undefined, config, undefined, {
        status: 422,
        statusText: '',
        data: problem,
        headers: {},
        config,
      })
    }
    const { result } = renderHook(() => useLoadValidation(term), { wrapper })
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    await act(async () => {
      await expect(result.current.validate(input)).rejects.toMatchObject({
        status: 422,
        message: problem.message,
        problem,
      })
    })
    await waitFor(() => expect(result.current.error).toBeInstanceOf(LoadValidationError))
    expect(result.current.progress).toMatchObject({ phase: 'validation-error', error: { problem } })
    expect(result.current.result).toBeUndefined()
    expect(posts).toHaveLength(1)
  })

  it.each([
    ['TEACHER', 'HIRED'],
    ['STUDENT', 'HIRED'],
    ['UNKNOWN', 'HIRED'],
    ['ADMIN', 'ON_LEAVE'],
    ['ADMIN', 'RESIGNED'],
  ])('%s/%s는 전송 0건', async (position, employmentStatus) => {
    school = { ...school, position, employmentStatus }
    const { result } = renderHook(() => useLoadValidation(term), { wrapper })
    await waitFor(() =>
      expect(
        cache.getQueryCache().find({ queryKey: ['mypage', 'active-store'], exact: false })?.state
          .status,
      ).toBe('success'),
    )
    expect(result.current.canValidate).toBe(false)
    await expect(result.current.validate(input)).rejects.toThrow('재직 관리자')
    expect(posts).toHaveLength(0)
  })
  it('로그아웃·다른 학교 학기·학기 미선택 상태에서 전송하지 않는다', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: typeof term | null }) => useLoadValidation(value),
      { wrapper, initialProps: { value: term } as { value: typeof term | null } },
    )
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    for (const value of [null, { ...term, schoolId: 42 }]) {
      rerender({ value })
      await expect(result.current.validate(input)).rejects.toThrow()
    }
    act(clearTokens)
    rerender({ value: term })
    await expect(result.current.validate(input)).rejects.toThrow()
    expect(posts).toHaveLength(0)
  })
  it('학기가 바뀌면 이전 검증을 취소하고 이전 콜백과 늦은 응답을 버린다', async () => {
    const delayed = deferred<unknown>()
    respond = () => delayed.promise
    const { result, rerender } = renderHook((value: typeof term) => useLoadValidation(value), {
      wrapper,
      initialProps: term,
    })
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    const previous = result.current.validate
    let pending!: Promise<unknown>
    act(() => {
      pending = previous(input).catch((e) => e)
    })
    await waitFor(() => expect(posts).toHaveLength(1))
    rerender({ ...term, termId: 547002 })
    expect(posts[0].signal?.aborted).toBe(true)
    await expect(previous(input)).rejects.toThrow()
    respond = () => ({ ...success, validatedLoadId: 'new-load' })
    await act(async () => {
      await result.current.validate(input)
    })
    await act(async () => {
      delayed.resolve(success)
      await pending
    })
    await waitFor(() => expect(result.current.result?.validatedLoadId).toBe('new-load'))
  })
  it('편성용 ID가 없는 200 응답은 완료로 노출하지 않는다', async () => {
    respond = () => ({ ...success, validatedLoadId: null })
    const { result } = renderHook(() => useLoadValidation(term), { wrapper })
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    await act(async () => {
      await expect(result.current.validate(input)).rejects.toThrow('검증 ID')
    })
    await waitFor(() => expect(result.current.progress?.phase).toBe('validation-error'))
    expect(result.current.result).toBeUndefined()
  })

  it('권한이 바뀐 직후 이전 렌더의 validate를 호출해도 요청을 보내지 않는다', async () => {
    const { result } = renderHook(() => useLoadValidation(term), { wrapper })
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    const previous = result.current.validate
    await act(async () => {
      cache.setQueriesData(
        { queryKey: ['mypage', 'active-store'] },
        { ...school, position: 'TEACHER' },
      )
      await expect(previous(input)).rejects.toThrow()
    })
    expect(posts).toHaveLength(0)
  })

  it('서버 403은 셀 오류와 구분하고 자동 재전송하지 않는다', async () => {
    respond = (config) => {
      throw new AxiosError('403', undefined, config, undefined, {
        status: 403,
        statusText: '',
        config,
        headers: {},
        data: { success: false, error: 'FORBIDDEN' },
      })
    }
    const { result } = renderHook(() => useLoadValidation(term), { wrapper })
    await waitFor(() => expect(result.current.canValidate).toBe(true))
    await act(async () => {
      await expect(result.current.validate(input)).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
    await waitFor(() => expect(result.current.progress?.phase).toBe('validation-error'))
    expect(result.current.error).not.toBeInstanceOf(LoadValidationError)
    expect(posts).toHaveLength(1)
  })

  it('refresh 토큰이 없는 새 로그인은 이전 계정의 재발급 토큰을 물려받지 않는다', () => {
    setTokens({ accessToken: 'previous', refreshToken: 'previous-refresh', userId: 1 })
    setTokens({ accessToken: 'dev-token', userId: 2 })
    expect(getRefreshToken()).toBeNull()
  })
})
