import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import client from '@/api/client'
import { rosterProblem } from '@/api/rosterImport'
import { TableScroll } from '@/components/ui/DetailPage'
import { queryKeys } from '@/hooks/queryKeys'
import { useClassRoles, type ClassTeacher, type ClassAssignment } from '@/hooks/useClassRoles'
import type { CellIssue, RosterScope } from '@/types/rosterImport'
import { CellErrors } from './RosterTables'

function label(teacher: ClassTeacher | null) {
  if (!teacher) return '미배정'
  return (
    <>
      {teacher.displayName}
      {teacher.schoolUserId != null && <small>{teacher.schoolUserId}</small>}
    </>
  )
}

export default function ClassRoles({ scope }: { scope: RosterScope }) {
  const { roles, key, url, session, assertAccess } = useClassRoles(scope)
  const cache = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<CellIssue[]>([])
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  async function apply() {
    if (!file || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    setStatus('')
    setIssues([])
    try {
      assertAccess()
      const form = new FormData()
      form.append('file', file)
      const { data } = await client.post<ClassAssignment[]>(url + '/import', form, {
        headers: { 'Content-Type': undefined },
        signal: controller.signal,
      })
      assertAccess()
      cache.setQueryData([...key, session.scope], data)
      setStatus(`${data.length}개 학급의 담임·부담임을 저장했습니다.`)
      await Promise.all(
        [
          key,
          queryKeys.home.directory(),
          queryKeys.store.staffSummary(),
          queryKeys.mypage.staffProfile(),
        ].map((queryKey) => cache.invalidateQueries({ queryKey })),
      )
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(rosterProblem(err).message)
        if (isAxiosError<{ fieldErrors?: CellIssue[] }>(err))
          setIssues(err.response?.data?.fieldErrors ?? [])
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <section className="ri-card ri-class-roles">
      <h3>학급 담당</h3>
      <p>
        선택한 학기의 모든 학급에 담임·부담임을 지정합니다. ‘학급담당’ 시트가 있는 엑셀을
        선택하세요.
      </p>
      <label className="ri-file">
        학급 담당 파일 (.xlsx)
        <input
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null)
            setStatus('')
            setError('')
            setIssues([])
          }}
        />
      </label>
      <button className="btn btn-primary" disabled={busy || !file} onClick={apply}>
        {busy ? '저장 중…' : '담임·부담임 적용'}
      </button>
      {status && (
        <p role="status" className="ri-success">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="ri-errors">
          {error}
        </p>
      )}
      <CellErrors errors={issues} />
      {roles.isError ? (
        <button className="btn btn-outline" onClick={() => roles.refetch()}>
          학급 담당 다시 조회
        </button>
      ) : (
        roles.data && (
          <details>
            <summary>학급별 담임·부담임 {roles.data.length}개 보기</summary>
            <TableScroll label="학급별 담임·부담임">
              <table>
                <thead>
                  <tr>
                    <th>학급</th>
                    <th>담임 (소속 ID)</th>
                    <th>부담임 (소속 ID)</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.data.map((row) => (
                    <tr key={row.classId}>
                      <td>
                        {row.grade}학년 {row.classNumber}반
                      </td>
                      <td>{label(row.homeroomTeacher)}</td>
                      <td>{label(row.deputyTeacher)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </details>
        )
      )}
    </section>
  )
}
