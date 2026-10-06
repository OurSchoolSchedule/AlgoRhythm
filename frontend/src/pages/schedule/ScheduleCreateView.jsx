import { useMemo, useRef, useState } from 'react'
import {
  useCandidateSchedules,
  useConfirmSchedule,
  useCreateScheduleRequest,
  useGenerateSchedule,
  usePeriodSettings,
  useSchoolClasses,
  useSubjects,
  useTeachersWithoutAvailability,
} from '@/hooks'
import {
  GENERATION_STRATEGIES,
  buildSlotRequirements,
  getApiErrorMessage,
  termFromStartDate,
} from '@/utils/timetableGeneration.js'

const STEPS = ['기본 설정', '생성 방식', '생성 및 검토']

export default function ScheduleCreateView({ navigate }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    semesterStart: '2026-09-01',
    semesterEnd: '2027-02-28',
    semesterName: '2026학년도 2학기',
    csvName: '',
    strategies: GENERATION_STRATEGIES.map((item) => item.id),
  })
  const [requestId, setRequestId] = useState(null)
  const [candidateKey, setCandidateKey] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [flowError, setFlowError] = useState('')
  const fileRef = useRef(null)

  const createRequest = useCreateScheduleRequest()
  const generate = useGenerateSchedule()
  const confirm = useConfirmSchedule()
  const generating = createRequest.isPending || generate.isPending

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    setForm((prev) => ({ ...prev, csvName: file?.name ?? '' }))
  }

  const handleGenerate = async (slotRequirements) => {
    setFlowError('')
    setSelectedIndex(null)
    const term = termFromStartDate(form.semesterStart)
    if (!term.academicYear || !term.semester) {
      setFlowError('학기 시작일에서 학년도와 학기를 읽을 수 없습니다.')
      return
    }
    if (form.strategies.length === 0) {
      setFlowError('생성 방식을 하나 이상 고르세요.')
      return
    }
    try {
      const request = requestId ? { id: requestId } : await createRequest.mutateAsync()
      const id = request?.id
      if (id == null) {
        setFlowError('생성 요청 번호를 받지 못했습니다.')
        return
      }
      setRequestId(id)
      const result = await generate.mutateAsync({
        scheduleRequestId: id,
        payload: {
          academicYear: term.academicYear,
          semester: term.semester,
          slotRequirements,
          generationOptions: {
            candidateCount: form.strategies.length,
            strategies: form.strategies,
          },
        },
      })
      if (!result?.candidateTimetableKey) {
        setCandidateKey('')
        setFlowError('후보 조회 키를 받지 못했습니다.')
        return
      }
      setCandidateKey(result.candidateTimetableKey)
    } catch (error) {
      setFlowError(getApiErrorMessage(error, '시간표를 만들지 못했습니다.'))
    }
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button type="button" onClick={() => navigate('admin')} style={textButtonStyle}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>시간표 생성</h1>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '28px 32px', marginTop: 20 }}>
        {step === 0 && (
          <Step0 form={form} setForm={setForm} fileRef={fileRef} handleFile={handleFile} />
        )}
        {step === 1 && (
          <Step1 form={form} setForm={setForm} />
        )}
        {step === 2 && (
          <Step2
            form={form}
            generating={generating}
            flowError={flowError}
            candidateKey={candidateKey}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            requestId={requestId}
            onGenerate={handleGenerate}
            confirm={confirm}
            navigate={navigate}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || generating}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid var(--color-border-input)',
            background: 'transparent',
            color: step === 0 ? 'var(--color-border-input)' : 'var(--color-text-secondary)',
            cursor: step === 0 ? 'default' : 'pointer',
            fontSize: 14,
          }}
        >이전</button>
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(2, current + 1))}
            style={primaryButtonStyle}
          >다음</button>
        ) : null}
      </div>
    </div>
  )
}

