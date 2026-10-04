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
        <button onClick={() => navigate("admin")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>시간표 생성</h1>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", padding: "28px 32px", marginTop: 20 }}>
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
            padding: "10px 24px", borderRadius: 8, border: "1px solid var(--color-border-input)",
            background: "transparent", color: step === 0 ? "var(--color-border-input)" : "var(--color-text-secondary)",
            cursor: step === 0 ? "default" : "pointer", fontSize: 14,
          }}
        >이전</button>
        {step < 2 ? (
          <button
            onClick={() => setStep(s => Math.min(2, s + 1))}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: "var(--color-primary-500)", color: "var(--color-surface)", cursor: "pointer", fontSize: 14, fontWeight: 500,
            }}
          >다음</button>
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
                  style={{ accentColor: "var(--color-primary-500)" }}
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
      <div style={{ background: "var(--color-bg)", borderRadius: 8, border: "1px dashed var(--color-border-input)", padding: "24px", textAlign: "center", marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
        {form.csvFile ? (
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{form.csvName}</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>파일이 업로드되었습니다.</p>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--color-text-subtle)" }}>CSV 파일을 드래그하거나 버튼으로 업로드하세요</p>
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--color-primary-500)", background: "transparent", color: "var(--color-primary-500)", fontSize: 13, cursor: "pointer" }}
        >{form.csvFile ? "파일 변경" : "파일 선택"}</button>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
        포함 항목: 교사명, 사번, 담당 과목, 담당 학년과 반, 주간 시수, 선호 시간대, 기피 시간대, 담임 여부. 업로드하면 서버에 저장됩니다.
      </p>
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
            padding: "12px 8px", borderBottom: "1px solid var(--color-border)",
            cursor: "pointer", background: form.constraints[c.key] ? "var(--color-primary-50)" : "transparent",
          }}>
            <input type="checkbox" checked={form.constraints[c.key]} onChange={() => toggle(c.key)}
              style={{ accentColor: "var(--color-primary-500)", width: 15, height: 15, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-text)" }}>{c.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>{c.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <Field label="교사 1일 최대 수업 교시">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range" min={3} max={8} value={form.constraints.maxPeriodsPerDay}
            onChange={e => setForm(p => ({ ...p, constraints: { ...p.constraints, maxPeriodsPerDay: Number(e.target.value) } }))}
            style={{ flex: 1, accentColor: "var(--color-primary-500)" }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", minWidth: 24, fontVariantNumeric: "tabular-nums" }}>{form.constraints.maxPeriodsPerDay}</span>
        </div>
      </Field>

      <div style={{ marginTop: 20 }}>
        <SectionTitle>추가 제약 조건</SectionTitle>
        <textarea
          value={form.naturalConstraint}
          onChange={e => setForm(p => ({ ...p, naturalConstraint: e.target.value }))}
          placeholder="예: 김민지 선생님은 수요일 오전에 수업을 배정하지 않는다. 3학년 수업은 오전에 몰아서 배정한다."
          style={{
            ...inputStyle, height: 100, resize: "vertical", lineHeight: 1.6,
          }}
        />
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
          문장으로 적어도 제약 조건으로 저장됩니다.
        </p>
      </div>
    </div>
  );
}

function Step2({ form, generating, generated, handleGenerate, navigate }) {
  const alternatives = [
    { id: "A", desc: "오전 집중. 3학년 수업은 오전에 배정합니다.", score: 94 },
    { id: "B", desc: "균형 분산. 학년별로 나눠 배치합니다.", score: 88 },
    { id: "C", desc: "선호 시간 우선. 교사 선호를 먼저 반영합니다.", score: 82 },
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
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {!generated && !generating && (
        <button
          onClick={handleGenerate}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
            background: "var(--color-primary-500)", color: "var(--color-surface)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >시간표 생성</button>
      )}

      {generating && (
        <div style={{ padding: "24px 0" }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text)", fontWeight: 500 }}>시간표를 만들고 있습니다.</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>제약 조건을 적용하는 중입니다.</p>
        </div>
      )}

      {generated && (
        <div>
          <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>시간표 {alternatives.length}안을 만들었습니다. 하나를 선택하세요.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alternatives.map((alt, i) => (
              <div key={alt.id} style={{
                padding: "12px 8px",
                borderBottom: "1px solid var(--color-border)",
                background: i === 0 ? "var(--color-primary-50)" : "transparent",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", width: 28, flexShrink: 0 }}>{alt.id}안</span>
                <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: "var(--color-text)" }}>{alt.desc}</p>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", fontVariantNumeric: "tabular-nums", width: 36, textAlign: "right" }}>{alt.score}</span>
                <button type="button" style={{
                  padding: "6px 14px", borderRadius: 6,
                  border: i === 0 ? "none" : "1px solid var(--color-border-input)",
                  background: i === 0 ? "var(--color-primary-500)" : "var(--color-surface)",
                  color: i === 0 ? "var(--color-surface)" : "var(--color-text)",
                  fontSize: 12, cursor: "pointer",
                }}>{i === 0 ? "선택됨" : "선택하기"}</button>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("admin")}
            style={{
              width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 8,
              border: "none", background: "var(--color-primary-500)", color: "var(--color-surface)", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >확정하기</button>
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
              width: 28, height: 28, borderRadius: "var(--radius-md)", flexShrink: 0,
              background: i === current ? "var(--color-primary-500)" : "var(--color-border-light)",
              color: i === current ? "var(--color-surface)" : "var(--color-text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: i === current ? "var(--color-primary-500)" : "var(--color-text-muted)", fontWeight: i === current ? 600 : 400 }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: "var(--color-border)", margin: "0 12px" }} />}
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--color-text)", paddingBottom: 8, borderBottom: "1px solid var(--color-border)" }}>{children}</p>;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-input)",
  background: "var(--color-surface)", fontSize: 13, color: "var(--color-text)", boxSizing: "border-box", outline: "none",
};
