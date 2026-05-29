import { useState } from "react";

const historyData = [
  { id: 1, date: "2026.05.28", type: "보결", detail: "3교시 · 2-3반 · 수학 → 김민지 선생님 보결 처리", status: "완료" },
  { id: 2, date: "2026.05.27", type: "변경", detail: "6교시 1-4반 장소: 본관 3층 → 시청각실", status: "완료" },
  { id: 3, date: "2026.05.26", type: "생성", detail: "2026년 1학기 시간표 최종 확정 (대안 A 선택)", status: "완료" },
  { id: 4, date: "2026.05.23", type: "보결", detail: "5교시 · 3-1반 · 영어 → 이철수 선생님 보결", status: "완료" },
  { id: 5, date: "2026.05.20", type: "수정", detail: "2-2반 월요일 2교시 수업 시간 조정", status: "완료" },
  { id: 6, date: "2026.05.15", type: "교환", detail: "박지은 ↔ 최영호 화요일 3교시 시프트 교환", status: "완료" },
  { id: 7, date: "2026.05.10", type: "보결", detail: "1교시 · 1-2반 · 수학 → 신청자 없음", status: "미처리" },
];

const typeColor = { 보결: "#f09500", 변경: "#27a859", 생성: "#1d9e75", 수정: "#185fa5", 교환: "#d85a30" };
const typeBg = { 보결: "#faeeda", 변경: "#e8f7ee", 생성: "#e1f5ee", 수정: "#e6f1fb", 교환: "#faece7" };
const statusColor = { 완료: "#1d9e75", 미처리: "#d85a30" };

export function HistoryView({ navigate }) {
  const [filter, setFilter] = useState("전체");
  const types = ["전체", "보결", "변경", "생성", "수정", "교환"];
  const filtered = filter === "전체" ? historyData : historyData.filter(h => h.type === filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>내역</h1>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "5px 14px", borderRadius: 20, border: "0.5px solid", fontSize: 13, cursor: "pointer",
              background: filter === t ? "#27a859" : "transparent",
              borderColor: filter === t ? "#27a859" : "#d3d1c7",
              color: filter === t ? "#fff" : "#5f5e5a",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.map((h, i) => (
            <div key={h.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 0", borderBottom: i < filtered.length - 1 ? "0.5px solid #f1efe8" : "none",
            }}>
              <span style={{ fontSize: 12, color: "#888", flexShrink: 0, width: 80 }}>{h.date}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                background: typeBg[h.type] || "#f1efe8", color: typeColor[h.type] || "#888",
              }}>{h.type}</span>
              <span style={{ flex: 1, fontSize: 13, color: "#2c2c2a" }}>{h.detail}</span>
              <span style={{ fontSize: 12, color: statusColor[h.status] || "#888", flexShrink: 0, fontWeight: 500 }}>
                {h.status === "완료" ? "✓ 완료" : "⚠ 미처리"}
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#888" }}>{filtered.length}개 항목</p>
      </div>
    </div>
  );
}

const teachers = [
  { id: 1, name: "김민지", subject: "수학", classes: ["1-3", "1-4", "3-2"], hours: 14, isHomeroom: true, homeroom: "1-4", status: "정상" },
  { id: 2, name: "이철수", subject: "수학", classes: ["1-2", "3-1", "3-3"], hours: 12, isHomeroom: false, homeroom: "-", status: "정상" },
  { id: 3, name: "박지은", subject: "수학", classes: ["1-3", "2-3"], hours: 10, isHomeroom: true, homeroom: "2-3", status: "부재" },
  { id: 4, name: "최영호", subject: "수학", classes: ["2-1", "2-2", "3-3"], hours: 13, isHomeroom: false, homeroom: "-", status: "정상" },
];

export function AdminView({ navigate }) {
  const [tab, setTab] = useState("교사");
  const tabs = ["교사", "학급", "설정"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>관리자 도구</h1>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid #e8e6e0" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
            color: tab === t ? "#27a859" : "#888", fontWeight: tab === t ? 600 : 400,
            borderBottom: tab === t ? "2px solid #27a859" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>

      {tab === "교사" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>교사 목록</p>
            <button style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#27a859", color: "#fff", fontSize: 13, cursor: "pointer" }}>+ 교사 추가</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #e8e6e0" }}>
                {["이름", "담당 과목", "담임 여부", "담임 학반", "주간 시수", "상태", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#2c2c2a" }}>{t.name}</td>
                  <td style={{ padding: "10px 12px", color: "#444" }}>{t.subject}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 12, fontSize: 12,
                      background: t.isHomeroom ? "#e1f5ee" : "#f1efe8",
                      color: t.isHomeroom ? "#0f6e56" : "#888",
                    }}>{t.isHomeroom ? "담임" : "비담임"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#888" }}>{t.homeroom}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: "#e8f7ee", color: "#27a859", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{t.hours}시간</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 12, fontSize: 12,
                      background: t.status === "정상" ? "#e1f5ee" : "#faeeda",
                      color: t.status === "정상" ? "#0f6e56" : "#f09500",
                    }}>{t.status}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#27a859", fontSize: 12 }}>수정</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "학급" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[1, 2, 3].map(grade => (
              <div key={grade} style={{ border: "0.5px solid #e8e6e0", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>{grade}학년</p>
                {["1", "2", "3", "4"].map(cls => (
                  <div key={cls} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "0.5px solid #f1efe8" }}>
                    <span style={{ fontSize: 13, color: "#444" }}>{grade}-{cls}반</span>
                    <span style={{ fontSize: 12, color: "#27a859" }}>30명</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "설정" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>시스템 설정</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "학교명", value: "AlgoRhythm 고등학교" },
              { label: "교시 수", value: "8교시" },
              { label: "학기 시작 시간", value: "08:30" },
              { label: "교시당 수업 시간", value: "50분" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 13, color: "#888", width: 120 }}>{s.label}</label>
                <input defaultValue={s.value} style={{
                  flex: 1, maxWidth: 240, padding: "7px 12px", borderRadius: 8,
                  border: "0.5px solid #d3d1c7", fontSize: 13, color: "#2c2c2a",
                }} />
              </div>
            ))}
            <button style={{ marginTop: 8, padding: "8px 24px", borderRadius: 8, border: "none", background: "#27a859", color: "#fff", fontSize: 13, cursor: "pointer", alignSelf: "flex-start" }}>저장</button>
          </div>
        </div>
      )}
    </div>
  );
}

// HistoryView is exported as named export above
// Default export for direct import
export default HistoryView;
