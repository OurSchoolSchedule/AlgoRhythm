import { useState } from 'react'
import axios from 'axios'
import { validateTeachingLoad, LoadValidationError } from '@/api/loadValidation'
import { submitGeneration, getGenerationStatus } from '@/api/generationJobs'
import { publishCandidate } from '@/api/publications'
import './school42.css'

const term = 547001
const week = '2026-11-23'
const files = '/school42-files/'
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const dayNames = ['월', '화', '수', '목', '금']

function rehearsalClient(code) {
  const http = axios.create({
    baseURL: '/api/school42',
    headers: { Authorization: 'School42 ' + code },
  })
  http.interceptors.request.use((request) => {
    request.url = request.url.replace(/^\/api\//, '/')
    return request
  })
  return http
}

function Timetable({ lessons, admin }) {
  const classes = [
    ...new Set(lessons.map((x) => x.grade + '-' + x.classNumber)),
  ].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
  const [selected, setSelected] = useState('')
  const group = classes.includes(selected) ? selected : classes[0]
  const shown = admin
    ? lessons.filter((x) => x.grade + '-' + x.classNumber === group)
    : lessons
  const cells = new Map(shown.map((x) => [x.dayOfWeek + x.periodNumber, x]))
  return (
    <>
      {admin && classes.length > 0 && (
        <label>
          학급{' '}
          <select value={group} onChange={(e) => setSelected(e.target.value)}>
            {classes.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      )}
      {lessons.length === 0 ? (
        <p>게시된 시간표가 없습니다.</p>
      ) : (
        <div className="s42-scroll">
          <table>
            <caption>
              {admin ? group + ' 학급' : '최도현 교사'} · 11월 23일 주간 시간표
            </caption>
            <thead>
              <tr>
                <th>교시</th>
                {dayNames.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <tr key={p}>
                  <th>{p}</th>
                  {days.map((d) => {
                    const item = cells.get(d + p)
                    return (
                      <td key={d}>
                        {item ? (
                          <>
                            {item.subjectName}
                            <small>
                              {admin
                                ? item.teacherName
                                : item.grade +
                                  '학년 ' +
                                  item.classNumber +
                                  '반'}
                            </small>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default function School42() {
  const [code, setCode] = useState('')
  const [http, setHttp] = useState(null)
  const [status, setStatus] = useState(null)
  const [file, setFile] = useState(null)
  const [load, setLoad] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [choice, setChoice] = useState(0)
  const [lessons, setLessons] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [inputVersion, setInputVersion] = useState(0)
  const admin = status?.role === 'ADMIN'

  function clearFile() {
    setLoad(null)
    setTicket(null)
    setCandidates([])
    setChoice(0)
  }
  function leave() {
    setHttp(null)
    setStatus(null)
    setLessons([])
    setFile(null)
    clearFile()
    setMessage('')
    setError('')
  }
  async function act(fn) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
    } catch (e) {
      const body = e.response?.data
      if (e instanceof LoadValidationError) {
        setError(
          e.problem.fieldErrors
            .map((x) => [x.cell, x.code, x.message].filter(Boolean).join(' · '))
            .join(' / ') || e.problem.message,
        )
      } else {
        setError(
          e.response?.status === 403
            ? '입장 코드 또는 역할 권한을 확인하세요.'
            : body?.message ||
                body?.detail ||
                e.message ||
                '요청을 완료하지 못했습니다.',
        )
      }
    } finally {
      setBusy(false)
    }
  }
  async function refresh(connection) {
    const { data } = await connection.get('/status')
    connection.defaults.headers.common['X-School42-Round'] = String(data.round)
    const result = await connection.get('/week')
    if (!Array.isArray(result.data))
      throw new Error('시간표 응답을 확인하세요.')
    if (status && data.round !== status.round) {
      clearFile()
      setFile(null)
      setInputVersion((v) => v + 1)
    }
    setStatus(data)
    setLessons(result.data)
  }
  async function enter() {
    const connection = rehearsalClient(code.trim())
    await refresh(connection)
    setHttp(() => connection)
    setCode('')
  }
  async function validate(useSample) {
    clearFile()
    let selected = file
    if (useSample) {
      const r = await fetch(files + 'teaching_load_42.xlsx')
      if (!r.ok) throw new Error('샘플 시수표를 불러오지 못했습니다.')
      selected = new File([await r.blob()], 'teaching_load_42.xlsx')
    }
    if (!selected) throw new Error('검증할 엑셀 파일을 선택하세요.')
    const receipt = await validateTeachingLoad(
      term,
      { file: selected },
      {},
      http,
    )
    setLoad(receipt)
    setMessage(
      selected.name +
        ' · 배정 ' +
        receipt.demands.length +
        '건 · 주 ' +
        receipt.totalPeriods +
        '차시',
    )
  }
  async function generate() {
    setCandidates([])
    setTicket(null)
    setChoice(0)
    const r = await fetch(files + 'generate_request.json')
    if (!r.ok) throw new Error('편성 조건을 불러오지 못했습니다.')
    const { teachingSlots, preferences } = await r.json()
    const job = await submitGeneration(
      term,
      { validatedLoadId: load.validatedLoadId, teachingSlots, preferences },
      undefined,
      http,
    )
    setTicket(job)
    setMessage('후보를 생성하고 있습니다.')
    for (let i = 0; i < 65; i++) {
      const result = await getGenerationStatus(term, job, undefined, http)
      if (result.state === 'READY') {
        setCandidates(result.result.candidates)
        setMessage('후보 ' + result.result.candidates.length + '개 생성 완료')
        return
      }
      if (!['RUNNING', 'QUEUED'].includes(result.state))
        throw new Error(result.result?.detail || result.state)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    throw new Error('작업 시간이 초과되었습니다. 회차 상태를 새로고침하세요.')
  }
  async function publish() {
    const receipt = await publishCandidate(
      term,
      {
        jobId: ticket.jobId,
        candidateId: candidates[choice].candidateId,
        expectedPublishRev: ticket.expectedPublishRev,
        effectiveFrom: week,
      },
      undefined,
      http,
    )
    await refresh(http)
    setCandidates([])
    setTicket(null)
    setMessage(
      '게시 완료 · 버전 ' +
        receipt.publishRev +
        ' · 주 ' +
        receipt.weeklyLessons +
        '차시',
    )
  }
  async function reset() {
    await http.post('/reset')
    clearFile()
    setFile(null)
    setInputVersion((v) => v + 1)
    await refresh(http)
    setMessage('회차 초기화 완료 · 명부와 시수표를 다시 사용할 수 있습니다.')
  }

  return (
    <main className="s42">
      <header>
        <p>우리학교시간표 · 팀 시연</p>
        <h1>School42 시간표 실습실</h1>
        <p>시연한들고등학교 · 2026학년도 2학기 · 적용 주간 11월 23–27일</p>
      </header>
      <section>
        <h2>시연용 시수표</h2>
        <div className="s42-actions">
          <a download href={files + 'teaching_load_42.xlsx'}>
            정상 시수표 다운로드
          </a>
          <a download href={files + 'wrong_total_42.xlsx'}>
            합계 오류 시수표 다운로드
          </a>
        </div>
      </section>
      {!status ? (
        <section>
          <h2>팀원 입장</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void act(enter)
            }}
          >
            <label>
              역할별 입장 코드{' '}
              <input
                autoComplete="off"
                type="password"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button disabled={busy || !code.trim()}>입장</button>
          </form>
        </section>
      ) : (
        <>
          <section>
            <div className="s42-row">
              <h2>
                {admin ? '관리자' : '최도현 교사'} · {status.round}회차
              </h2>
              <button className="quiet" disabled={busy} onClick={leave}>
                나가기
              </button>
            </div>
            <p>
              교사 {status.teachers}명 · 학급 {status.classes}개 · 과목{' '}
              {status.subjects}개
            </p>
          </section>
          {admin && (
            <section>
              <h2>시간표 생성·게시</h2>
              <fieldset disabled={busy}>
                <legend>시수표 검증</legend>
                <div className="s42-actions">
                  <button onClick={() => act(() => validate(true))}>
                    샘플 시수표 바로 검증
                  </button>
                  <label>
                    파일 선택{' '}
                    <input
                      key={inputVersion}
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => {
                        clearFile()
                        setFile(e.target.files[0])
                        setMessage('')
                        setError('')
                      }}
                    />
                  </label>
                  <button
                    className="quiet"
                    disabled={!file}
                    onClick={() => act(() => validate(false))}
                  >
                    선택 파일 검증
                  </button>
                </div>
              </fieldset>
              <fieldset disabled={busy || !load}>
                <legend>편성 및 게시</legend>
                <div className="s42-actions">
                  <button onClick={() => act(generate)}>후보 생성</button>
                  {candidates.length > 0 && (
                    <>
                      <label>
                        시간표 후보{' '}
                        <select
                          value={choice}
                          onChange={(e) => setChoice(Number(e.target.value))}
                        >
                          {candidates.map((c, i) => (
                            <option key={c.candidateId} value={i}>
                              후보 {i + 1} · {c.placements.length}차시
                            </option>
                          ))}
                        </select>
                      </label>
                      <button onClick={() => act(publish)}>
                        선택한 후보 게시
                      </button>
                    </>
                  )}
                </div>
              </fieldset>
            </section>
          )}
          <section>
            <div className="s42-row">
              <h2>
                {admin ? '학교 시간표' : '내 시간표'} · {lessons.length}차시
              </h2>
              <button
                className="quiet"
                disabled={busy}
                onClick={() => act(() => refresh(http))}
              >
                새로고침
              </button>
            </div>
            <Timetable lessons={lessons} admin={admin} />
          </section>
          {admin && status?.teamResetEnabled && (
            <section>
              <h2>다음 회차</h2>
              <p>
                현재 회차의 편성 작업과 게시 수업을 지우고 교사·학급·과목 명부를
                보존합니다. 팀원이 함께 쓰는 회차입니다.
              </p>
              <button
                className="quiet"
                disabled={busy}
                onClick={() => act(reset)}
              >
                회차 초기화
              </button>
            </section>
          )}
        </>
      )}
      <div className="s42-feedback" aria-live="polite">
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          (message || busy) && <p role="status">{message || '처리 중…'}</p>
        )}
      </div>
    </main>
  )
}
