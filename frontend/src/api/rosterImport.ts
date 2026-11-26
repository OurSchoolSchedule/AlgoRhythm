import { isAxiosError } from 'axios'
import client from './client.js'
import type {
  CellIssue,
  RosterEntry,
  RosterPreview,
  RosterReceipt,
  RosterScope,
} from '@/types/rosterImport'

const rosterPath = (scope: RosterScope) => `/api/schools/${scope.schoolId}/roster`
const importsPath = (scope: RosterScope) => `${rosterPath(scope)}/terms/${scope.termId}/imports`

export async function readRoster(scope: RosterScope, signal: AbortSignal) {
  const { data } = await client.get<RosterEntry[]>(rosterPath(scope), {
    params: { termId: scope.termId },
    signal,
  })
  return data
}
export async function downloadRosterTemplate(scope: RosterScope, signal: AbortSignal) {
  const { data } = await client.get<Blob>(importsPath(scope) + '/template', {
    responseType: 'blob',
    signal,
  })
  return data
}

type WorkbookProblem = { code?: string; message?: string; errors?: CellIssue[] }
export function rosterProblem(error: unknown) {
  if (isAxiosError<WorkbookProblem>(error)) {
    const data = error.response?.data
    const status = error.response?.status
    return {
      message:
        data?.message ||
        (status === 403
          ? '현재 학교의 재직 관리자만 명부를 관리할 수 있습니다.'
          : status === 404
            ? '학교와 선택한 학기를 확인해 주세요.'
            : '요청 결과를 받지 못했습니다. 다시 시도해 주세요.'),
      status,
    }
  }
  return {
    message: error instanceof Error ? error.message : '요청에 실패했습니다.',
    status: undefined,
  }
}

export async function previewRoster(scope: RosterScope, file: File, signal: AbortSignal) {
  const form = new FormData()
  form.append('file', file)
  // Let the browser supply the multipart boundary. Authentication stays on the shared client.
  const { data, status } = await client.post<RosterPreview | WorkbookProblem>(
    importsPath(scope) + '/preview',
    form,
    {
      signal,
      headers: { 'Content-Type': undefined },
      validateStatus: (status) => status === 200 || status === 422,
    },
  )
  if (status === 422 && data && !('counts' in data)) {
    // Whole-workbook errors use a different response from teacher-level previews.
    const problem = data
    return {
      previewId: null,
      fileSha256: '',
      counts: { add: 0, update: 0, unchanged: 0, errors: problem.errors?.length ?? 0 },
      changes: [],
      errors: problem.errors ?? [],
      message: problem.message || '명부 파일을 확인해 주세요.',
    }
  }
  if (
    !data ||
    !('counts' in data) ||
    !data.counts ||
    !Array.isArray(data.changes) ||
    !Array.isArray(data.errors) ||
    (status === 200 && (!data.previewId || !/^[a-f0-9]{64}$/.test(data.fileSha256)))
  ) {
    throw new Error('서버의 명부 검증 결과를 확인할 수 없습니다.')
  }
  return { ...data, previewId: status === 200 ? data.previewId : null, message: '' }
}
export async function confirmRoster(
  scope: RosterScope,
  previewId: string,
  fileSha256: string,
  signal: AbortSignal,
) {
  const { data } = await client.post<RosterReceipt>(
    importsPath(scope) + '/' + encodeURIComponent(previewId) + '/confirm',
    { fileSha256 },
    { signal },
  )
  if (data?.previewId !== previewId || data.fileSha256 !== fileSha256 || !data.counts) {
    throw new Error('확정 영수증을 확인하지 못했습니다. 같은 미리보기로 다시 확인해 주세요.')
  }
  return data
}