function Step0({ form, setForm, fileRef, handleFile }) {
  return (
    <div>
      <SectionTitle>학기 기본 정보</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="학기명">
          <input
            value={form.semesterName}
            onChange={(event) => setForm((prev) => ({ ...prev, semesterName: event.target.value }))}
            style={inputStyle}
            placeholder="예: 2026학년도 2학기"
          />
        </Field>
        <Field label="학기 시작일">
          <input
            type="date"
            value={form.semesterStart}
            onChange={(event) => setForm((prev) => ({ ...prev, semesterStart: event.target.value }))}
            style={inputStyle}
          />
        </Field>
        <Field label="학기 종료일">
          <input
            type="date"
            value={form.semesterEnd}
            onChange={(event) => setForm((prev) => ({ ...prev, semesterEnd: event.target.value }))}
            style={inputStyle}
          />
        </Field>
      </div>

      <SectionTitle>교사·과목 데이터 (CSV 미리보기)</SectionTitle>
      <div style={{ background: 'var(--color-surface-hover)', borderRadius: 8, border: '1px dashed var(--color-border-input)', padding: '24px', textAlign: 'center', marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--color-text-subtle)' }}>
          {form.csvName || 'CSV 파일은 이 화면에서만 미리 봅니다.'}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontSize: 13, cursor: 'pointer' }}
        >{form.csvName ? '파일 변경' : '파일 선택'}</button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
        미리보기입니다. 서버에 저장되지 않으며, 생성에는 이미 등록된 학급·과목·교시를 사용합니다.
      </p>
    </div>
  )
}

