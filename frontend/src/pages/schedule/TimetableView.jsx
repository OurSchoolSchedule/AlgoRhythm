import { Fragment, useState } from 'react'

const DAYS = ['월', '화', '수', '목', '금']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const weeklyGrid = {
  월: [1, 4, 7],
  화: [2, 5, 8],
  수: [1, 3, 6],
  목: [2, 4, 7],
  금: [1, 3, 5, 8],
}

const todos = [
  { id: 1, done: false, text: '다음 주 시간표 초안 검토', priority: 'high' },
  { id: 2, done: true, text: '3학년 수학 담당 배정 완료', priority: 'low' },
  { id: 3, done: false, text: '신규 교사 과목 배정 설정', priority: 'medium' },
  { id: 4, done: false, text: '보결 처리 내역 학교장 보고', priority: 'medium' },
  { id: 5, done: false, text: '월요일 1교시 감독 일정 확인', priority: 'high' },
]

const priorityColor = { high: '#d85a30', medium: '#27a859', low: '#888' }

export default function TimetableView() {
  const [tab, setTab] = useState('weekly')
  const [todoDone, setTodoDone] = useState(todos.map((t) => t.done))

  const tabStyle = (active) => ({
    padding: '10px 28px',
    border: '0.5px solid #e8e6e0',
    borderBottom: active ? '0.5px solid #fff' : '0.5px solid #e8e6e0',
    background: active ? '#fff' : '#f1efe8',
    color: active ? '#2c2c2a' : '#888',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    cursor: 'pointer',
    borderRadius: active && tab === 'weekly' ? '8px 8px 0 0' : active ? '8px 8px 0 0' : '8px 8px 0 0',
    marginBottom: active ? -1 : 0,
    position: 'relative',
    zIndex: active ? 1 : 0,
  })

  return (
    <div style={{ maxWidth: 900 }}>
      <h1
        style={{
          margin: '0 0 24px',
          fontSize: 22,
          fontWeight: 700,
          color: '#2c2c2a',
          letterSpacing: '-0.5px',
        }}
      >
        시간표
      </h1>

      <div>
        <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
          <button type="button" onClick={() => setTab('weekly')} style={tabStyle(tab === 'weekly')}>
            주간
          </button>
          <button type="button" onClick={() => setTab('todo')} style={tabStyle(tab === 'todo')}>
            투두
          </button>
        </div>

        <div
          style={{
            background: '#fff',
            border: '0.5px solid #e8e6e0',
            borderRadius: '0 12px 12px 12px',
            padding: '28px 32px',
          }}
        >
          {tab === 'weekly' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '72px repeat(5, 1fr)',
                gap: '10px 12px',
                alignItems: 'center',
              }}
            >
              <div />
              {DAYS.map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2c2c2a',
                    paddingBottom: 4,
                  }}
                >
                  {day}
                </div>
              ))}

              {PERIODS.map((period) => (
                <Fragment key={period}>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#888',
                      textAlign: 'right',
                      paddingRight: 8,
                    }}
                  >
                    {period}교시
                  </div>
                  {DAYS.map((day) => {
                    const filled = weeklyGrid[day]?.includes(period)
                    return (
                      <div
                        key={`${day}-${period}`}
                        style={{
                          height: 44,
                          borderRadius: 10,
                          background: filled ? '#eceae4' : '#fff',
                          border: filled ? 'none' : '0.5px solid #eceae4',
                        }}
                      />
                    )
                  })}
                </Fragment>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todos.map((t, i) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 4px',
                    borderBottom: i < todos.length - 1 ? '0.5px solid #f1efe8' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={todoDone[i]}
                    onChange={() =>
                      setTodoDone((prev) => prev.map((v, j) => (j === i ? !v : v)))
                    }
                    style={{ accentColor: '#27a859', width: 16, height: 16 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: todoDone[i] ? '#b4b2a9' : '#2c2c2a',
                      textDecoration: todoDone[i] ? 'line-through' : 'none',
                    }}
                  >
                    {t.text}
                  </span>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: priorityColor[t.priority],
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
