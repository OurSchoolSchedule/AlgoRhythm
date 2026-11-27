import { useState } from 'react'
import mochi from '@/assets/home-mochi.webp?no-inline'
import { toISODate } from '@/utils'
import { startOfSchoolWeek, shiftSchoolWeek } from '@/utils/schoolWeek'
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
          <caption className="desk-sr">주간 기본 시간표</caption>
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
                </th>
                {daysOfWeek.map((d) => {
                  const lessons = slots.get(`${d.key}/${period}`) ?? []
                  const first = lessons[0]
                  const actualOnly = !first && d.iso === home.date && actualPeriods.has(period)
                  const emptyLabel = actualOnly ? '날짜 수업 있음' : '수업 없음'
                  return (
                    <td key={d.key} data-today={d.iso === home.today}>
                      <button
                        className="desk-cell"
                        type="button"
                        aria-label={`${d.name}요일 ${period}교시 · ${first?.subjectName ?? (first ? '과목 미확인' : emptyLabel)}${lessons.length > 1 ? ' 외 ' + (lessons.length - 1) + '건' : ''}`}
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
                                : first.teacherName || '담당 미확인'}
                            </small>
                          </>
                        ) : (
                          <span className="desk-dash">{actualOnly ? emptyLabel : '—'}</span>
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
      ) : !['empty', 'ready'].includes(q.state) ? (
        <ReadMessage query={q} label="날짜 수업" retry={home.retryDated} />
      ) : !rows.length ? (
        <p>{term.excludedDates?.includes(home.date)
          ? '학기에 설정한 정규 수업 제외일입니다.'
          : '이 날짜에 조회된 수업이 없습니다.'}</p>
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

export default function HomeTimetable({ home, term, setDate, setRoom, termStatus, onRequest }) {
  const [cell, setCell] = useState(null)
  const [classFilter, setClassFilter] = useState(null)
  const weekly = home.weekly
  const monday = startOfSchoolWeek(localDay(home.date))
  const raw = weekly.data ?? []
  const rows = raw.filter((r) => !classFilter || r.schoolClassId === classFilter)
  const daysOfWeek = days.flatMap((key, i) => {
    if (i > 4 && !rows.some((r) => r.dayOfWeek === key)) return []
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    return [{ key, name: dayNames[i], date, iso: toISODate(date) }]
  })
  const chosen = cell?.iso === home.date ? cell : null
  const chooseDate = (iso) => {
    setCell(null)
    setDate(iso)
  }
  return (
    <section className="desk-card desk-timetable" aria-label="이번 주 시간표">
      <div className="desk-board-head">
        <div>
          <span className="desk-eyeline">
            <i />
            주간 기본표
          </span>
          <h2>
            {shortDate(monday)} – {shortDate(daysOfWeek.at(-1).date)}
          </h2>
        </div>
        <div className="desk-week-tools">
          <button
            className="desk-icon"
            aria-label="이전 주"
            onClick={() => chooseDate(toISODate(shiftSchoolWeek(monday, -1)))}
          >
            <Icon name="prev" />
          </button>
          <button className="desk-today" onClick={() => chooseDate(undefined)}>
            오늘
          </button>
          <button
            className="desk-icon"
            aria-label="다음 주"
            onClick={() => chooseDate(toISODate(shiftSchoolWeek(monday, 1)))}
          >
            <Icon name="next" />
          </button>
        </div>
      </div>
      <div className="desk-board-options">
        {home.canSwitchHomeroom ? (
          <fieldset className="desk-switch">
            <legend className="desk-sr">시간표 보기</legend>
            <label>
              <input
                type="radio"
                name="desk-view"
                checked={home.selection.view === 'mine'}
                onChange={() => {
                  setCell(null)
                  setRoom(null)
                }}
              />
              내 시간표
            </label>
            {home.profile.homerooms.value.map((r) => (
              <label key={r.classId}>
                <input
                  type="radio"
                  name="desk-view"
                  checked={home.selection.classId === r.classId}
                  onChange={() => {
                    setCell(null)
                    setRoom(r.classId)
                  }}
                />
                담임 {r.grade}-{r.classNumber}반
              </label>
            ))}
          </fieldset>
        ) : (
          <strong>{home.selection.view === 'school' ? '학교 시간표' : '내 시간표'}</strong>
        )}
        {home.selection.view === 'school' && Boolean(home.classes.data?.length) && (
          <select
            aria-label="시간표 학급"
            value={classFilter ?? ''}
            onChange={(e) => {
              setCell(null)
              setClassFilter(Number(e.target.value) || null)
            }}
          >
            <option value="">전체 학급</option>
            {home.classes.data.map((r) => (
              <option key={r.id} value={r.id}>
                {roomName(r)}
              </option>
            ))}
          </select>
        )}
        {weekly.refreshing && <small role="status">갱신 중</small>}
        {weekly.refreshError && <small>기본표를 갱신하지 못했습니다.</small>}
      </div>
      {!['empty', 'ready'].includes(weekly.state) ? (
        <ReadMessage query={weekly} label="주간 기본표" retry={home.retryWeekly} />
      ) : !rows.length && !home.dated.data?.length ? (
        <div className="desk-empty">
          <img src={mochi} alt="" width="98" height="98" />
          <div>
            <strong>조회된 주간 기본표가 없습니다</strong>
            <p>날짜별 실제 수업은 아래에서 확인하세요.</p>
          </div>
        </div>
      ) : (
        <WeekTable
          home={home}
          rows={rows}
          term={term}
          onRequest={onRequest}
          roomId={classFilter}
          daysOfWeek={daysOfWeek}
          selected={chosen}
          onPick={(value) => {
            setCell(value)
            setDate(value.iso)
          }}
        />
      )}
      <div className="desk-date-control">
        <label>
          수업 날짜{' '}
          <input
            aria-label="수업 날짜"
            type="date"
            value={home.date}
            onChange={(e) => {
              if (e.target.value) chooseDate(e.target.value)
            }}
          />
        </label>
      </div>
      <DatedLessons
        key={home.date + '-' + classFilter}
        home={home}
        term={term}
        roomId={classFilter}
        onRequest={onRequest}
        termStatus={termStatus}
      />
    </section>
  )
}
