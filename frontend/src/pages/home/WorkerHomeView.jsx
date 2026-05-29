import { useState } from "react";

const DAYS = ["월", "화", "수", "목", "금"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const mySchedule = {
  월: { 1: "1-4 | 미적분 | 도함수", 3: "2-1 | 확통 | 조합", 6: "1-2 | 미적분 | 극한" },
  화: { 2: "3-2 | 수학Ⅱ | 수열", 4: "1-4 | 미적분 | 미분", 7: "2-3 | 확통 | 확률" },
  수: { 1: "1-4 | 미적분 | 도함수", 2: "2-1 | 확통 | 조합", 3: "1-3 | 미적분 1", 5: "3-2 | 수학Ⅱ", 8: "2-4 | 기하 | 벡터" },
  목: { 2: "1-2 | 미적분 | 극한", 4: "3-2 | 수학Ⅱ", 6: "1-4 | 미적분" },
  금: { 1: "2-3 | 확통 | 확률", 3: "1-3 | 미적분 1", 5: "2-4 | 기하", 7: "3-2 | 수학Ⅱ" },
};

const notices = [
  { id: 1, type: "보결", text: "목요일 3교시 · 2-2반 보결 요청이 도착했습니다.", time: "오늘 08:12", urgent: true },
  { id: 2, type: "안내", text: "다음 주 시간표가 확정되었습니다.", time: "어제 17:40", urgent: false },
  { id: 3, type: "변경", text: "오늘 5교시 장소: 시청각실로 변경되었습니다.", time: "오늘 07:55", urgent: false },
];

export default function WorkerHomeView() {
  const today = "수";
  const [selectedDay, setSelectedDay] = useState(today);
  const [showRequest, setShowRequest] = useState(false);

  const todayClasses = Object.values(mySchedule[today]).filter(Boolean).length;
  const weekTotal = Object.values(mySchedule).reduce((sum, day) => sum + Object.keys(day).length, 0);
  const currentPeriod = 3;
  const currentClass = mySchedule[today][currentPeriod];

  const typeColor = { 보결: "#f09500", 변경: "#534ab7", 안내: "#1d9e75" };
  const typeBg = { 보결: "#faeeda", 변경: "#eeedfe", 안내: "#e1f5ee" };

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>2026.05.29 (금)</p>
      <h1 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>
        안녕하세요, 김교사 선생님! 👋
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        <StatCard label="오늘 수업" value={todayClasses} unit="교시" color="#534ab7" />
        <StatCard label="이번 주 수업" value={weekTotal} unit="시수" color="#1d9e75" />
        <StatCard label="미확인 알림" value={notices.filter(n => n.urgent).length} unit="건" color="#d85a30" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="내 시간표">
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => setSelectedDay(d)} style={{
                  flex: 1, height: 30, borderRadius: 6, border: "none",
                  background: d === selectedDay ? "#534ab7" : d === today ? "#eeedfe" : "#f1efe8",
                  color: d === selectedDay ? "#fff" : d === today ? "#534ab7" : "#5f5e5a",
                  fontWeight: d === selectedDay ? 600 : 400, fontSize: 13, cursor: "pointer",
                }}>{d}</button>
              ))}
            </div>
            {PERIODS.map(p => {
              const s = mySchedule[selectedDay]?.[p];
              const isCurrent = selectedDay === today && p === currentPeriod;
              return (
                <div key={p} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 0", borderBottom: "0.5px solid #e8e6e0",
                }}>
                  <span style={{ fontSize: 12, color: "#888", width: 32, flexShrink: 0 }}>{p}교시</span>
                  {s ? (
                    <span style={{
                      flex: 1, background: isCurrent ? "#eeedfe" : "#f1efe8",
                      color: isCurrent ? "#534ab7" : "#444",
                      borderRadius: 6, padding: "5px 10px", fontSize: 13,
                      fontWeight: isCurrent ? 600 : 400,
                    }}>{s}</span>
                  ) : (
                    <span style={{ flex: 1, color: "#d3d1c7", fontSize: 13, paddingLeft: 10 }}>공강</span>
                  )}
                </div>
              );
            })}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="현재 수업">
            {currentClass ? (
              <div style={{ background: "#eeedfe", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#534ab7" }}>{currentPeriod}교시 진행 중</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "#534ab7" }}>{currentClass}</p>
              </div>
            ) : (
              <div style={{ background: "#f1efe8", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#888" }}>현재 공강 시간입니다</p>
              </div>
            )}

            <div style={{ marginTop: 12, background: "#f8f8f6", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#888" }}>이번 주 수업 시수</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#2c2c2a" }}>{weekTotal}</span>
                <span style={{ fontSize: 12, color: "#888" }}>/ 21 시간</span>
              </div>
              <div style={{ height: 6, background: "#e8e6e0", borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${(weekTotal / 21) * 100}%`, background: "#534ab7", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          </Card>

          <Card title="알림">
            {notices.map(n => (
              <div key={n.id} style={{
                padding: "8px 0", borderBottom: "0.5px solid #e8e6e0",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                    background: typeBg[n.type], color: typeColor[n.type],
                  }}>{n.type}</span>
                  {n.urgent && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d85a30" }} />}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#444", lineHeight: 1.5 }}>{n.text}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#b4b2a9" }}>{n.time}</p>
              </div>
            ))}

            <button
              onClick={() => setShowRequest(v => !v)}
              style={{
                width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 8,
                border: "0.5px solid #d85a30", background: "transparent",
                color: "#d85a30", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >보결 요청 처리하기</button>

            {showRequest && (
              <div style={{ marginTop: 10, background: "#faeeda", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#f09500" }}>목요일 3교시 · 2-2반 보결</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#633806" }}>김민지 선생님 부재로 인한 보결 수업 요청입니다. 담당: 수학</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#534ab7", color: "#fff", fontSize: 12, cursor: "pointer" }}>수락</button>
                  <button style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "0.5px solid #d3d1c7", background: "#fff", color: "#888", fontSize: 12, cursor: "pointer" }}>거절</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "16px 18px" }}>
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>{title}</p>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e8e6e0", padding: "14px 18px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color, letterSpacing: "-1px" }}>
        {value}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3, color: "#888" }}>{unit}</span>
      </p>
    </div>
  );
}
