import { useEffect, useRef, useState } from 'react'
import { getOwnerStores } from '@/api/mypage'
import { previewRoster, rosterProblem } from '@/api/rosterImport'
import { useHomeSession, useScopedRead, type HomeSession } from '@/hooks/useHomeSession'
import { useUpdateActiveStore } from '@/hooks/useMypage'
import { queryKeys } from '@/hooks/queryKeys'
import { useRosterImport } from '@/hooks/useRosterImport'
import { useTermChoice } from '@/hooks/useTermChoice'
import TermForm, { TermStatus } from '@/pages/schedule/TermForm'
import { Dialog } from '@/pages/home/HomePanels'
import type { RosterReceipt, RosterScope } from '@/types/rosterImport'
import { PreviewTable, SavedRoster } from './RosterTables'
import './rosterImport.css'

type Preview = Awaited<ReturnType<typeof previewRoster>>
type Task = 'download' | 'preview' | 'confirm'

function ImportForm({ scope }: { scope: RosterScope }) {
  const api = useRosterImport(scope)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [receipt, setReceipt] = useState<RosterReceipt | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<Task | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  function choose(next: File | null) {
    setPreview(null)
    setReceipt(null)
    setError('')
    if (next && (!/\.xlsx$/i.test(next.name) || next.size > 5 * 1024 * 1024 || !next.size)) {
      setFile(null)
      setError('내용이 있는 5 MiB 이하의 .xlsx 명부 파일을 선택해 주세요.')
      return
    }
    setFile(next)
  }

  async function run(task: Task) {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(task)
    setError('')
    try {
      if (task === 'download') {
        const blob = await api.template(controller.signal)
        if (controller.signal.aborted) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '교사명부.xlsx'
        document.body.append(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      } else if (task === 'preview' && file) {
        setPreview(null)
        setReceipt(null)
        const next = await api.preview(file, controller.signal)
        if (!controller.signal.aborted) setPreview(next)
      } else if (
        task === 'confirm' &&
        file &&
        preview?.previewId &&
        !receipt &&
        !preview.counts.errors
      ) {
        let hash: string
        try {
          const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
          hash = Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join('')
        } catch {
          setPreview(null)
          throw new Error('선택 파일을 다시 읽을 수 없습니다. 파일을 다시 선택해 검증해 주세요.')
        }
        if (controller.signal.aborted) return
        if (hash !== preview.fileSha256) {
          setPreview(null)
          throw new Error('검증 후 파일이 바뀌었습니다. 현재 파일을 다시 검증해 주세요.')
        }
        const next = await api.confirm(preview.previewId, hash, controller.signal)
        if (!controller.signal.aborted) setReceipt(next)
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const problem = rosterProblem(cause)
        const expired = task === 'confirm' && [403, 404, 409].includes(problem.status ?? 0)
        if (expired) setPreview(null)
        setError(
          problem.message + (expired ? ' 학교·학기를 확인한 뒤 파일을 다시 검증해 주세요.' : ''),
        )
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) setBusy(null)
    }
  }

  return (
    <>
      <section className="ri-card">
        <div className="ri-heading">
          <h3>교사 명부 엑셀</h3>
          <button className="btn btn-outline" disabled={!!busy} onClick={() => run('download')}>
            명부 양식 내려받기
          </button>
        </div>
        <p>
          인증 이메일과 표시 이름을 입력하고, 담당 과목마다 한 행씩 작성하세요. 과목·담임 학급
          코드는 양식의 ‘코드표’에서 확인할 수 있습니다.
        </p>
        <details>
          <summary>입력 예시</summary>
          <p>
            한 교사가 수학과 물리를 맡으면 같은 이메일·이름으로 두 행을 쓰고 각 행에 과목 코드
            하나를 적습니다. 미배정 교사는 과목을 비워 한 행만 작성합니다. 담임을 맡지 않으면 학급
            코드도 비웁니다.
          </p>
        </details>
        <label className="ri-file">
          명부 파일 (.xlsx)
          <input
            type="file"
            accept=".xlsx"
            disabled={!!busy}
            onChange={(e) => choose(e.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={!!busy || !file}
          onClick={() => run('preview')}
        >
          파일 검증 및 미리보기
        </button>
        {busy && (
          <p role="status">
            {
              { download: '양식 다운로드 중…', preview: '명부 검증 중…', confirm: '명부 확정 중…' }[
                busy
              ]
            }
          </p>
        )}
        {error && (
          <p role="alert" className="ri-errors">
            {error}
          </p>
        )}
      </section>
      {preview && (
        <section className="ri-card">
          <h3>등록 미리보기</h3>
          {preview.message && (
            <p role="alert" className="ri-errors">
              {preview.message}
            </p>
          )}
          <PreviewTable preview={preview} />
          {receipt ? (
            <p role="status" className="ri-success">
              명부 확정 완료 · 신규 {receipt.counts.add}명 · 변경 {receipt.counts.update}명 · 동일{' '}
              {receipt.counts.unchanged}명
            </p>
          ) : (
            <div className="ri-confirm">
              <p>
                {preview.previewId
                  ? '확정하면 파일에 포함된 교사의 표시 이름과 선택 학기의 과목·담임을 반영합니다.'
                  : '파일을 수정해 다시 선택한 뒤 검증해 주세요.'}
              </p>
              <button
                className="btn btn-primary"
                disabled={!!busy || !preview.previewId || !!preview.counts.errors}
                onClick={() => run('confirm')}
              >
                명부 등록 확정
              </button>
            </div>
          )}
        </section>
      )}
      <section className="ri-card">
        <h3>저장된 명부</h3>
        {api.directory.isError ? (
          <p role="alert">
            명부를 조회하지 못했습니다.{' '}
            <button className="btn btn-outline" onClick={() => api.directory.refetch()}>
              명부 다시 조회
            </button>
          </p>
        ) : api.directory.data ? (
          <SavedRoster entries={api.directory.data} />
        ) : (
          <p role="status">명부를 불러오는 중…</p>
        )}
      </section>
    </>
  )
}

function ScopedPanel({ session }: { session: HomeSession }) {
  const state = useTermChoice(session)
  const { term } = state
  const [editing, setEditing] = useState(false)
  const schools = useScopedRead(session, queryKeys.mypage.ownerStores(), true, () =>
    getOwnerStores(),
  )
  const changeSchool = useUpdateActiveStore()
  const active = session.school!
  return (
    <section className="ri-panel" aria-label="교사·과목 명부 일괄 등록">
      <header>
        <h2>교사·과목 명부 일괄 등록</h2>
        <p>
          학교와 학기를 선택해 교사별 담당 과목과 담임을 등록하세요. 주당 수업 시수는 ‘시간표
          생성’에서 입력합니다.
        </p>
      </header>
      <div className="ri-scope">
        <label>
          대상 학교
          <select
            value={active.schoolId}
            disabled={changeSchool.isPending}
            onChange={(e) => changeSchool.mutate(Number(e.target.value))}
          >
            <option value={active.schoolId}>{active.name}</option>
            {schools.data
              ?.filter((s) => s.schoolId !== active.schoolId)
              .map((s) => (
                <option key={s.schoolId} value={s.schoolId}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <div>
          <span>대상 학기</span>
          <button className="btn btn-outline" onClick={() => setEditing(true)}>
            {term
              ? `${term.academicYear}학년도 ${term.semester}학기 변경`
              : '학기 선택'}
          </button>
        </div>
      </div>
      {(schools.data?.length ?? 0) > 1 && (
        <p>다른 학교를 선택하면 그 학교의 업무 홈으로 이동합니다.</p>
      )}
      {schools.isError && (
        <p role="alert">
          학교 목록을 가져오지 못했습니다.{' '}
          <button className="btn btn-outline" onClick={() => schools.refetch()}>
            학교 목록 다시 조회
          </button>
        </p>
      )}
      {changeSchool.isError && <p role="alert">활성 학교 전환에 실패했습니다.</p>}
      {editing && (
        <Dialog title="업무 학기 설정" onClose={() => setEditing(false)}>
          <TermForm session={session} state={state} onClose={() => setEditing(false)} />
        </Dialog>
      )}
      {term ? (
        <ImportForm key={JSON.stringify(term)} scope={term} />
      ) : (
        <TermStatus state={state} onRegister={() => setEditing(true)} />
      )}
    </section>
  )
}

export default function RosterImportPanel() {
  const session = useHomeSession()
  if (!session.access.actions.generate)
    return <p role="status">활성 학교의 재직 관리자만 명부를 관리할 수 있습니다.</p>
  return <ScopedPanel key={JSON.stringify(session.scope)} session={session} />
}
