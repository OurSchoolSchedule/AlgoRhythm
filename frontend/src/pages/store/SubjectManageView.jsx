import { useState, useRef } from "react";

const initialSubjects = [
  { id: 1, grade: 1, classNum: "1-1", subject: "수학Ⅰ", hours: 4, teacher: "김민지", category: "수학" },
  { id: 2, grade: 1, classNum: "1-2", subject: "수학Ⅰ", hours: 4, teacher: "이철수", category: "수학" },
  { id: 3, grade: 1, classNum: "1-3", subject: "미적분", hours: 3, teacher: "박지은", category: "수학" },
  { id: 4, grade: 1, classNum: "1-4", subject: "미적분", hours: 3, teacher: "김민지", category: "수학" },
  { id: 5, grade: 2, classNum: "2-1", subject: "확률과 통계", hours: 3, teacher: "최영호", category: "수학" },
  { id: 6, grade: 2, classNum: "2-2", subject: "확률과 통계", hours: 3, teacher: "최영호", category: "수학" },
  { id: 7, grade: 2, classNum: "2-3", subject: "기하", hours: 4, teacher: "박지은", category: "수학" },
  { id: 8, grade: 3, classNum: "3-1", subject: "수학Ⅱ", hours: 4, teacher: "이철수", category: "수학" },
  { id: 9, grade: 3, classNum: "3-2", subject: "수학Ⅱ", hours: 4, teacher: "김민지", category: "수학" },
  { id: 10, grade: 3, classNum: "3-3", subject: "미적분", hours: 5, teacher: "최영호", category: "수학" },
];

const GRADES = ["전체", "1학년", "2학년", "3학년"];

export default function SubjectManageView({ navigate }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [filterGrade, setFilterGrade] = useState("전체");
  const [csvStatus, setCsvStatus] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState({ grade: 1, classNum: "", subject: "", hours: 3, teacher: "", category: "수학" });
  const fileRef = useRef();

  const filtered = filterGrade === "전체" ? subjects : subjects.filter(s => s.grade === parseInt(filterGrade));

  const handleCSV = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setCsvStatus("loading");
    setTimeout(() => {
      setCsvStatus("success");
      setSubjects(prev => [
        ...prev,
        { id: Date.now(), grade: 1, classNum: "1-5", subject: "수학Ⅰ", hours: 4, teacher: "신규교사", category: "수학" },
        { id: Date.now() + 1, grade: 2, classNum: "2-4", subject: "확률과 통계", hours: 3, teacher: "홍길동", category: "수학" },
      ]);
    }, 1400);
  };

  const handleAddRow = () => {
    if (!newRow.classNum || !newRow.subject || !newRow.teacher) return;
    setSubjects(prev => [...prev, { ...newRow, id: Date.now() }]);
    setShowAdd(false);
    setNewRow({ grade: 1, classNum: "", subject: "", hours: 3, teacher: "", category: "수학" });
  };

  const handleDelete = (id) => setSubjects(prev => prev.filter(s => s.id !== id));

  const totalHours = subjects.reduce((sum, s) => sum + s.hours, 0);
  const teachers = [...new Set(subjects.map(s => s.teacher))].length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>과목·수업 관리</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        <StatCard label="등록 과목" value={subjects.length} unit="개" />
        <StatCard label="총 주간 시수" value={totalHours} unit="시간" />
        <StatCard label="담당 교사" value={teachers} unit="명" />
        <StatCard label="학년 수" value={3} unit="개" />
      </div>

      <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {GRADES.map(g => (
              <button key={g} onClick={() => setFilterGrade(g)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13,
                border: "1px solid", cursor: "pointer",
                background: filterGrade === g ? "var(--color-primary-500)" : "transparent",
                borderColor: filterGrade === g ? "var(--color-primary-500)" : "var(--color-border-input)",
                color: filterGrade === g ? "var(--color-surface)" : "var(--color-text-subtle)",
              }}>{g}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="file" ref={fileRef} accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid var(--color-border-input)",
              background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>CSV 올리기</button>
            <button onClick={() => setShowAdd(v => !v)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "var(--color-primary-500)", color: "var(--color-surface)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>{showAdd ? "닫기" : "수업 추가"}</button>
          </div>
        </div>

        {csvStatus === "loading" && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
            CSV 파일을 읽고 있습니다.
          </p>
        )}
        {csvStatus === "success" && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-success)" }}>
            CSV를 반영했습니다. 2개 행이 추가되었습니다.
          </p>
        )}

        {showAdd && (
          <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, alignItems: "end" }}>
            {[
              { label: "학년", type: "number", key: "grade", min: 1, max: 3 },
              { label: "학반", type: "text", key: "classNum", placeholder: "1-1" },
              { label: "과목명", type: "text", key: "subject", placeholder: "미적분" },
              { label: "주간 시수", type: "number", key: "hours", min: 1, max: 8 },
              { label: "담당 교사", type: "text", key: "teacher", placeholder: "이름" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={newRow[f.key]} min={f.min} max={f.max} placeholder={f.placeholder}
                  onChange={e => setNewRow(p => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border-input)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            ))}
            <button onClick={handleAddRow} style={{ padding: "7px 0", borderRadius: 6, border: "none", background: "var(--color-primary-500)", color: "var(--color-surface)", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 32 }}>추가하기</button>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["학년", "학반", "과목명", "주간 시수", "담당 교사", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--color-text-muted)" }}>{s.grade}학년</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--color-text)" }}>{s.classNum}</td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text)" }}>{s.subject}</td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
                    {s.hours}시간
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{s.teacher}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 12 }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>총 {filtered.length}개 항목</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", padding: "14px 18px" }}>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-muted)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
        {value}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4, color: "var(--color-text-muted)" }}>{unit}</span>
      </p>
    </div>
  );
}
