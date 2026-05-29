import { useState, useRef } from "react";

const STEPS = ["기본 설정", "제약 조건", "생성 및 검토"];

export default function ScheduleCreateView({ navigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    semesterStart: "2026-09-01",
    semesterEnd: "2027-02-28",
    semesterName: "2026학년도 2학기",
    isHomeroom: true,
    csvFile: null,
    csvName: "",
    constraints: {
      maxPeriodsPerDay: 5,
      avoidFirstPeriod: false,
      avoidLastPeriod: false,
      sameSubjectGap: true,
      lunchBreak: true,
    },
    naturalConstraint: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setForm(prev => ({ ...prev, csvFile: f, csvName: f.name }));
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2200);
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>시간표 생성</h1>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0", padding: "28px 32px", marginTop: 20 }}>
        {step === 0 && (
          <Step0 form={form} setForm={setForm} fileRef={fileRef} handleFile={handleFile} />
        )}
        {step === 1 && (
          <Step1 form={form} setForm={setForm} />
        )}
        {step === 2 && (
          <Step2 form={form} generating={generating} generated={generated} handleGenerate={handleGenerate} navigate={navigate} />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "0.5px solid #d3d1c7",
            background: "transparent", color: step === 0 ? "#d3d1c7" : "#444",
            cursor: step === 0 ? "default" : "pointer", fontSize: 14,
          }}
        >이전</button>
        {step < 2 ? (
          <button
            onClick={() => setStep(s => Math.min(2, s + 1))}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: "#534ab7", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500,
            }}
          >다음 →</button>
        ) : null}
      </div>
    </div>
  );
}

