import { useEffect, useMemo, useRef, useState } from 'react'
import { getAccessToken } from '@/api'
import CreateShiftSwapForm from '@/components/schedule/CreateShiftSwapForm.jsx'
import CreateSubstituteForm from '@/components/schedule/CreateSubstituteForm.jsx'
import CreateTimetableCellForm from '@/components/schedule/CreateTimetableCellForm.jsx'
import WeeklyTimetableGrid from '@/components/schedule/WeeklyTimetableGrid.jsx'
import { SCHOOL_PERIOD_SLOTS, TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'
import { useDeleteTimetable, useSchoolTimetable, useUpdateTimetable } from '@/hooks'
import { formatClassName, formatClock } from '@/utils/homeFocus.js'
import { toISODate } from '@/utils'
import {
  formatWeekCaption,
  formatWeekMonthLabel,
  formatWeekShort,
  isSameSchoolWeek,
  nextOpenWeek,
  schoolWeekDays,
  shiftSchoolWeek,
  startOfSchoolWeek,
  weekBreakLabel,
} from '@/utils/schoolWeek.js'
import { getApiErrorMessage, termFromStartDate } from '@/utils/timetableGeneration.js'
import {
  applyCellMoves,
  cellSlotKey,
  changedTimetablePatches,
  dropRejection,
} from '@/utils/timetableBoard.js'

/** 저장 API가 안정화되기 전까지 수정 진입을 막아 둔다. */
const SHOW_EDIT = false

function maskByDay(byDay, periods, accept) {
  const next = {}
  for (const day of TIMETABLE_DAYS) {
    next[day] = {}
    for (const period of periods) {
      const cell = byDay?.[day]?.[period] ?? null
      next[day][period] = cell && accept(cell) ? cell : null
    }
  }
  return next
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function uniqueField(byDay, periods, field) {
  const values = new Set()
  for (const day of TIMETABLE_DAYS) {
    for (const period of periods) {
      const value = byDay?.[day]?.[period]?.[field]
      if (value) values.add(value)
    }
  }
  return [...values].sort((left, right) => left.localeCompare(right, 'ko'))
}

function periodRange(cell, period) {
  const slot = SCHOOL_PERIOD_SLOTS.find((item) => item.period === period)
  const start = formatClock(cell?.startTime || slot?.start)
  const end = formatClock(cell?.endTime || slot?.end)
  if (start && end) return `${start}–${end}`
  return start
}

export default function TimetableView({ navigate, userRole = 'worker' }) {
  const isAdmin = userRole === 'admin'
  const now = useMemo(() => new Date(), [])
  const defaultTerm = useMemo(() => termFromStartDate(toISODate(now)), [now])
  const [academicYear, setAcademicYear] = useState(defaultTerm.academicYear || new Date().getFullYear())
  const [semester, setSemester] = useState(defaultTerm.semester || 2)
  const [useTermFilter, setUseTermFilter] = useState(true)
  const query = useSchoolTimetable({
    referenceDate: now,
    academicYear: useTermFilter ? academicYear : undefined,
    semester: useTermFilter ? semester : undefined,
  })
  const timetable = query.timetable
  const isLoading = query.isLoading
  const previewOnly = !getAccessToken()
  const failed = query.isError && !previewOnly
  const refetch = query.refetch

  const [weekStart, setWeekStart] = useState(() => startOfSchoolWeek(new Date()))
  const [scope, setScope] = useState(isAdmin ? 'class' : 'mine')
  const [target, setTarget] = useState('')
  const [termOpen, setTermOpen] = useState(false)
  const [scopeSearchOpen, setScopeSearchOpen] = useState(false)
  const [scopeQuery, setScopeQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [moves, setMoves] = useState([])
  const updateTimetable = useUpdateTimetable()
  const deleteTimetable = useDeleteTimetable()
  const [selected, setSelected] = useState(null)
  const [requestMode, setRequestMode] = useState('')
  const [creating, setCreating] = useState(false)
  const [dragFrom, setDragFrom] = useState(null)
  const dragRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const leaveAction = useRef(null)
  const termRef = useRef(null)
  const scopeSearchRef = useRef(null)
  const moreRef = useRef(null)

  const activeScope = !isAdmin
    ? (scope === 'class' ? 'class' : 'mine')
    : (scope === 'mine' ? 'class' : scope)
  const days = schoolWeekDays(weekStart, now)
  const breakLabel = weekBreakLabel(weekStart)
  const thisWeek = isSameSchoolWeek(weekStart, now)
  const source = timetable

  const accept = activeScope === 'class' && target
    ? (cell) => cell.class === target
    : activeScope === 'teacher' && target
      ? (cell) => cell.teacher === target
      : () => true
  const shown = {
    ...source,
    byDay: maskByDay(applyCellMoves(source.byDay, moves), source.periods, accept),
  }

  const classes = uniqueField(timetable.byDay, timetable.periods, 'class')
  const teachers = uniqueField(timetable.byDay, timetable.periods, 'teacher')
  const detailMode = activeScope === 'class' ? 'class' : activeScope === 'all' ? 'all' : 'teacher'
  const selectedCell = selected ? shown.byDay?.[selected.day]?.[selected.period] ?? null : null
  const selectedDate = days.find((day) => day.key === selected?.day)
  const hoverReason = dragFrom && hover
    ? dropRejection(shown.byDay, dragFrom, hover, days.find((day) => day.key === hover.day)?.holiday || '')
    : ''

  useEffect(() => {
    if (moves.length === 0) return undefined
    const onBefore = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [moves.length])

  useEffect(() => {
    if (!termOpen && !scopeSearchOpen && !moreOpen) return undefined
    const onPointer = (event) => {
      if (termRef.current && !termRef.current.contains(event.target)) setTermOpen(false)
      if (scopeSearchRef.current && !scopeSearchRef.current.contains(event.target)) setScopeSearchOpen(false)
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [termOpen, scopeSearchOpen, moreOpen])

  const requestLeave = (action) => {
    if (moves.length === 0) {
      action()
      return
    }
    leaveAction.current = action
    setConfirmLeave(true)
  }

  const goWeek = (delta) => {
    requestLeave(() => {
      setWeekStart((current) => shiftSchoolWeek(current, delta))
      setSelected(null)
    })
  }

  const openCreate = () => {
    requestLeave(() => navigate?.('schedule-create'))
  }

  const toggleEditing = () => {
    if (editing) {
      requestLeave(() => {
        setEditing(false)
        setSaveError('')
      })
      return
    }
    setEditing(true)
    setSaveError('')
  }

  const saveMoves = async () => {
    const moved = applyCellMoves(source.byDay, moves)
    const result = changedTimetablePatches(source.byDay, moved)
    if (result.error) {
      setSaveError(result.error)
      return
    }
    if (result.patches.length === 0) {
      setMoves([])
      setEditing(false)
      return
    }
    try {
      await updateTimetable.mutateAsync(result.patches)
      setMoves([])
      setEditing(false)
      setSaveError('')
    } catch (error) {
      setSaveError(getApiErrorMessage(error, '시간표를 저장하지 못했습니다.'))
    }
  }

  const handleDeleteCell = async () => {
    if (!selectedCell?.id) return
    try {
      await deleteTimetable.mutateAsync(selectedCell.id)
      setSelected(null)
      setRequestMode('')
      setCreating(false)
      setSaveError('')
    } catch (error) {
      setSaveError(getApiErrorMessage(error, '수업을 삭제하지 못했습니다.'))
    }
  }

  const emptyCopy = isAdmin
    ? '아직 등록된 시간표가 없습니다'
    : '시간표가 확정되면 알림으로 알려드립니다'

  const scopeOptions = isAdmin
    ? [
      { id: 'class', label: '학급별' },
      { id: 'teacher', label: '교사별' },
      { id: 'all', label: '전체' },
    ]
    : [{ id: 'mine', label: '내 시간표' }]

  const queryText = scopeQuery.trim()
  const classHits = classes
    .filter((item) => !queryText || item.includes(queryText))
    .map((item) => ({ id: `class:${item}`, kind: 'class', value: item, label: formatClassName(item) }))
  const teacherHits = teachers
    .filter((item) => !queryText || item.includes(queryText))
    .map((item) => ({ id: `teacher:${item}`, kind: 'teacher', value: item, label: item }))
  const searchHits = [...classHits, ...teacherHits]
  const targetChipLabel = target
    ? (activeScope === 'class' ? formatClassName(target) : target)
    : ''

  return (
    <div className={`tt-page${editing ? ' is-editing' : ''}`}>
      <h1 className="sr-only">시간표</h1>

      <div className="tt-head">
        <div className="tt-head-main">
          <div className="tt-week-heading">
            <div className="tt-term-title" ref={termRef}>
              <button
                type="button"
                className="tt-term-trigger"
                aria-expanded={termOpen}
                aria-haspopup="dialog"
                onClick={() => setTermOpen((open) => !open)}
              >
                <span>{academicYear}년 {semester}학기</span>
                <span aria-hidden="true">▾</span>
              </button>
              {termOpen && (
                <div className="dropdown-panel dropdown-panel-top tt-term-panel" role="dialog" aria-label="학년도 학기">
                  <label className="tt-term-field">
                    <span>학년도</span>
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={academicYear}
                      onChange={(event) => {
                        setAcademicYear(Number(event.target.value) || academicYear)
                        setUseTermFilter(true)
                      }}
                    />
                  </label>
                  <label className="tt-term-field">
                    <span>학기</span>
                    <select
                      value={semester}
                      onChange={(event) => {
                        setSemester(Number(event.target.value))
                        setUseTermFilter(true)
                      }}
                    >
                      <option value={1}>1학기</option>
                      <option value={2}>2학기</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="tt-term-apply"
                    onClick={() => {
                      setUseTermFilter(true)
                      setTermOpen(false)
                    }}
                  >
                    적용
                  </button>
                </div>
              )}
            </div>
            <div className="tt-week-row">
              <div className="tt-week-title">
                <span className="tt-week-month tt-week-long">{formatWeekMonthLabel(weekStart)}</span>
                <span className="tt-week-short">{formatWeekShort(weekStart)}</span>
              </div>
              <div className="tt-nav" role="group" aria-label="주 이동">
                <button type="button" className="tt-nav-arrow" aria-label="이전 주" onClick={() => goWeek(-1)}>‹</button>
                <button
                  type="button"
                  className="tt-nav-today"
                  disabled={thisWeek}
                  onClick={() => {
                    requestLeave(() => {
                      setWeekStart(startOfSchoolWeek(now))
                    })
                  }}
                >
                  오늘
                </button>
                <button type="button" className="tt-nav-arrow" aria-label="다음 주" onClick={() => goWeek(1)}>›</button>
              </div>
            </div>
            <p className="tt-week-caption">{formatWeekCaption(weekStart)}</p>
          </div>
        </div>

        {isAdmin && !editing && (
          <div className="tt-head-tools">
            {SHOW_EDIT && (
              <button type="button" className="tt-secondary" onClick={toggleEditing}>
                시간표 수정
              </button>
            )}
            <button type="button" className="tt-create" onClick={openCreate}>시간표 생성</button>
            <div className="tt-more" ref={moreRef}>
              <button type="button" className="tt-text tt-more-button" aria-label="시간표 메뉴" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>⋯</button>
              {moreOpen && (
                <div className="dropdown-panel dropdown-panel-top">
                  <button type="button" className="menu-item" onClick={() => { setMoreOpen(false); openCreate() }}>시간표 생성</button>
                  {SHOW_EDIT && (
                    <button type="button" className="menu-item" onClick={() => { setMoreOpen(false); toggleEditing() }}>시간표 수정</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="tt-scope-bar">
          <div className="tt-scope" role="group" aria-label="시간표 보기">
            {scopeOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={activeScope === item.id}
                onClick={() => {
                  setScope(item.id)
                  setTarget('')
                  setScopeSearchOpen(false)
                  setScopeQuery('')
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="tt-scope-search" ref={scopeSearchRef}>
            <div className="tt-scope-search-field">
              <input
                value={scopeQuery}
                placeholder="학급/교사 검색"
                aria-label="학급/교사 검색"
                onChange={(event) => setScopeQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    setScopeSearchOpen(true)
                  }
                }}
              />
              <button
                type="button"
                className="tt-scope-search-submit"
                aria-label="검색"
                onClick={() => setScopeSearchOpen(true)}
              >
                <SearchIcon />
              </button>
            </div>
            {target ? (
              <button
                type="button"
                className="tt-scope-chip"
                onClick={() => {
                  setTarget('')
                  setScopeQuery('')
                }}
              >
                {targetChipLabel}
                <span aria-hidden="true"> ×</span>
              </button>
            ) : null}
            {scopeSearchOpen && (
              <div className="dropdown-panel dropdown-panel-top tt-scope-panel" role="listbox" aria-label="검색 결과">
                {searchHits.length === 0 ? (
                  <p className="tt-picker-empty">목록이 없습니다</p>
                ) : searchHits.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    className="menu-item"
                    aria-selected={target === item.value && activeScope === item.kind}
                    onClick={() => {
                      setScope(item.kind)
                      setTarget(item.value)
                      setScopeSearchOpen(false)
                      setScopeQuery('')
                    }}
                  >
                    <span className="tt-scope-hit-kind">{item.kind === 'class' ? '학급' : '교사'}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {SHOW_EDIT && editing && (
        <div className="tt-edit-banner" role="status">
          <div className="tt-edit-banner-copy">
            <strong>시간표 수정 중</strong>
            <p>수업을 끌어 옮긴 뒤 아래 저장으로 반영합니다.</p>
          </div>
          <button type="button" className="tt-secondary" onClick={toggleEditing}>수정 취소</button>
        </div>
      )}

      {failed ? (
        <div className="home-load-error">
          <span className="home-error-mark" aria-hidden="true">!</span>
          <span>불러오지 못했어요</span>
          <button type="button" className="home-text-button home-accent" onClick={() => refetch()}>다시 시도</button>
        </div>
      ) : isLoading ? (
        <div className="tt-board tt-skeleton" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="home-skeleton" />
          ))}
        </div>
      ) : breakLabel ? (
        <div className="home-empty">
          이번 주는 수업이 없습니다({breakLabel})
          <button type="button" className="history-link" onClick={() => setWeekStart(nextOpenWeek(weekStart))}>다음 수업 주로 이동</button>
        </div>
      ) : (
        <>
          {timetable.weekClassCount === 0 && (
            <div className="tt-empty-note">
              <span>{emptyCopy}</span>
              {isAdmin && (
                <>
                  <span aria-hidden="true"> · </span>
                  <button type="button" className="history-link" onClick={openCreate}>시간표 생성</button>
                </>
              )}
            </div>
          )}

          {SHOW_EDIT && editing && hoverReason && <p className="tt-reject">{hoverReason}</p>}

          <WeeklyTimetableGrid
            timetable={shown}
            days={days}
            detailMode={detailMode}
            selectedKey={selected ? cellSlotKey(selected.day, selected.period) : ''}
            editing={SHOW_EDIT && editing}
            dragFrom={dragFrom}
            hoverKey={hover ? cellSlotKey(hover.day, hover.period) : ''}
            hoverReason={hoverReason}
            showFreeLabel={timetable.weekClassCount > 0}
            onSelect={(slot) => {
              setSelected(slot)
              setRequestMode('')
              setCreating(Boolean(SHOW_EDIT && editing && isAdmin && !shown.byDay?.[slot.day]?.[slot.period]))
            }}
            onDragStart={(slot) => {
              dragRef.current = slot
              setDragFrom(slot)
            }}
            onDragHover={setHover}
            onDrop={(slot) => {
              const from = dragRef.current
              if (!from) return
              const reason = dropRejection(
                shown.byDay,
                from,
                slot,
                days.find((day) => day.key === slot.day)?.holiday || '',
              )
              if (!reason && (from.day !== slot.day || from.period !== slot.period)) {
                setMoves((list) => [...list, { from, to: slot }])
              }
              dragRef.current = null
              setDragFrom(null)
              setHover(null)
            }}
            onDragEnd={() => {
              dragRef.current = null
              setDragFrom(null)
              setHover(null)
            }}
          />
        </>
      )}

      {query.error && failed ? <p className="sr-only">{String(query.error?.message || '')}</p> : null}

      {selected && (
        <>
          <button type="button" className="history-scrim" aria-label="상세 닫기" onClick={() => setSelected(null)} />
          <aside className="tt-detail" role="dialog" aria-modal="true" aria-label="수업 상세">
            <div className="tt-detail-head">
              <p className="tt-detail-kicker">
                {selectedDate ? `${selectedDate.date.getMonth() + 1}월 ${selectedDate.date.getDate()}일 (${selectedDate.key})` : ''}
                {` · ${selected.period}교시`}
                {periodRange(selectedCell, selected.period) ? ` · ${periodRange(selectedCell, selected.period)}` : ''}
              </p>
              <button type="button" className="panel-close" onClick={() => setSelected(null)}>닫기</button>
            </div>
            <h2>{selectedCell?.subject || (creating ? '수업 추가' : '공강')}</h2>
            {selectedCell ? (
              <dl className="tt-detail-list">
                <div><dt>학급</dt><dd>{formatClassName(selectedCell.class) || '없음'}</dd></div>
                <div><dt>교사</dt><dd>{selectedCell.teacher || '없음'}</dd></div>
              </dl>
            ) : null}
            {creating && selected ? (
              <CreateTimetableCellForm
                dayKey={selected.day}
                period={selected.period}
                academicYear={useTermFilter ? academicYear : selectedCell?.academicYear ?? academicYear}
                semester={useTermFilter ? semester : selectedCell?.semester ?? semester}
                onCreated={() => {
                  setSelected(null)
                  setCreating(false)
                }}
                onCancel={() => {
                  setSelected(null)
                  setCreating(false)
                }}
              />
            ) : selectedCell && requestMode === 'substitute' ? (
              <CreateSubstituteForm
                timetableId={selectedCell.id}
                defaultDate={selectedDate ? toISODate(selectedDate.date) : toISODate()}
                periodLabel={`${selected.period}교시`}
              />
            ) : selectedCell && requestMode === 'swap' ? (
              <CreateShiftSwapForm />
            ) : selectedCell ? (
              <div className="tt-actions">
                <button type="button" className="tt-secondary" onClick={() => setRequestMode('substitute')}>대타 요청</button>
                <button type="button" className="tt-secondary" onClick={() => setRequestMode('swap')}>교환 요청</button>
                {isAdmin && editing ? (
                  <button
                    type="button"
                    className="tt-secondary"
                    disabled={deleteTimetable.isPending}
                    onClick={handleDeleteCell}
                  >
                    {deleteTimetable.isPending ? '삭제 중...' : '삭제'}
                  </button>
                ) : null}
              </div>
            ) : null}
            {saveError && selected ? <p className="tt-reject">{saveError}</p> : null}
          </aside>
        </>
      )}

      {editing && moves.length > 0 && (
        <div className="tt-savebar">
          <span>{saveError || `${moves.length}칸을 옮겼습니다`}</span>
          <div>
            <button type="button" className="tt-secondary" onClick={() => { setMoves([]); setSaveError('') }}>되돌리기</button>
            <button type="button" className="tt-create" disabled={updateTimetable.isPending} onClick={saveMoves}>
              {updateTimetable.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div className="tt-modal" role="dialog" aria-modal="true" aria-label="저장하지 않은 변경">
          <p>변경을 저장하지 않고 나갈까요</p>
          <div>
            <button type="button" className="tt-secondary" onClick={() => setConfirmLeave(false)}>머무르기</button>
            <button
              type="button"
              className="tt-create"
              onClick={() => {
                const action = leaveAction.current
                leaveAction.current = null
                setConfirmLeave(false)
                setMoves([])
                action?.()
              }}
            >
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
