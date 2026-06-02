import { Fragment, useState } from 'react'
import { toISODate } from '@/utils'
import ScheduleTodoTab from './ScheduleTodoTab.jsx'

const DAYS = ['월', '화', '수', '목', '금']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const weeklyGrid = {
  월: [1, 4, 7],
  화: [2, 5, 8],
  수: [1, 3, 6],
  목: [2, 4, 7],
  금: [1, 3, 5, 8],
}

export default function TimetableView() {
  const [tab, setTab] = useState('weekly')
  const todayDate = toISODate()

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
            <ScheduleTodoTab date={todayDate} />
          )}
        </div>
      </div>
    </div>
  )
}
