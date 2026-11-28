import { useState } from 'react'
import { useLoadValidation } from '@/hooks/useLoadValidation'
import { useCandidatePublication } from '@/hooks/useCandidatePublication'
import { useGenerationJob } from '@/hooks/useGenerationJob'
import { LoadValidationError } from '@/api/loadValidation'
import LoadFileForm from './LoadFileForm'
import GenerationConditions from './GenerationConditions'
import { operationError } from '@/utils/operationInputs'
import ScheduleProgress from '@/components/schedule/ScheduleProgress'
import CandidatePublication from './CandidatePublication'
import TermWorkspace from './TermWorkspace'

function Generation({ term }) {
  const validation = useLoadValidation(term)
  const gen = useGenerationJob(term)
  const [receipt, setReceipt] = useState(null)
  const [showJob, setShowJob] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const publication = useCandidatePublication(term, gen.accepted?.jobId ?? null)
  const [problem, setProblem] = useState(null)
  const active =
    gen.submitting || gen.progress?.phase === 'queued' || gen.progress?.phase === 'running'
  const locked = busy || active || publication.isPublishing
  function edit() {
    gen.discardFinished()
    setProblem(null)
    setReceipt(null)
    setShowJob(false)
    setError('')
  }
  async function validate(input) {
    edit()
    setBusy(true)
    try {
      setReceipt(await validation.validate(input))
    } catch (err) {
      if (err instanceof LoadValidationError) setProblem(err.problem)
      else setError(operationError(err))
    } finally {
      setBusy(false)
    }
  }
  async function generate(request) {
    if (!receipt) return
    setError('')
    setShowJob(false)
    try {
      await gen.start(request)
      setShowJob(true)
    } catch (err) {
      setError(operationError(err))
    }
  }
  return (
    <>
      <LoadFileForm
        locked={locked}
        onEdit={edit}
        onValidate={validate}
        status={
          busy
            ? '검증 중'
            : receipt
              ? '검증 완료'
              : problem || error
                ? '검증 결과 확인 필요'
                : '검증 전'
        }
      >
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
      </LoadFileForm>
      <section className="work-card">
        <h2>시간표 후보 생성</h2>
        {receipt ? (
          <GenerationConditions
            key={receipt.validatedLoadId}
            term={term}
            receipt={receipt}
            locked={locked}
            canStart={gen.canStart}
            onGenerate={generate}
            onEdit={() => {
              setShowJob(false)
              gen.discardFinished()
              setError('')
            }}
          />
        ) : (
          <p>시수표를 검증하면 운영 교시와 편성 조건을 선택할 수 있습니다.</p>
        )}
        {gen.submitting ? (
          <ScheduleProgress progress={{ phase: 'submitting' }} requestedAt={gen.requestedAt} />
        ) : showJob && gen.progress && !gen.statusError && (
          <ScheduleProgress progress={gen.progress} requestedAt={gen.requestedAt} />
        )}
        {gen.statusError && (
          <div className="work-error" role="alert">
            작업 상태를 불러오지 못했습니다.{' '}
            <button onClick={() => gen.refetchStatus().catch((e) => setError(operationError(e)))}>
              작업 다시 조회
            </button>
          </div>
        )}
        {showJob && gen.job?.state === 'READY' && gen.job.result.stopReason === 'TIME_LIMIT' && (
          <p>탐색 제한 시간까지 찾은 후보를 평가 기준순으로 표시합니다.</p>
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
            key={JSON.stringify([gen.accepted.jobId, term.startDate, term.endDate])}
            term={term}
            publication={publication}
            candidates={gen.candidates}
            job={gen.job}
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
    <TermWorkspace title="시간표 생성·게시" adminOnly inlineTermSetup>
      {(term) => <Generation term={term} />}
    </TermWorkspace>
  )
}
