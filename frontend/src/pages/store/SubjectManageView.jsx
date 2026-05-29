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
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>과목·수업 관리</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard label="등록 과목" value={subjects.length} unit="개" color="#534ab7" />
        <StatCard label="총 주간 시수" value={totalHours} unit="시간" color="#1d9e75" />
        <StatCard label="담당 교사" value={teachers} unit="명" color="#f09500" />
        <StatCard label="학년 수" value={3} unit="개" color="#d85a30" />
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {GRADES.map(g => (
              <button key={g} onClick={() => setFilterGrade(g)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13,
                border: "0.5px solid", cursor: "pointer",
                background: filterGrade === g ? "#534ab7" : "transparent",
                borderColor: filterGrade === g ? "#534ab7" : "#d3d1c7",
                color: filterGrade === g ? "#fff" : "#5f5e5a",
              }}>{g}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="file" ref={fileRef} accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} style={{
              padding: "7px 16px", borderRadius: 8, border: "0.5px solid #1d9e75",
              background: "transparent", color: "#1d9e75", fontSize: 13, cursor: "pointer",
            }}>CSV 업로드</button>
            <button onClick={() => setShowAdd(v => !v)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "#534ab7", color: "#fff", fontSize: 13, cursor: "pointer",
            }}>+ 직접 추가</button>
          </div>
        </div>

        {csvStatus === "loading" && (
          <div style={{ padding: "10px 14px", background: "#eeedfe", borderRadius: 8, marginBottom: 12, fontSize: 13, color: "#534ab7" }}>
            ⏳ CSV 파일 파싱 중...
          </div>
        )}
        {csvStatus === "success" && (
          <div style={{ padding: "10px 14px", background: "#e1f5ee", borderRadius: 8, marginBottom: 12, fontSize: 13, color: "#0f6e56" }}>
            ✓ CSV 파싱 완료 — 2개 행이 추가되었습니다.
          </div>
        )}

        {showAdd && (
          <div style={{ background: "#f8f8f6", borderRadius: 8, padding: "14px 16px", marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, alignItems: "end" }}>
            {[
              { label: "학년", type: "number", key: "grade", min: 1, max: 3 },
              { label: "학반", type: "text", key: "classNum", placeholder: "1-1" },
              { label: "과목명", type: "text", key: "subject", placeholder: "미적분" },
              { label: "주간 시수", type: "number", key: "hours", min: 1, max: 8 },
              { label: "담당 교사", type: "text", key: "teacher", placeholder: "이름" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={newRow[f.key]} min={f.min} max={f.max} placeholder={f.placeholder}
                  onChange={e => setNewRow(p => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "0.5px solid #d3d1c7", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            ))}
            <button onClick={handleAddRow} style={{ padding: "7px 0", borderRadius: 6, border: "none", background: "#534ab7", color: "#fff", fontSize: 13, cursor: "pointer", height: 32 }}>추가</button>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #e8e6e0" }}>
                {["학년", "학반", "과목명", "주간 시수", "담당 교사", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                  <td style={{ padding: "10px 12px", color: "#888" }}>{s.grade}학년</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#2c2c2a" }}>{s.classNum}</td>
                  <td style={{ padding: "10px 12px", color: "#2c2c2a" }}>{s.subject}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: "#eeedfe", color: "#534ab7", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {s.hours}시간
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#444" }}>{s.teacher}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d85a30", fontSize: 12 }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#888" }}>총 {filtered.length}개 항목</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "0.5px solid #e8e6e0", padding: "14px 18px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color, letterSpacing: "-1px" }}>
        {value}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3, color: "#888" }}>{unit}</span>
      </p>
    </div>
  );
}
