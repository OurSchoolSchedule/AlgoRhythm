import { useState } from 'react'
import { useLoadValidation } from '@/hooks/useLoadValidation'
import { useCandidatePublication } from '@/hooks/useCandidatePublication'
import { useGenerationJob } from '@/hooks/useGenerationJob'
import { LoadValidationError } from '@/api/loadValidation'
import { operationError, readAliases, readGenerationOptions } from '@/utils/operationInputs'
import ScheduleProgress from '@/components/schedule/ScheduleProgress'
import CandidatePublication from './CandidatePublication'
import TermWorkspace from './TermWorkspace'

function Generation({ term }) {
  const validation = useLoadValidation(term)
  const gen = useGenerationJob(term)
  const [file, setFile] = useState(null),
    [sheet, setSheet] = useState(''),
    [aliases, setAliases] = useState('')
  const [options, setOptions] = useState(''),
    [receipt, setReceipt] = useState(null)
  const [showJob, setShowJob] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const publication = useCandidatePublication(term, gen.accepted?.jobId ?? null)
  const [problem, setProblem] = useState(null)
  const active =
    gen.submitting || gen.progress?.phase === 'queued' || gen.progress?.phase === 'running'
  const locked = busy || active || publication.isPublishing
  function edit() {
    setProblem(null)
    setReceipt(null)
    setShowJob(false)
    setError('')
  }
  async function validate(e) {
    e.preventDefault()
    if (!file) return
    edit()
    setBusy(true)
    try {
      setReceipt(
        await validation.validate({
          file,
          sheet: sheet.trim() || undefined,
          subjectAliases: readAliases(aliases),
        }),
      )
    } catch (err) {
      if (err instanceof LoadValidationError) setProblem(err.problem)
      else setError(operationError(err))
    } finally {
      setBusy(false)
    }
  }
  async function generate() {
    if (!receipt) return
    setError('')
    setShowJob(false)
    try {
      await gen.start({
        ...readGenerationOptions(options),
        validatedLoadId: receipt.validatedLoadId,
      })
      setShowJob(true)
    } catch (err) {
      setError(operationError(err))
    }
  }
  return (
    <>
      <section className="work-card">
        <h2>시수표 검증</h2>
        <form onSubmit={validate}>
          <fieldset disabled={locked}>
            <legend className="desk-sr">시수표 입력</legend>
            <label>
              시수표 엑셀 파일
              <input
                type="file"
                required
                accept=".xlsx"
                onChange={(e) => {
                  edit()
                  setFile(e.target.files?.[0] ?? null)
                }}
              />
            </label>
            <details>
              <summary>시트·과목 별칭 설정</summary>
              <label>
                시트 이름
                <input
                  value={sheet}
                  onChange={(e) => {
                    edit()
                    setSheet(e.target.value)
                  }}
                />
              </label>
              <label>
                과목 별칭 JSON
                <textarea
                  value={aliases}
                  onChange={(e) => {
                    edit()
                    setAliases(e.target.value)
                  }}
                  placeholder='{"공수1": 20}'
                />
              </label>
            </details>
            <button className="work-primary" disabled={!file}>
              시수표 검증
            </button>
          </fieldset>
        </form>
        {busy && (
          <ScheduleProgress
            progress={validation.progress ?? { phase: 'uploading', percent: null }}
          />
        )}
        {problem && !busy && !receipt && (
          <div className="work-error" role="alert">
            <strong>{problem.message} (422)</strong>
            <p>{problem.code}</p>
            <ul>
              {problem.fieldErrors.map((f, i) => (
                <li key={i}>
                  <b>{[f.sheet, f.cell].filter(Boolean).join(' · ')}</b>{' '}
                  {f.row != null && `${f.row}행 `}
                  {f.column && `${f.column}열 `} {f.message} ({f.code})
                </li>
              ))}
            </ul>
          </div>
        )}
        {receipt && (
          <p role="status" className="work-success">
            {receipt.sheet} 검증 완료 · 배정 {receipt.demands.length}건 · 주 {receipt.totalPeriods}
            차시
          </p>
        )}
      </section>
      <section className="work-card">
        <h2>시간표 후보 생성</h2>
        <details>
          <summary>교시·선호 조건 설정</summary>
          <label>
            편성 조건 JSON
            <textarea
              value={options}
              disabled={locked}
              onChange={(e) => {
                setOptions(e.target.value)
                setShowJob(false)
              }}
              aria-describedby="gen-options"
            />
          </label>
          <p id="gen-options">
            teachingSlots와 preferences를 입력할 수 있습니다. 검증 ID는 위 시수표의 응답값을
            사용합니다.
          </p>
        </details>
        <button disabled={!receipt || !gen.canStart || locked} onClick={generate}>
          후보 생성
        </button>
        {gen.submitting && <p role="status">편성 요청 접수 중</p>}
        {showJob && gen.progress && !gen.statusError && (
          <ScheduleProgress progress={gen.progress} />
        )}
        {gen.statusError && (
          <div role="alert">
            작업 상태를 불러오지 못했습니다.{' '}
            <button onClick={() => gen.refetchStatus().catch((e) => setError(operationError(e)))}>
              작업 다시 조회
            </button>
          </div>
        )}
        {showJob && gen.job?.result?.detail && <p>{gen.job.result.detail}</p>}
      </section>
      {error && (
        <p role="alert" className="work-error">
          {error}
        </p>
      )}
      {showJob &&
        gen.accepted &&
        ((!gen.statusError && gen.job?.state === 'READY') ||
          publication.state.phase === 'conflict' ||
          publication.state.phase === 'published') && (
          <CandidatePublication
            key={gen.accepted.jobId}
            term={term}
            publication={publication}
            candidates={gen.candidates}
            onRestart={(revalidate) => {
              setShowJob(false)
              if (revalidate) setReceipt(null)
              setError(
                revalidate || !receipt
                  ? '시수표 파일을 검증한 뒤 새 후보를 생성하세요.'
                  : '후보 생성 버튼으로 새 작업을 접수하세요.',
              )
            }}
          />
        )}
    </>
  )
}
export default function ScheduleCreateView() {
  return (
    <TermWorkspace title="시간표 생성·게시" adminOnly>
      {(term) => <Generation term={term} />}
    </TermWorkspace>
  )
}
