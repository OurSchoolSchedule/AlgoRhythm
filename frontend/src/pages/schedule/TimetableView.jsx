import { DetailHeading } from '@/components/ui/DetailPage'
import { Dialog } from '@/pages/home/HomePanels'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAccessToken } from '@/api'
import LoadError from '@/components/LoadError.jsx'
import { useHomeSession } from '@/hooks/useHomeSession'
import { schoolDate } from '@/utils/homeContract'
import { useTimetableDate } from '@/hooks/useTimetableDate'
import { useOperatingWeek } from '@/hooks/useOperatingWeek'
import { operatingReason } from '@/api/operatingWeek'
import { useTermChoice } from '@/hooks/useTermChoice'
import PublishedCoverForm from '@/components/schedule/PublishedCoverForm'
import CreateSubstituteForm from '@/components/schedule/CreateSubstituteForm.jsx'
import CreateTimetableCellForm from '@/components/schedule/CreateTimetableCellForm.jsx'
import WeeklyTimetableGrid from '@/components/schedule/WeeklyTimetableGrid.jsx'
import { TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'
import { useDeleteTimetable, useSchoolTimetable, useUpdateTimetable } from '@/hooks'
import { formatClassName, formatClock } from '@/utils/homeFocus.js'
import { cellFromLessons, lessonsOf } from '@/utils/schoolTimetable.js'
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
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'
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
      const lessons = lessonsOf(byDay?.[day]?.[period]).filter((lesson) => accept(lesson))
      next[day][period] = cellFromLessons(lessons)
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
      for (const lesson of lessonsOf(byDay?.[day]?.[period])) {
        const value = lesson?.[field]
        if (value) values.add(value)
      }
    }
  }
  return [...values].sort((left, right) => left.localeCompare(right, 'ko'))
}

function periodRange(cell, slot) {
  const start = formatClock(cell?.startTime || slot?.start)
  const end = formatClock(cell?.endTime || slot?.end)
  if (start && end) return `${start}–${end}`
  return start
}

export default function TimetableView(props) {
  const session = useHomeSession()
  const state = useTermChoice(session)
  if (session.access.queries.datedLessons && !state.list.isSuccess) {
    return state.list.isError
      ? <LoadError onRetry={() => state.list.refetch()} />
      : <p role="status">학기 조회 중</p>
  }
  return <TimetableBoard {...props} session={session} state={state} key={JSON.stringify([session.scope, state.term?.termId])} />
}