function Step1({ form, setForm }) {
  const toggle = (id) => {
    setForm((prev) => {
      const selected = prev.strategies.includes(id)
        ? prev.strategies.filter((item) => item !== id)
        : [...prev.strategies, id]
      return { ...prev, strategies: selected }
    })
  }

  return (
    <div>
      <SectionTitle>생성 방식</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GENERATION_STRATEGIES.map((item) => {
          const checked = form.strategies.includes(item.id)
          return (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 8px',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                background: checked ? 'var(--color-primary-50)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(item.id)}
                style={{ accentColor: 'var(--color-primary)', width: 15, height: 15, marginTop: 2 }}
              />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>{item.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function Step2({
  form,
  generating,
  flowError,
  candidateKey,
  selectedIndex,
  setSelectedIndex,
  requestId,
  onGenerate,
  confirm,
  navigate,
}) {
  const term = termFromStartDate(form.semesterStart)
  const classesQuery = useSchoolClasses(term.academicYear ?? undefined)
  const subjectsQuery = useSubjects()
  const periodsQuery = usePeriodSettings()
  const missingQuery = useTeachersWithoutAvailability()
  const candidatesQuery = useCandidateSchedules(candidateKey)
  const slots = useMemo(
    () => buildSlotRequirements(classesQuery.data, subjectsQuery.data, periodsQuery.data),
    [classesQuery.data, subjectsQuery.data, periodsQuery.data],
  )
  const ready = slots.length > 0 && form.strategies.length > 0
  const sourceLoading = classesQuery.isLoading || subjectsQuery.isLoading || periodsQuery.isLoading
  const sourceError = classesQuery.isError || subjectsQuery.isError || periodsQuery.isError
  const candidates = candidatesQuery.data ?? []

  const runGenerate = () => onGenerate(slots)

  const retrySource = () => {
    if (classesQuery.isError) classesQuery.refetch()
    if (subjectsQuery.isError) subjectsQuery.refetch()
    if (periodsQuery.isError) periodsQuery.refetch()
  }

  const handleConfirm = async () => {
    if (selectedIndex == null || requestId == null) return
    try {
      await confirm.mutateAsync({
        scheduleRequestId: requestId,
        payload: {
          candidateIndex: selectedIndex,
          academicYear: term.academicYear,
          semester: term.semester,
          startDate: form.semesterStart,
          endDate: form.semesterEnd,
        },
      })
      navigate('timetable')
    } catch {
      /* confirm.isError로 이유를 보여 준다 */
    }
  }

  return (
    <div>
      <SectionTitle>생성 요약</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          ['학기명', form.semesterName || '없음'],
          ['기간', `${form.semesterStart} ~ ${form.semesterEnd}`],
          ['학년도·학기', term.academicYear ? `${term.academicYear}년 ${term.semester}학기` : '없음'],
          ['배정 요구', sourceLoading ? '확인 중' : `${slots.length}칸`],
          ['생성 방식', `${form.strategies.length}개`],
          ['CSV', form.csvName ? `${form.csvName} · 미리보기` : '없음'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {missingQuery.data && missingQuery.data.allSubmitted === false && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text)' }}>
          불가 교시 미제출 {missingQuery.data.unsubmittedUserIds.length}명
          {missingQuery.data.unsubmittedUserIds.length > 0
            ? ` (사용자 ${missingQuery.data.unsubmittedUserIds.join(', ')})`
            : ''}
        </p>
      )}

      {sourceLoading && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>학급·과목·교시를 확인하는 중...</p>}
      {sourceError && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-danger)' }}>
          학급·과목·교시를 불러오지 못했습니다.{' '}
          <button type="button" className="history-link" onClick={retrySource}>다시 시도</button>
        </p>
      )}
      {!sourceLoading && !sourceError && slots.length === 0 && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          등록된 학급, 과목, 교시가 있어야 시간표를 만들 수 있습니다.
        </p>
      )}

      {!candidateKey && (
        <button
          type="button"
          onClick={runGenerate}
          disabled={!ready || generating || sourceLoading}
          style={{
            ...primaryButtonStyle,
            width: '100%',
            opacity: !ready || generating ? 0.6 : 1,
            cursor: !ready || generating ? 'default' : 'pointer',
          }}
        >{generating ? '만드는 중...' : '시간표 생성'}</button>
      )}

      {generating && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>후보를 만들고 있습니다.</p>
      )}
      {flowError && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-danger)' }}>
          {flowError}{' '}
          <button type="button" className="history-link" onClick={runGenerate}>다시 시도</button>
        </p>
      )}

      {candidateKey && candidatesQuery.isLoading && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>후보를 불러오는 중...</p>
      )}
      {candidateKey && candidatesQuery.isError && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-danger)' }}>
          {getApiErrorMessage(candidatesQuery.error, '후보를 불러오지 못했습니다.')}{' '}
          <button type="button" className="history-link" onClick={() => candidatesQuery.refetch()}>다시 시도</button>
        </p>
      )}
      {candidateKey && !candidatesQuery.isLoading && !candidatesQuery.isError && candidates.length === 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>만들어진 후보가 없습니다.</p>
      )}

      {candidates.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
            후보 {candidates.length}개 중 하나를 고르세요.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {candidates.map((candidate, index) => {
              const selected = selectedIndex === index
              return (
                <div
                  key={`${candidate.strategyName ?? 'candidate'}-${index}`}
                  style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid var(--color-border)',
                    background: selected ? 'var(--color-primary-50)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {candidate.strategyName || `후보 ${index + 1}`}
                    </p>
                    {candidate.strategyDescription && (
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{candidate.strategyDescription}</p>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      수업 {candidate.totalShifts ?? 0} · 미배정 {candidate.unassignedCount ?? 0} · 배정률 {candidate.coverageRate ?? '없음'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: selected ? 'none' : '1px solid var(--color-border-input)',
                      background: selected ? 'var(--color-primary-button)' : 'var(--color-surface)',
                      color: selected ? 'var(--color-on-primary)' : 'var(--color-text)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >{selected ? '선택됨' : '선택하기'}</button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIndex == null || confirm.isPending}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginTop: 16,
              opacity: selectedIndex == null || confirm.isPending ? 0.6 : 1,
              cursor: selectedIndex == null || confirm.isPending ? 'default' : 'pointer',
            }}
          >{confirm.isPending ? '확정하는 중...' : '확정하기'}</button>
          {confirm.isError && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-danger)' }}>
              {getApiErrorMessage(confirm.error, '시간표를 확정하지 못했습니다.')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((label, index) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: index < steps.length - 1 ? 1 : 'initial' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
              background: index === current ? 'var(--color-primary-button)' : 'var(--color-surface-hover)',
              color: index === current ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}>{index + 1}</div>
            <span style={{ fontSize: 13, color: index === current ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: index === current ? 600 : 400 }}>{label}</span>
          </div>
          {index < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--color-border)', margin: '0 12px' }} />}
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ children }) {
  return <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>{children}</p>
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  fontSize: 13,
  color: 'var(--color-text)',
  boxSizing: 'border-box',
  outline: 'none',
}

const primaryButtonStyle = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-primary-button)',
  color: 'var(--color-on-primary)',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
}

const textButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  fontSize: 13,
  padding: 0,
}
