import { useEffect, useMemo, useRef, useState } from 'react'
import { getAccessToken } from '@/api'
import CreateShiftSwapForm from '@/components/schedule/CreateShiftSwapForm.jsx'
import CreateSubstituteForm from '@/components/schedule/CreateSubstituteForm.jsx'
import WeeklyTimetableGrid from '@/components/schedule/WeeklyTimetableGrid.jsx'
import { SCHOOL_PERIOD_SLOTS, TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'
import { useSchoolTimetable, useUpdateTimetable } from '@/hooks'
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
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'
import {
  applyCellMoves,
  cellSlotKey,
  changedTimetablePatches,
  dropRejection,
} from '@/utils/timetableBoard.js'

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
  const query = useSchoolTimetable(now)
  const timetable = query.timetable
  const isLoading = query.isLoading
  const previewOnly = !getAccessToken()
  const failed = query.isError && !previewOnly
  const refetch = query.refetch

  const [weekStart, setWeekStart] = useState(() => startOfSchoolWeek(new Date()))
  const [scope, setScope] = useState(isAdmin ? 'class' : 'mine')
  const [target, setTarget] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [moves, setMoves] = useState([])
  const updateTimetable = useUpdateTimetable()
  const [selected, setSelected] = useState(null)
  const [requestMode, setRequestMode] = useState('')
  const [dragFrom, setDragFrom] = useState(null)
  const dragRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const leaveAction = useRef(null)
  const pickerRef = useRef(null)
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
  const options = activeScope === 'teacher' ? teachers : classes
  const filteredOptions = options.filter((item) => item.includes(pickerQuery.trim()))
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
    if (!pickerOpen && !moreOpen) return undefined
    const onPointer = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setPickerOpen(false)
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [pickerOpen, moreOpen])

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

  const targetLabel = activeScope === 'mine'
    ? '내 시간표'
    : activeScope === 'all'
      ? '전체'
      : target || (activeScope === 'teacher' ? '교사별' : '학급별')

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

  const emptyCopy = isAdmin
    ? '아직 등록된 시간표가 없습니다'
    : '시간표가 확정되면 알림으로 알려드립니다'

  return (
    <div className="tt-page">
      <h1 className="sr-only">시간표</h1>

      <div className="tt-head">
        <div className="tt-head-main">
          <div className="tt-week-heading">
            <div className="tt-week-title">
              <span className="tt-week-month tt-week-long">{formatWeekMonthLabel(weekStart)}</span>
              <span className="tt-week-short">{formatWeekShort(weekStart)}</span>
            </div>
            <p className="tt-week-caption">{formatWeekCaption(weekStart)}</p>
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

        {isAdmin && (
          <div className="tt-head-tools">
            <div className="tt-picker" ref={pickerRef}>
              <button
                type="button"
                className="tt-text"
                aria-expanded={pickerOpen}
                aria-haspopup="listbox"
                onClick={() => {
                  setPickerOpen((open) => !open)
                  setPickerQuery('')
                }}
              >
                {targetLabel} ▾
              </button>
              {pickerOpen && (
                <div className="dropdown-panel dropdown-panel-top tt-picker-panel" role="listbox" aria-label="시간표 대상">
                  <button type="button" role="option" className="menu-item" aria-selected={activeScope === 'class'} onClick={() => { setScope('class'); setTarget('') }}>학급별</button>
                  <button type="button" role="option" className="menu-item" aria-selected={activeScope === 'teacher'} onClick={() => { setScope('teacher'); setTarget('') }}>교사별</button>
                  <button type="button" role="option" className="menu-item" aria-selected={activeScope === 'all'} onClick={() => { setScope('all'); setTarget(''); setPickerOpen(false) }}>전체</button>
                  {activeScope !== 'all' && (
                    <>
                      <input
                        className="tt-picker-search"
                        value={pickerQuery}
                        placeholder={activeScope === 'teacher' ? '교사 검색' : '학급 검색'}
                        onChange={(event) => setPickerQuery(event.target.value)}
                      />
                      {filteredOptions.length === 0 ? (
                        <p className="tt-picker-empty">목록이 없습니다</p>
                      ) : filteredOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="option"
                          className="menu-item"
                          aria-selected={target === item}
                          onClick={() => { setTarget(item); setPickerOpen(false) }}
                        >
                          {activeScope === 'class' ? formatClassName(item) : item}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="tt-text"
              aria-pressed={editing}
              onClick={toggleEditing}
            >
              수정
            </button>
            <button type="button" className="tt-create" onClick={openCreate}>시간표 생성</button>

            <div className="tt-more" ref={moreRef}>
              <button type="button" className="tt-text tt-more-button" aria-label="시간표 메뉴" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>⋯</button>
              {moreOpen && (
                <div className="dropdown-panel dropdown-panel-top">
                  <button type="button" className="menu-item" onClick={() => { setMoreOpen(false); openCreate() }}>시간표 생성</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
            <div className="tt-note tt-note-plain">
              {emptyCopy}
            </div>
          )}

          {editing && hoverReason && <p className="tt-reject">{hoverReason}</p>}

          <WeeklyTimetableGrid
            timetable={shown}
            days={days}
            detailMode={detailMode}
            selectedKey={selected ? cellSlotKey(selected.day, selected.period) : ''}
            editing={editing}
            dragFrom={dragFrom}
            hoverKey={hover ? cellSlotKey(hover.day, hover.period) : ''}
            hoverReason={hoverReason}
            onSelect={(slot) => {
              setSelected(slot)
              setRequestMode('')
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
            <h2>{selectedCell?.subject || '공강'}</h2>
            {selectedCell ? (
              <dl className="tt-detail-list">
                <div><dt>학급</dt><dd>{formatClassName(selectedCell.class) || '없음'}</dd></div>
                <div><dt>교사</dt><dd>{selectedCell.teacher || '없음'}</dd></div>
              </dl>
            ) : null}
            {selectedCell && requestMode === 'substitute' ? (
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
              </div>
            ) : null}
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
