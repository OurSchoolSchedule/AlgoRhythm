import { useState } from 'react'

const roomName = (room) => `${room.grade}학년 ${room.classNumber}반`
const roomOrder = (a, b) => a.grade - b.grade || a.classNumber - b.classNumber

export function ViewSwitch({ home, changeView }) {
  const modes = home.access.queries.adminProfile
    ? [
        ['school', '학교 전체'],
        ['class', '학급 조회'],
        ['teacher', '교사별 조회'],
      ]
    : [
        ['mine', '내 시간표'],
        ['homeroom', '담임'],
        ['class', '학급 조회'],
      ]
  return (
    <fieldset className="desk-switch">
      <legend className="desk-sr">시간표 보기</legend>
      {modes.map(([value, label]) => (
        <label key={value}>
          <input
            type="radio"
            name="desk-view"
            checked={home.selection.view === value}
            onChange={() => changeView(value)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  )
}

function TeacherPicker({ home, onChange }) {
  const [search, setSearch] = useState('')
  const visible = home.teachers.filter(
    (t) =>
      t.schoolUserId === home.teacher?.schoolUserId ||
      (t.displayName ?? t.username ?? '').includes(search.trim()),
  )
  return (
    <>
      <label>
        교사 검색
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="교사 검색"
        />
      </label>
      <label>
        교사
        <select
          aria-label="조회할 교사"
          value={home.teacher?.schoolUserId ?? ''}
          onChange={(e) => onChange({ teacherId: Number(e.target.value) || null })}
        >
          <option value="">교사 선택</option>
          {visible.map((t) => (
            <option key={t.schoolUserId} value={t.schoolUserId}>
              {t.displayName ?? t.username} · #{t.schoolUserId}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

export function TargetPicker({ home, selection, onChange }) {
  const { view } = home.selection
  if (view === 'homeroom' && home.rooms.length > 1)
    return (
      <label>
        담임 학급
        <select
          aria-label="담임 학급"
          value={home.homeroom.classId}
          onChange={(e) => onChange({ homeroomId: Number(e.target.value) })}
        >
          {[...home.rooms].sort(roomOrder).map((r) => (
            <option key={r.classId} value={r.classId}>
              {roomName(r)}
            </option>
          ))}
        </select>
      </label>
    )
  if (view === 'teacher') return <TeacherPicker home={home} onChange={onChange} />
  if (view !== 'class') return null
  const rooms = [...(home.classes.data ?? [])].sort(roomOrder)
  const grades = [...new Set(rooms.map((r) => r.grade))]
  const grade = grades.includes(selection.grade) ? selection.grade : ''
  return (
    <>
      <label>
        학년
        <select
          aria-label="학년"
          value={grade}
          disabled={!grades.length}
          onChange={(e) => onChange({ grade: Number(e.target.value) || null, classId: null })}
        >
          <option value="">학년 선택</option>
          {grades.map((n) => (
            <option value={n} key={n}>
              {n}학년
            </option>
          ))}
        </select>
      </label>
      <label>
        학급
        <select
          aria-label="학급"
          value={home.room?.id ?? ''}
          disabled={!grade}
          onChange={(e) => onChange({ classId: Number(e.target.value) || null })}
        >
          <option value="">학급 선택</option>
          {rooms
            .filter((r) => r.grade === grade)
            .map((r) => (
              <option value={r.id} key={r.id}>
                {r.classNumber}반
              </option>
            ))}
        </select>
      </label>
    </>
  )
}