function Step0({ form, setForm, fileRef, handleFile }) {
  return (
    <div>
      <SectionTitle>학기 기본 정보</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="학기명">
          <input
            value={form.semesterName}
            onChange={e => setForm(p => ({ ...p, semesterName: e.target.value }))}
            style={inputStyle}
            placeholder="예: 2026학년도 2학기"
          />
        </Field>
        <Field label="담임 여부">
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            {[true, false].map(v => (
              <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="radio" checked={form.isHomeroom === v}
                  onChange={() => setForm(p => ({ ...p, isHomeroom: v }))}
                  style={{ accentColor: "#534ab7" }}
                />
                {v ? "담임 포함" : "담임 없음"}
              </label>
            ))}
          </div>
        </Field>
        <Field label="학기 시작일">
          <input type="date" value={form.semesterStart}
            onChange={e => setForm(p => ({ ...p, semesterStart: e.target.value }))}
            style={inputStyle}
          />
        </Field>
        <Field label="학기 종료일">
          <input type="date" value={form.semesterEnd}
            onChange={e => setForm(p => ({ ...p, semesterEnd: e.target.value }))}
            style={inputStyle}
          />
        </Field>
      </div>

      <SectionTitle>교사·과목 데이터 업로드 (CSV)</SectionTitle>
      <div style={{ background: "#f8f8f6", borderRadius: 10, border: "1px dashed #d3d1c7", padding: "24px", textAlign: "center", marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
        {form.csvFile ? (
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>✓ {form.csvName}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>파일이 업로드되었습니다.</p>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#5f5e5a" }}>CSV 파일을 드래그하거나 버튼으로 업로드하세요</p>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#888" }}>포함 항목: 교사명, 담당 과목, 학년·반, 주간 시수, 선호 시간대</p>
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          style={{ padding: "8px 20px", borderRadius: 8, border: "0.5px solid #534ab7", background: "transparent", color: "#534ab7", fontSize: 13, cursor: "pointer" }}
        >{form.csvFile ? "파일 변경" : "파일 선택"}</button>
      </div>

      <div style={{ background: "#eeedfe", borderRadius: 8, padding: "12px 16px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#534ab7" }}>📋 CSV 포함 항목 안내</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {["교사명", "사번", "담당 과목", "담당 학년·반", "주간 시수", "선호 시간대", "기피 시간대", "담임 여부"].map(item => (
            <p key={item} style={{ margin: 0, fontSize: 12, color: "#534ab7" }}>• {item}</p>
          ))}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#7f77dd" }}>
          업로드 후 자동으로 파싱되어 서버에 저장됩니다.
        </p>
      </div>
    </div>
  );
}

function Step1({ form, setForm }) {
  const toggle = (key) => setForm(p => ({
    ...p, constraints: { ...p.constraints, [key]: !p.constraints[key] }
  }));

  const constraints = [
    { key: "avoidFirstPeriod", label: "1교시 수업 최소화", desc: "가능한 경우 1교시를 공강으로 배정합니다" },
    { key: "avoidLastPeriod", label: "8교시 수업 최소화", desc: "가능한 경우 8교시를 공강으로 배정합니다" },
    { key: "sameSubjectGap", label: "같은 과목 연속 배치 방지", desc: "동일 과목이 이틀 이상 연속되지 않도록 합니다" },
    { key: "lunchBreak", label: "점심시간 보장", desc: "4~5교시 사이 점심 여유를 확보합니다" },
  ];

  return (
    <div>
      <SectionTitle>하드 제약 조건</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {constraints.map(c => (
          <label key={c.key} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "12px 16px", borderRadius: 8, border: "0.5px solid #e8e6e0",
            cursor: "pointer", background: form.constraints[c.key] ? "#f3f2fd" : "#fff",
          }}>
            <input type="checkbox" checked={form.constraints[c.key]} onChange={() => toggle(c.key)}
              style={{ accentColor: "#534ab7", width: 15, height: 15, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#2c2c2a" }}>{c.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{c.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <Field label="교사 1일 최대 수업 교시">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range" min={3} max={8} value={form.constraints.maxPeriodsPerDay}
            onChange={e => setForm(p => ({ ...p, constraints: { ...p.constraints, maxPeriodsPerDay: Number(e.target.value) } }))}
            style={{ flex: 1, accentColor: "#534ab7" }}
          />
          <span style={{ fontSize: 15, fontWeight: 600, color: "#534ab7", minWidth: 24 }}>{form.constraints.maxPeriodsPerDay}</span>
        </div>
      </Field>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>자연어 제약 조건 (LLM 파싱)</SectionTitle>
        <textarea
          value={form.naturalConstraint}
          onChange={e => setForm(p => ({ ...p, naturalConstraint: e.target.value }))}
          placeholder="예: 김민지 선생님은 수요일 오전에 수업을 배정하지 않는다. 3학년 수업은 오전에 몰아서 배정한다."
          style={{
            ...inputStyle, height: 100, resize: "vertical", lineHeight: 1.6,
          }}
        />
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888" }}>
          자연어로 입력 시 Claude/OpenAI API가 파싱하여 제약 조건으로 자동 변환합니다.
        </p>
      </div>
    </div>
  );
}

function Step2({ form, generating, generated, handleGenerate, navigate }) {
  const alternatives = [
    { id: "A", desc: "오전 집중형 — 3학년 수업 오전 배정, 오후 여유", score: 94 },
    { id: "B", desc: "균형 분산형 — 학년별 고르게 분산 배치", score: 88 },
    { id: "C", desc: "교사 선호 우선형 — 선호도 반영 최대화", score: 82 },
  ];

  return (
    <div>
      <SectionTitle>생성 요약</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          ["학기명", form.semesterName],
          ["기간", `${form.semesterStart} ~ ${form.semesterEnd}`],
          ["담임 배정", form.isHomeroom ? "포함" : "제외"],
          ["CSV 파일", form.csvName || "미업로드"],
          ["1일 최대 교시", `${form.constraints.maxPeriodsPerDay}교시`],
          ["자연어 조건", form.naturalConstraint ? "입력됨" : "없음"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#888", flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 13, color: "#2c2c2a", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {!generated && !generating && (
        <button
          onClick={handleGenerate}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
            background: "#534ab7", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >🧠 AI 시간표 생성 시작</button>
      )}

      {generating && (
        <div style={{ textAlign: "center", padding: "28px 0" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #eeedfe", borderTop: "3px solid #534ab7", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ margin: 0, fontSize: 14, color: "#534ab7", fontWeight: 500 }}>AI가 최적 시간표를 생성 중입니다...</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>제약 조건 분석 및 배치 최적화 중</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </div>
      )}

      {generated && (
        <div>
          <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#1d9e75" }}>✓ 시간표 {alternatives.length}개 대안이 생성되었습니다</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alternatives.map((alt, i) => (
              <div key={alt.id} style={{
                padding: "14px 16px", borderRadius: 10,
                border: i === 0 ? "1.5px solid #534ab7" : "0.5px solid #e8e6e0",
                background: i === 0 ? "#f3f2fd" : "#fff",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: i === 0 ? "#534ab7" : "#f1efe8",
                  color: i === 0 ? "#fff" : "#888",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>{alt.id}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: "#2c2c2a" }}>{alt.desc}</p>
                  {i === 0 && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#534ab7" }}>추천 대안</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: i === 0 ? "#534ab7" : "#888" }}>{alt.score}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#b4b2a9" }}>점수</p>
                </div>
                <button style={{
                  padding: "6px 14px", borderRadius: 6, border: "0.5px solid #534ab7",
                  background: i === 0 ? "#534ab7" : "transparent",
                  color: i === 0 ? "#fff" : "#534ab7", fontSize: 12, cursor: "pointer",
                }}>선택</button>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("home")}
            style={{
              width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 8,
              border: "none", background: "#1d9e75", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}
          >✓ 확정 및 적용</button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "initial" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: i <= current ? "#534ab7" : "#f1efe8",
              color: i <= current ? "#fff" : "#b4b2a9",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: i === current ? "#534ab7" : i < current ? "#888" : "#b4b2a9", fontWeight: i === current ? 600 : 400 }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < current ? "#534ab7" : "#e8e6e0", margin: "0 12px" }} />}
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#2c2c2a", paddingBottom: 8, borderBottom: "0.5px solid #e8e6e0" }}>{children}</p>;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid #d3d1c7",
  background: "#fff", fontSize: 13, color: "#2c2c2a", boxSizing: "border-box", outline: "none",
};
