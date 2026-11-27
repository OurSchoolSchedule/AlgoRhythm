import { useState } from 'react'
import mochi from '@/assets/home-mochi.webp?no-inline'
import { toISODate } from '@/utils'
import { startOfSchoolWeek, shiftSchoolWeek, holidayOn, weekBreakLabel, nextOpenWeek } from '@/utils/schoolWeek'
import { firstSchoolDate, isInTerm } from '@/hooks/useTimetableDate'
import { TargetPicker, ViewSwitch } from './TimetableFilters'
import { resolveSubjectColor } from '@/utils/subjectColor'
import SelectedLesson from './SelectedLesson'
import { Icon } from './HomePanels'

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const dayNames = ['월', '화', '수', '목', '금', '토', '일']
const localDay = (iso) => new Date(iso + 'T12:00:00')
const shortDate = (date) => `${date.getMonth() + 1}. ${date.getDate()}.`
const roomName = (room) => `${room.grade}학년 ${room.classNumber}반`

function ReadMessage({ query, label, retry }) {
  const messages = {
    loading: `${label}를 불러오는 중입니다.`,
    forbidden: `${label} 조회 권한이 없습니다.`,
    disabled: `${label} 조회 조건을 확인하고 있습니다.`,
    error: `${label} 조회에 실패했습니다.`,
  }
  return (
    <p className="desk-status" role="status">
      {messages[query.state]}
      {query.state === 'error' && retry && (
        <button className="desk-text-button" onClick={() => retry()}>
          다시 시도
        </button>
      )}
    </p>
  )
}