function TimetableBoard({ navigate, userRole = 'worker', session, state }) {
  const { access } = session
  const { terms, term, choice, saveChoice } = state
  const isAdmin = userRole === 'admin'
  const now = useMemo(() => new Date(), [])
  const [legacyYear, setAcademicYear] = useState(choice.academicYear)
  const [legacySemester, setSemester] = useState(choice.semester)
  const academicYear = term?.academicYear ?? legacyYear
  const semester = term?.semester ?? legacySemester
  const [draftTermId, setDraftTermId] = useState(term?.termId)
  const { date, setDate } = useTimetableDate(session, term)
  const weekStart = startOfSchoolWeek(new Date(date + 'T12:00:00'))
  const weekOf = toISODate(weekStart)
  const operating = useOperatingWeek(session, term, weekOf)
  const query = useSchoolTimetable({
    referenceDate: now,
    weekOf,
    academicYear,
    semester,
    termId: term?.termId,
  })
  const timetable = query.timetable
  const isLoading = query.isLoading
  const previewOnly = !getAccessToken()
  const failed = query.isError && !previewOnly
  const refetch = query.refetch

  const [scope, setScope] = useState(isAdmin ? 'class' : 'mine')
  const [target, setTarget] = useState('')
  const [targetClassId, setTargetClassId] = useState(null)
  const [termOpen, setTermOpen] = useState(false)
  const [kindOpen, setKindOpen] = useState(false)
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
  const [activeLesson, setActiveLesson] = useState(null)
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
  const visibleTerms = term ? [term] : []
  const days = schoolWeekDays(weekStart, now, visibleTerms)
  const breakLabel = weekBreakLabel(weekStart, visibleTerms)
  const nextOpen = breakLabel ? nextOpenWeek(weekStart, visibleTerms) : null
  const today = schoolDate(now)
  const thisWeek = isSameSchoolWeek(weekStart, new Date(today + 'T12:00:00'))
  const prevWeekOutside = term && weekOf <= term.startDate
  const nextWeekOutside = term && toISODate(shiftSchoolWeek(weekStart, 1)) > term.endDate
  function closedReason(day, period) {
    if (day?.outsideTerm) return '학기 기간 밖'
    if (day?.excluded) return '수업 제외일'
    const operatingDay = operating.data?.days.find((value) => value.date === day?.iso)
    const classId = activeScope === 'class' && target ? targetClassId : null
    const reason = operatingReason(operatingDay, classId, period)
    if (reason) return reason
    if (term && !operatingDay) return operating.isError ? '운영 교시 확인 필요' : '운영 교시 조회 중'
    return ''
  }
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
  const detailMode = !isAdmin
    ? (activeScope === 'class' ? 'class' : 'teacher')
    : target
      ? (scope === 'teacher' ? 'teacher' : 'class')
      : 'all'
  const selectedCell = selected ? shown.byDay?.[selected.day]?.[selected.period] ?? null : null
  const selectedLessons = lessonsOf(selectedCell)
  const selectedCrowded = selectedLessons.length > 1
  const selectedDate = days.find((day) => day.key === selected?.day)
  const selectedClosed = selected && selectedDate && closedReason(selectedDate, selected.period)
  const selectedClock = selected ? periodRange(selectedCell, timetable.periodSlots.find((slot) => slot.period === selected.period)) : ''
  const actionLesson = selectedCrowded ? activeLesson : selectedCell
  const actionDateIso = selectedDate ? toISODate(selectedDate.date) : toISODate()
  const actionPeriodLabel = selected ? `${selected.period}교시` : ''
  const clearDetail = () => {
    setSelected(null)
    setRequestMode('')
    setActiveLesson(null)
    setCreating(false)
  }

  const startLessonRequest = (lesson, mode) => {
    setActiveLesson(lesson)
    setRequestMode(mode)
  }
  const hoverReason = dragFrom && hover
    ? dropRejection(shown.byDay, dragFrom, hover, closedReason(days.find((day) => day.key === hover.day), hover.period))
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
    if (!termOpen && !kindOpen && !scopeSearchOpen && !moreOpen) return undefined
    const onPointer = (event) => {
      if (termRef.current && !termRef.current.contains(event.target)) setTermOpen(false)
      if (scopeSearchRef.current && !scopeSearchRef.current.contains(event.target)) {
        setKindOpen(false)
        setScopeSearchOpen(false)
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [termOpen, kindOpen, scopeSearchOpen, moreOpen])

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
      setDate(toISODate(shiftSchoolWeek(weekStart, delta)))
      clearDetail()
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
      clearDetail()
      setSaveError('')
    } catch (error) {
      setSaveError(getApiErrorMessage(error, '수업을 삭제하지 못했습니다.'))
    }
  }

  const emptyCopy = '선택한 주에 조회된 수업이 없습니다.'

  const queryText = scopeQuery.trim()
  const classHits = classes
    .filter((item) => !queryText || item.includes(queryText))
    .map((item) => ({ id: `class:${item}`, kind: 'class', value: item, label: formatClassName(item) }))
  const teacherHits = teachers
    .filter((item) => !queryText || item.includes(queryText))
    .map((item) => ({ id: `teacher:${item}`, kind: 'teacher', value: item, label: item }))
  const searchHits = scope === 'teacher' ? teacherHits : classHits
  const searchKindLabel = scope === 'teacher' ? '교사별' : '학급별'
  const targetChipLabel = target
    ? (activeScope === 'class' ? formatClassName(target) : target)
    : ''

  return (
    <div className={`detail-page tt-page${editing ? ' is-editing' : ''}`}>
      <DetailHeading title="시간표" />
      <section className="detail-card timetable-card" aria-label="주간 시간표">

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
                    {term ? (
                      <label className="tt-term-field">
                        <span>등록된 학기</span>
                        <select aria-label="등록된 학기" value={draftTermId} onChange={(e) => setDraftTermId(Number(e.target.value))}>
                          {terms.map((t) => <option key={t.termId} value={t.termId}>{t.academicYear}학년도 {t.semester}학기</option>)}
                        </select>
                      </label>
                    ) : (<>
                      <label className="tt-term-field">
                        <span>학년도</span>
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={academicYear}
                          onChange={(event) => {
                            setAcademicYear(Number(event.target.value) || academicYear)
                          }}
                        />
                      </label>
                      <label className="tt-term-field">
                        <span>학기</span>
                        <select
                          value={semester}
                          onChange={(event) => {
                            setSemester(Number(event.target.value))
                          }}
                        >
                          <option value={1}>1학기</option>
                          <option value={2}>2학기</option>
                        </select>
                      </label>
                    </>)}
                    <button
                      type="button"
                      className="tt-term-apply"
                      onClick={() => {
                        const selectedTerm = terms.find((t) => t.termId === draftTermId)
                        requestLeave(() => {
                          if (selectedTerm) saveChoice(selectedTerm)
                          setTermOpen(false)
                        })
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
                  <button type="button" className="tt-nav-arrow" aria-label="이전 주" disabled={prevWeekOutside} onClick={() => goWeek(-1)}>‹</button>
                  <button
                    type="button"
                    className="tt-nav-today"
                    disabled={thisWeek || (term && (today < term.startDate || today > term.endDate))}
                    onClick={() => {
                      requestLeave(() => {
                        setDate()
                        clearDetail()
                      })
                    }}
                  >
                    오늘
                  </button>
                  <button type="button" className="tt-nav-arrow" aria-label="다음 주" disabled={nextWeekOutside} onClick={() => goWeek(1)}>›</button>
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
            <div className="tt-scope-search" ref={scopeSearchRef}>
              <div className="tt-scope-search-field">
                <div className="tt-scope-kind">
                  <button
                    type="button"
                    className="tt-scope-kind-trigger"
                    aria-expanded={kindOpen}
                    aria-haspopup="listbox"
                    aria-label="검색 조건"
                    onClick={() => {
                      setKindOpen((open) => !open)
                      setScopeSearchOpen(false)
                    }}
                  >
                    <span>{searchKindLabel}</span>
                    <span aria-hidden="true">▾</span>
                  </button>
                  {kindOpen && (
                    <div className="dropdown-panel dropdown-panel-top tt-scope-kind-panel" role="listbox" aria-label="검색 조건">
                      {[
                        { id: 'class', label: '학급별' },
                        { id: 'teacher', label: '교사별' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          className="menu-item"
                          aria-selected={scope === item.id}
                          onClick={() => {
                            setScope(item.id)
                            setTarget('')
                            setScopeQuery('')
                            setKindOpen(false)
                            setScopeSearchOpen(false)
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="tt-scope-kind-rule" aria-hidden="true" />
                <input
                  value={scopeQuery}
                  placeholder={scope === 'teacher' ? '교사 검색' : '학급 검색'}
                  aria-label={scope === 'teacher' ? '교사 검색' : '학급 검색'}
                  onChange={(event) => setScopeQuery(event.target.value)}
                  onFocus={() => setKindOpen(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setKindOpen(false)
                      setScopeSearchOpen(true)
                    }
                  }}
                />
                <button
                  type="button"
                  className="tt-scope-search-submit"
                  aria-label="검색"
                  onClick={() => {
                    setKindOpen(false)
                    setScopeSearchOpen(true)
                  }}
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
                        const row = item.kind === 'class' && query.rows.find((r) => `${r.grade}-${r.classNumber}` === item.value)
                        setTargetClassId(row?.schoolClassId ?? null)
                        setScopeSearchOpen(false)
                        setScopeQuery('')
                      }}
                    >
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
          <LoadError onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="tt-board tt-skeleton" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="home-skeleton" />
            ))}
          </div>
        ) : breakLabel ? (
          <div className="home-empty">
            이번 주는 수업이 없습니다({breakLabel})
            {nextOpen && <button type="button" className="history-link" onClick={() => setDate(toISODate(nextOpen))}>다음 수업 주로 이동</button>}
          </div>
        ) : (
          <>
            {timetable.weekClassCount === 0 && (
              <div className="tt-empty-note">
                <span>{emptyCopy}</span>

              </div>
            )}

            {term && operating.isError && <p role="alert">게시된 운영 교시를 불러오지 못했습니다. <button type="button" onClick={() => operating.refetch()}>다시 조회</button></p>}
            {SHOW_EDIT && editing && hoverReason && <p className="tt-reject">{hoverReason}</p>}

            <WeeklyTimetableGrid
              timetable={shown}
              days={days}
              closedReason={closedReason}
              detailMode={detailMode}
              selectedKey={selected ? cellSlotKey(selected.day, selected.period) : ''}
              editing={SHOW_EDIT && editing}
              dragFrom={dragFrom}
              hoverKey={hover ? cellSlotKey(hover.day, hover.period) : ''}
              hoverReason={hoverReason}
              showFreeLabel={timetable.weekClassCount > 0 || operating.data?.days.some((day) => day.versionId != null)}
              onSelect={(slot) => {
                setSelected(slot)
                setRequestMode('')
                setActiveLesson(null)
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
                  closedReason(days.find((day) => day.key === slot.day), slot.period),
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

      </section>

      {query.error && failed ? <p className="sr-only">{String(query.error?.message || '')}</p> : null}

      {selected && selectedDate && !selectedDate.excluded && !selectedDate.outsideTerm &&
        selectedClosed !== '수업 제외일' && selectedClosed !== '학기 기간 밖' && (selectedCell || !selectedClosed) && (
        <Dialog title="수업 상세" onClose={clearDetail}>
          <div className="detail-lesson">
            <p className="tt-detail-kicker">
              {selectedDate ? `${selectedDate.date.getMonth() + 1}월 ${selectedDate.date.getDate()}일 (${selectedDate.key})` : ''}
              {` · ${selected.period}교시`}
              {selectedClock ? ` · ${selectedClock}` : ''}
            </p>
            <h3>
              {selectedCrowded
                ? `${selectedLessons.length}학급`
                : (selectedCell?.subject || (creating ? '수업 추가' : '공강'))}
            </h3>
            {selectedCrowded ? (
              <ul className="tt-lesson-list">
                {selectedLessons.map((lesson) => {
                  const isActive = activeLesson && (lesson.id != null ? activeLesson.id === lesson.id : activeLesson.weeklyLessonId === lesson.weeklyLessonId)
                  return (
                    <li
                      key={lesson.id ?? `weekly-${lesson.weeklyLessonId ?? lesson.class}`}
                      className={isActive ? 'is-active' : undefined}
                    >
                      <span className="tt-lesson-main">
                        <span className="tt-lesson-class">{formatClassName(lesson.class) || '학급 없음'}</span>
                        <span className="tt-lesson-subject">{lesson.subject || '수업'}</span>
                      </span>
                      <div className="tt-lesson-aside">
                        <span className="tt-lesson-teacher">{lesson.teacher || '교사 없음'}</span>
                        <div className="todo-inline-actions">
                          <button
                            type="button"
                            className="is-primary"
                            disabled={!access.actions.approve || (lesson.id == null && lesson.weeklyLessonId == null)}
                            onClick={() => startLessonRequest(lesson, 'substitute')}
                          >
                            공개 보결 모집
                          </button>
                          <button
                            type="button"
                            className="is-secondary"
                            disabled={!access.queries.datedLessons}
                            onClick={() => navigate('lesson-changes', actionDateIso)}
                          >
                            날짜 수업 변경
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : selectedCell ? (
              <dl className="tt-detail-list">
                <div><dt>학급</dt><dd>{formatClassName(selectedCell.class) || '없음'}</dd></div>
                <div><dt>교사</dt><dd>{selectedCell.teacher || '없음'}</dd></div>
              </dl>
            ) : null}
            {creating && selected ? (
              <CreateTimetableCellForm
                dayKey={selected.day}
                period={selected.period}
                academicYear={academicYear}
                semester={semester}
                onCreated={clearDetail}
                onCancel={clearDetail}
              />
            ) : access.actions.approve && actionLesson?.weeklyLessonId != null && requestMode === 'substitute' ? (
              <PublishedCoverForm key={actionDateIso + '/' + actionLesson.weeklyLessonId}
                termId={terms.find(t => t.academicYear === actionLesson.academicYear && t.semester === actionLesson.semester)?.termId}
                lesson={actionLesson} date={actionDateIso} periodLabel={actionPeriodLabel} />
            ) : access.actions.approve && actionLesson?.id != null && requestMode === 'substitute' ? (
              <CreateSubstituteForm
                key={`sub-${actionLesson.id}`}
                timetableId={actionLesson.id}
                defaultDate={actionDateIso}
                periodLabel={actionPeriodLabel}
              />
            ) : selectedCell && !selectedCrowded ? (
              <div className="tt-actions">
                <button
                  type="button"
                  className="tt-secondary"
                  disabled={!access.actions.approve || (selectedCell.id == null && selectedCell.weeklyLessonId == null)}
                  onClick={() => startLessonRequest(selectedCell, 'substitute')}
                >
                  공개 보결 모집
                </button>
                <button
                  type="button"
                  className="tt-secondary"
                  disabled={!access.queries.datedLessons}
                  onClick={() => navigate('lesson-changes', actionDateIso)}
                >
                  날짜 수업 변경
                </button>
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
          </div>
        </Dialog>
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
        <Dialog title="저장하지 않은 변경" onClose={() => setConfirmLeave(false)}>
          <p>변경을 저장하지 않고 나갈까요?</p>
          <div className="detail-actions">
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
        </Dialog>
      )}
    </div>
  )
}
