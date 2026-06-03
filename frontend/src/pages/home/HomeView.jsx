import { useTodos, useToggleTodo } from "@/hooks";
import { toISODate } from "@/utils";

const DAYS = ["월", "화", "수", "목", "금"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const todaySchedule = {
  수: {
    1: { class: "1-4", subject: "미적분 | 도함수" },
    2: { class: "2-1", subject: "확률과 통계 | 조합" },
    3: { class: "1-3", subject: "미적분 1" },
    4: null,
    5: { class: "3-2", subject: "수학 Ⅱ | 수열" },
    6: null,
    7: null,
    8: { class: "2-4", subject: "기하 | 벡터" },
  },
};

const briefs = [
  { time: "08:40", type: "보결", text: "2교시 · 2-3반 박철수 선생님 부재 → 김민지 선생님 대체 예정" },
  { time: "10:10", type: "변경", text: "5교시 3-1반 장소 변경: 본관 3층 → 시청각실" },
  { time: "11:30", type: "완료", text: "오늘 시간표 최종 확정 완료" },
];

export default function HomeView({ navigate }) {
  const today = "수";
  const todayDate = toISODate();
  const { data: todoData, isLoading: todoLoading, isError: todoError } = useTodos(todayDate);
  const toggleTodo = useToggleTodo();
  const todoItems = todoData
    ? [...todoData.storeTodos, ...todoData.handoverTodos, ...todoData.personalTodos]
    : [];

  const currentPeriod = 3;
  const currentClass = todaySchedule[today][currentPeriod];

  const typeColor = { 보결: "#f09500", 변경: "#27a859", 완료: "#1d9e75" };
  const typeBg = { 보결: "#faeeda", 변경: "#e8f7ee", 완료: "#e1f5ee" };

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>2026.05.29 (금)</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>
          안녕하세요, 관리자 선생님! 👋
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <StatCard label="오늘 수업" value={Object.values(todaySchedule[today]).filter(Boolean).length} unit="교시" color="#27a859" />
        <StatCard label="이번 주 보결" value={2} unit="건" color="#f09500" />
        <StatCard label="등록 교사" value={42} unit="명" color="#1d9e75" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div>
          <Card title="현재 수업">
            {currentClass ? (
              <div style={{ background: "#e8f7ee", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#27a859", fontWeight: 600 }}>
                  {currentPeriod}교시 · {currentClass.class} · {currentClass.subject}
                </span>
              </div>
            ) : (
              <div style={{ background: "#f1efe8", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#888" }}>현재 공강 시간입니다</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              {DAYS.map(d => (
                <button
                  key={d}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", border: "none",
                    background: d === today ? "#27a859" : "transparent",
                    color: d === today ? "#fff" : "#5f5e5a",
                    fontWeight: d === today ? 600 : 400, fontSize: 13, cursor: "pointer",
                  }}
                >{d}</button>
              ))}
            </div>

            <div style={{ overflowY: "auto", maxHeight: 280 }}>
              {PERIODS.map(p => {
                const s = todaySchedule[today][p];
                const isCurrent = p === currentPeriod;
                return (
                  <div key={p} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 0", borderBottom: "0.5px solid #e8e6e0",
                  }}>
                    <span style={{ fontSize: 12, color: "#888", width: 32, flexShrink: 0 }}>{p}교시</span>
                    {s ? (
                      <span style={{
                        flex: 1, background: isCurrent ? "#e8f7ee" : "#f1efe8",
                        color: isCurrent ? "#27a859" : "#444",
                        borderRadius: 6, padding: "5px 10px", fontSize: 13,
                        fontWeight: isCurrent ? 600 : 400,
                      }}>
                        {s.class} | {s.subject}
                      </span>
                    ) : (
                      <span style={{ flex: 1, color: "#d3d1c7", fontSize: 13, paddingLeft: 10 }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="실시간 변동 브리핑">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {briefs.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: "#888", flexShrink: 0, paddingTop: 2 }}>{b.time}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                    background: typeBg[b.type], color: typeColor[b.type], flexShrink: 0,
                  }}>{b.type}</span>
                  <span style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="할 일">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {todoLoading && (
                <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
              )}
              {todoError && (
                <p style={{ margin: 0, fontSize: 13, color: "#d85a30" }}>할 일을 불러오지 못했습니다.</p>
              )}
              {!todoLoading && !todoError && todoItems.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "#b4b2a9" }}>오늘 등록된 할 일이 없습니다.</p>
              )}
              {todoItems.map((t) => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(t.completed)}
                    disabled={toggleTodo.isPending}
                    onChange={() => toggleTodo.mutate(t.id)}
                    style={{ accentColor: "#27a859", width: 15, height: 15 }}
                  />
                  <span style={{
                    fontSize: 13, color: t.completed ? "#b4b2a9" : "#2c2c2a",
                    textDecoration: t.completed ? "line-through" : "none", flex: 1,
                  }}>{t.content}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => navigate("admin")}
              style={{
                width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 8,
                border: "0.5px solid #27a859", background: "transparent",
                color: "#27a859", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >+ 시간표 생성하기</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0",
      padding: "16px 18px",
    }}>
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>{title}</p>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, border: "0.5px solid #e8e6e0",
      padding: "14px 18px",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color, letterSpacing: "-1px" }}>
        {value}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3, color: "#888" }}>{unit}</span>
      </p>
    </div>
  );
}