function WeekTable({ home, term, roomId, onRequest, daysOfWeek, rows, selected, onPick }) {
  const periods = [
    ...new Set([
      ...(home.periods.data ?? []).map((p) => p.periodNumber),
      ...rows.map((r) => r.periodNumber),
    ]),
  ].sort((a, b) => a - b)
  const slots = new Map()
  for (const row of rows) {
    const key = `${row.dayOfWeek}/${row.periodNumber}`
    if (!slots.has(key)) slots.set(key, [])
    slots.get(key).push(row)
  }
  const actualPeriods = new Set(
    (home.dated.data ?? [])
      .filter((row) => !row.actual.cancelled && (!roomId || row.classId === roomId))
      .map((row) => row.actual.periodNumber),
  )
  const selectedRows = selected ? (slots.get(`${selected.day}/${selected.period}`) ?? []) : []
  return (
    <div className={selected ? 'desk-selection-layout' : undefined}>
      <div className="desk-table-scroll">
        <table className="desk-week">
          <caption className="desk-sr">{term ? '게시된 주간 시간표' : '주간 기본 시간표'}</caption>
          <thead>
            <tr>
              <th scope="col">교시</th>
              {daysOfWeek.map((d) => (
                <th
                  scope="col"
                  key={d.key}
                  data-today={d.iso === home.today}
                  aria-current={d.iso === home.today ? 'date' : undefined}
                >
                  {d.name}{' '}
                  <small>
                    {d.date.getMonth() + 1}/{d.date.getDate()}
                  </small>
                  {d.note && <small className="desk-day-status">{d.note}</small>}
                  {d.iso === home.today && <span className="desk-today-label">오늘</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <th scope="row">
                  {period}
                  <small>교시</small>
                  {home.periods.data
                    ?.find((p) => p.periodNumber === period)
                    ?.startTime?.slice(0, 5)}
                </th>
                {daysOfWeek.map((d) => {
                  const lessons = slots.get(`${d.key}/${period}`) ?? []
                  const first = lessons[0]
                  const actualOnly = !first && d.iso === home.date && actualPeriods.has(period)
                  const outsideHours = d.periods
                    ? !d.periods.includes(period)
                    : d.limit != null && period > d.limit
                  const closed = d.status || (outsideHours ? '미운영 교시' : '')
                  const emptyLabel = closed || (actualOnly ? '날짜 수업 있음' : '수업 없음')
                  return (
                    <td key={d.key} data-today={d.iso === home.today}>
                      <button
                        className="desk-cell"
                        type="button"
                        aria-label={`${d.name}요일 ${period}교시 · ${first?.subjectName ?? (first ? '과목 미확인' : emptyLabel)}${lessons.length > 1 ? ' 외 ' + (lessons.length - 1) + '건' : ''}`}
                        disabled={Boolean(closed)}
                        aria-pressed={selected?.iso === d.iso && selected.period === period}
                        onClick={() => onPick({ day: d.key, iso: d.iso, period })}
                      >
                        {first ? (
                          <>
                            <span
                              className="desk-subject"
                              style={{ borderColor: resolveSubjectColor(first).dot }}
                            >
                              {first.subjectName || '과목 미확인'}
                            </span>
                            <small>
                              {lessons.length > 1
                                ? `외 ${lessons.length - 1}건`
                                : home.selection.view === 'mine' && first.grade && first.classNumber
                                  ? roomName(first)
                                  : first.teacherName || '담당 미확인'}
                            </small>
                          </>
                        ) : (
                          <span className="desk-dash">
                            {closed === '미운영 교시' ? '미운영' : actualOnly ? emptyLabel : '—'}
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <SelectedLesson
          key={selected.iso + '/' + selected.period}
          cell={selected}
          home={home}
          term={term}
          roomId={roomId}
          weeklyRows={selectedRows}
          onRequest={onRequest}
        />
      )}
    </div>
  )
}

function DatedLessons({ home, roomId, term, termStatus, onRequest }) {
  const q = home.dated
  const day = home.calendarDays?.find((d) => d.date === home.date)
  const rows = (q.data ?? [])
    .filter((r) => !roomId || r.classId === roomId)
    .sort(
      (a, b) =>
        (a.actual.periodNumber ?? Infinity) - (b.actual.periodNumber ?? Infinity) ||
        a.classId - b.classId,
    )
  const [all, setAll] = useState(false)
  return (
    <section className="desk-dated" aria-label="날짜별 실제 수업">
      <header>
        <h3>날짜별 실제 수업</h3>
        <span>{shortDate(localDay(home.date))}</span>
      </header>
      {!home.access.queries.datedLessons ? (
        <p>날짜 수업 조회 권한이 없습니다.</p>
      ) : !term ? (
        termStatus
      ) : q.state === 'disabled' &&
        ['error', 'forbidden', 'unconfirmed', 'empty'].includes(home.profile.schoolUserId.state) ? (
        <p>학교 명부에서 담당 교사를 확인할 수 없어 날짜 수업을 조회할 수 없습니다.</p>
      ) : term.excludedDates?.includes(home.date) || day?.excluded ? (
        <p>학기에 설정한 정규 수업 제외일입니다.</p>
      ) : day && !day.published ? (
        <p>이 날짜에 적용되는 게시 시간표가 없습니다.</p>
      ) : !['empty', 'ready'].includes(q.state) ? (
        <ReadMessage query={q} label="날짜 수업" retry={home.retryDated} />
      ) : !rows.length ? (
        <p>이 날짜에 조회된 수업이 없습니다.</p>
      ) : (
        <>
          <ul>
            {(all ? rows : rows.slice(0, 4)).map((row) => {
              const room = home.classes.data?.find((c) => c.id === row.classId)
              return (
                <li key={row.lessonId}>
                  <span>
                    {row.actual.periodNumber
                      ? row.actual.periodNumber + '교시'
                      : '교시 ID ' + row.actual.periodId}
                  </span>
                  <strong>
                    {home.subjects.data?.find((s) => s.id === row.subjectId)?.name ??
                      '과목 #' + row.subjectId}
                  </strong>
                  <small>
                    {room ? roomName(room) : '학급 #' + row.classId} ·{' '}
                    {row.actual.teacherName ?? '교사 #' + row.actual.teacherId}
                  </small>
                  {row.actual.cancelled && <span>휴강</span>}
                  {!row.actual.cancelled &&
                    ['SUBSTITUTE', 'SWAP']
                      .filter((kind) =>
                        kind === 'SWAP'
                          ? home.access.actions.requestSwap &&
                            row.actual.teacherId === home.profile.schoolUserId.value
                          : home.access.actions.requestSubstitute &&
                            (!home.access.actions.requestSwap ||
                              row.actual.teacherId === home.profile.schoolUserId.value),
                      )
                      .map((kind) => (
                        <button
                          key={kind}
                          className="desk-text-button"
                          disabled={!!q.refreshError}
                          onClick={() =>
                            onRequest({
                              schoolId: term.schoolId,
                              termId: term.termId,
                              date: row.date,
                              datedLessonId: row.lessonId,
                              rev: row.rev,
                              teacherId: row.actual.teacherId,
                              kind,
                            })
                          }
                        >
                          {kind === 'SUBSTITUTE' ? '보결 요청' : '교환 요청'}
                        </button>
                      ))}
                  {row.actual.teacherId !== row.planned.teacherId && (
                    <span className="desk-tag">담당 변경</span>
                  )}
                </li>
              )
            })}
          </ul>
          {rows.length > 4 && (
            <button className="desk-text-button" onClick={() => setAll(!all)}>
              {all ? '접기' : `전체 ${rows.length}건 보기`}
            </button>
          )}
        </>
      )}
      {q.refreshing && <small role="status">날짜 수업 갱신 중</small>}
      {q.refreshError && <small>날짜 수업을 갱신하지 못했습니다.</small>}
    </section>
  )
}

function selectionMessage(home, term) {
  const { view } = home.selection
  if (!home.inRange)
    return `선택한 날짜는 업무학기 기간(${term.startDate} ~ ${term.endDate}) 밖입니다.`
  if (view === 'homeroom' && !home.homeroom) {
    const state = home.profile.homerooms.state
    if (state === 'empty') return '배정된 담임 학급이 없습니다.'
    if (state === 'pending') return '담임 학급을 확인하고 있습니다.'
    if (state === 'forbidden') return '담임 정보 조회 권한이 없습니다.'
    return '담임 배정 정보를 확인할 수 없습니다.'
  }
  if (view === 'class' && !term)
    return '학급의 게시 시간표를 조회하려면 학교에 등록된 업무학기가 필요합니다.'
  if (view === 'class' && !home.room) {
    if (home.classes.state === 'loading') return '학급 목록을 불러오는 중입니다.'
    if (home.classes.state === 'forbidden') return '학급 조회 권한이 없습니다.'
    if (home.classes.state === 'error') return '학급 목록을 불러오지 못했습니다.'
    if (!home.classes.data?.length) return '등록된 학급이 없습니다.'
    return '조회할 학년과 학급을 선택하세요.'
  }
  if (view === 'teacher' && !home.teacher) {
    if (home.directory.state === 'loading') return '교사 목록을 불러오는 중입니다.'
    if (home.directory.state === 'error' || home.directory.state === 'forbidden')
      return '교사 목록을 확인할 수 없습니다.'
    return home.teachers.length ? '조회할 교사를 선택하세요.' : '조회할 교사가 없습니다.'
  }
  return ''
}

export default function HomeTimetable({ home, term, board, termStatus, onRequest }) {
  const [cell, setCell] = useState(null)
  const { view, classId, grade } = home.selection
  const identity = [view, classId, home.selection.teacherId].join('/')
  const monday = startOfSchoolWeek(localDay(home.date))
  const rows = home.weekly.data ?? []
  const daysOfWeek = days.flatMap((key, i) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    const iso = toISODate(date)
    const meta = home.calendarDays?.find((d) => d.date === iso)
    if (i > 4 && !rows.some((r) => r.dayOfWeek === key) && iso !== home.date) return []
    const status = !isInTerm(iso, term)
      ? '학기 밖'
      : meta?.excluded || term?.excludedDates?.includes(iso)
        ? '수업 제외일'
        : meta && !meta.published
          ? '미게시'
          : ''
    const limit = meta?.lastPeriodByGrade?.[grade] ?? meta?.lastPeriod
    const periods = meta?.gradePeriods?.[grade] ?? meta?.periods
    return [{ key, name: dayNames[i], date, iso, status, note: status || holidayOn(date), limit, periods }]
  })
  const chosen = cell?.scope === identity && cell.iso === home.date ? cell : null
  const change = (patch) => {
    setCell(null)
    board.change(patch)
  }
  const weekDate = (offset) => {
    const start = toISODate(shiftSchoolWeek(monday, offset))
    if (term?.startDate && start < term.startDate) return term.startDate
    return start
  }
  const previousSunday = new Date(monday)
  previousSunday.setDate(monday.getDate() - 1)
  const beforeTerm = term && toISODate(previousSunday) < term.startDate
  const afterTerm = term && weekDate(1) > term.endDate
  const excludedWeek = term && weekBreakLabel(monday, [term]) === '수업 제외일'
  const nextWeek = excludedWeek ? nextOpenWeek(monday, [term]) : null
  const message = selectionMessage(home, term)
  const title =
    {
      school: '학교 전체 시간표',
      mine: '내 시간표',
      class: home.room ? roomName(home.room) + ' 시간표' : '학급 시간표',
      homeroom: home.homeroom ? '담임 · ' + roomName(home.homeroom) + ' 시간표' : '담임 시간표',
      teacher: home.teacher
        ? (home.teacher.displayName ?? home.teacher.username) + ' 교사 시간표'
        : '교사별 시간표',
    }[view] ?? '주간 시간표'
  return (
    <section className="desk-card desk-timetable" aria-label="이번 주 시간표">
      <div className="desk-board-head">
        <div>
          <p className="desk-eyeline">
            {shortDate(monday)} – {shortDate(daysOfWeek.at(-1).date)}
          </p>
          <h2>{title}</h2>
        </div>
        <div className="desk-board-controls">
          <div className="desk-week-tools">
            <button
              type="button"
              className="desk-icon"
              aria-label="이전 주"
              disabled={beforeTerm}
              onClick={() => change({ date: weekDate(-1) })}
            >
              <Icon name="prev" />
            </button>
            <button
              type="button"
              className="desk-today"
              disabled={!isInTerm(home.today, term)}
              onClick={() => change({ date: home.today })}
            >
              오늘
            </button>
            <button
              type="button"
              className="desk-icon"
              aria-label="다음 주"
              disabled={afterTerm}
              onClick={() => change({ date: weekDate(1) })}
            >
              <Icon name="next" />
            </button>
            <label>
              수업 날짜
              <input
                aria-label="수업 날짜"
                type="date"
                min={term?.startDate}
                max={term?.endDate}
                value={home.date}
                onChange={(e) => {
                  if (e.target.value) change({ date: e.target.value })
                }}
              />
            </label>
          </div>
          <div className="desk-target-controls">
            <TargetPicker home={home} selection={board.selection} onChange={change} />
          </div>
        </div>
      </div>
      <div className="desk-board-options">
        <ViewSwitch home={home} changeView={(next) => change({ view: next })} />
        {home.weekly.refreshing && <small role="status">시간표 갱신 중</small>}
        {home.weekly.refreshError && (
          <button className="desk-text-button" onClick={home.retryWeekly}>
            시간표 다시 조회
          </button>
        )}
      </div>
      {message ? (
        <div className="desk-status" role="status">
          {message}
          {!home.inRange && (
            <button
              className="desk-text-button"
              onClick={() => change({ date: firstSchoolDate(term, home.today) })}
            >
              학기 내 날짜로 이동
            </button>
          )}
        </div>
      ) : (
        <>
          {!['empty', 'ready'].includes(home.weekly.state) ? (
            <ReadMessage query={home.weekly} label="주간 시간표" retry={home.retryWeekly} />
          ) : !rows.length && !home.dated.data?.length ? (
            <div className="desk-empty">
              <img src={mochi} alt="" width="98" height="98" />
              <strong>
                {excludedWeek
                  ? '이번 주는 정규 수업 제외 기간입니다.'
                  : term && !home.calendarDays?.some((d) => d.published)
                    ? '이 주에 적용되는 게시 시간표가 없습니다.'
                    : '이 주에 조회된 수업이 없습니다.'}
              </strong>
              {nextWeek && <button className="desk-text-button" onClick={() => change({ date: toISODate(nextWeek) })}>다음 수업 주로 이동</button>}
            </div>
          ) : (
            <WeekTable
              home={home}
              rows={rows}
              term={term}
              onRequest={onRequest}
              roomId={classId}
              daysOfWeek={daysOfWeek}
              selected={chosen}
              onPick={(value) => {
                setCell({ ...value, scope: identity })
                board.change({ date: value.iso })
              }}
            />
          )}
          <DatedLessons
            key={home.date + identity}
            home={home}
            term={term}
            roomId={classId}
            onRequest={onRequest}
            termStatus={termStatus}
          />
        </>
      )}
    </section>
  )
}
