import { useState, useEffect } from "react";
import {
  useStoreStaffSummary,
  useStoreSetting,
  useUpdateStoreSetting,
} from "@/hooks";

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

const STATUS_LABEL = { HIRED: "재직", ON_LEAVE: "휴직", RESIGNED: "퇴직" };
const STATUS_STYLE = {
  HIRED: { bg: "#e1f5ee", color: "#0f6e56" },
  ON_LEAVE: { bg: "#faeeda", color: "#f09500" },
  RESIGNED: { bg: "#f1efe8", color: "#888" },
};
// 매장 API(OWNER/STAFF)를 학교 도메인 라벨로 매핑
const ROLE_LABEL = { OWNER: "관리자", STAFF: "교사" };

// "HH:mm:ss" -> "HH:mm" (input[type=time]), 빈 값 안전 처리
function toInputTime(t) {
  return t ? t.slice(0, 5) : "";
}
// "HH:mm" -> "HH:mm:ss" (API 전송용)
function toApiTime(t) {
  return t && t.length === 5 ? `${t}:00` : t;
}

export function AdminView({ navigate }) {
  const [tab, setTab] = useState("교사");
  const tabs = ["교사", "학급", "설정"];

  const {
    data: staffSummary,
    isLoading: staffLoading,
    isError: staffError,
  } = useStoreStaffSummary();
  const staffList = staffSummary?.staffList ?? [];

  const {
    data: setting,
    isLoading: settingLoading,
    isError: settingError,
  } = useStoreSetting();
  const updateSetting = useUpdateStoreSetting();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!setting) return;
    setForm({
      openTime: toInputTime(setting.openTime),
      closeTime: toInputTime(setting.closeTime),
      hasBreakTime: Boolean(setting.hasBreakTime),
      breakStartTime: toInputTime(setting.breakStartTime),
      breakEndTime: toInputTime(setting.breakEndTime),
      useSegments: Boolean(setting.useSegments),
    });
  }, [setting]);

  const handleSaveSetting = () => {
    if (!form) return;
    updateSetting.mutate({
      openTime: toApiTime(form.openTime),
      closeTime: toApiTime(form.closeTime),
      useSegments: form.useSegments,
      segments: setting?.segments ?? [],
      hasBreakTime: form.hasBreakTime,
      breakStartTime: form.hasBreakTime ? toApiTime(form.breakStartTime) : null,
      breakEndTime: form.hasBreakTime ? toApiTime(form.breakEndTime) : null,
    });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, padding: 0 }}>← 뒤로</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>관리자 도구</h1>
      </div>

      <div style={{
        background: "#fff", borderRadius: 12, border: "0.5px solid #e8e6e0",
        padding: "20px 24px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#2c2c2a" }}>시간표 생성</p>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>AI 기반으로 새 학기 시간표를 생성합니다</p>
        </div>
        <button
          onClick={() => navigate("schedule-create")}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#27a859", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          시간표 생성
        </button>
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
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>
              교사 목록{staffSummary ? ` · 총 ${staffSummary.totalStaffCount}명` : ""}
            </p>
            {staffSummary?.storeName && (
              <span style={{ fontSize: 12, color: "#888" }}>
                {staffSummary.storeName} · {staffSummary.year}년 {staffSummary.month}월
              </span>
            )}
          </div>

          {staffLoading && (
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
          )}
          {staffError && (
            <p style={{ margin: 0, fontSize: 13, color: "#d85a30" }}>
              교사 목록을 불러오지 못했습니다. (관리자 권한이 필요할 수 있습니다)
            </p>
          )}
          {!staffLoading && !staffError && staffList.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "#b4b2a9" }}>등록된 교사가 없습니다.</p>
          )}

          {!staffLoading && !staffError && staffList.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #e8e6e0" }}>
                  {["이름", "역할", "재직상태", "지각", "결근", "총 수업"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => {
                  const st = STATUS_STYLE[s.employmentStatus] ?? { bg: "#f1efe8", color: "#888" };
                  return (
                    <tr key={s.userStoreId} style={{ borderBottom: "0.5px solid #f1efe8" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#2c2c2a" }}>{s.username}</td>
                      <td style={{ padding: "10px 12px", color: "#444" }}>{ROLE_LABEL[s.role] ?? s.role}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 12, background: st.bg, color: st.color }}>
                          {STATUS_LABEL[s.employmentStatus] ?? s.employmentStatus}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: s.lateCount > 0 ? "#f09500" : "#888" }}>{s.lateCount ?? 0}</td>
                      <td style={{ padding: "10px 12px", color: s.absenceCount > 0 ? "#d85a30" : "#888" }}>{s.absenceCount ?? 0}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#e8f7ee", color: "#27a859", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          {s.totalShiftCount ?? 0}회
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>학교 운영 설정</p>

          {settingLoading && (
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>불러오는 중...</p>
          )}
          {settingError && (
            <p style={{ margin: 0, fontSize: 13, color: "#d85a30" }}>설정을 불러오지 못했습니다.</p>
          )}

          {!settingLoading && !settingError && form && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SettingField label="운영 시작 시간">
                <input type="time" value={form.openTime}
                  onChange={e => setForm(f => ({ ...f, openTime: e.target.value }))}
                  style={settingInputStyle} />
              </SettingField>
              <SettingField label="운영 종료 시간">
                <input type="time" value={form.closeTime}
                  onChange={e => setForm(f => ({ ...f, closeTime: e.target.value }))}
                  style={settingInputStyle} />
              </SettingField>

              <SettingField label="휴게시간 사용">
                <input type="checkbox" checked={form.hasBreakTime}
                  onChange={e => setForm(f => ({ ...f, hasBreakTime: e.target.checked }))}
                  style={{ accentColor: "#27a859", width: 16, height: 16 }} />
              </SettingField>
              {form.hasBreakTime && (
                <>
                  <SettingField label="휴게 시작 시간">
                    <input type="time" value={form.breakStartTime}
                      onChange={e => setForm(f => ({ ...f, breakStartTime: e.target.value }))}
                      style={settingInputStyle} />
                  </SettingField>
                  <SettingField label="휴게 종료 시간">
                    <input type="time" value={form.breakEndTime}
                      onChange={e => setForm(f => ({ ...f, breakEndTime: e.target.value }))}
                      style={settingInputStyle} />
                  </SettingField>
                </>
              )}

              {updateSetting.isError && (
                <p style={{ margin: 0, fontSize: 12, color: "#d85a30" }}>저장에 실패했습니다.</p>
              )}
              {updateSetting.isSuccess && (
                <p style={{ margin: 0, fontSize: 12, color: "#1d9e75" }}>저장되었습니다.</p>
              )}

              <button onClick={handleSaveSetting} disabled={updateSetting.isPending}
                style={{
                  marginTop: 8, padding: "8px 24px", borderRadius: 8, border: "none",
                  background: updateSetting.isPending ? "#bfe3cd" : "#27a859", color: "#fff",
                  fontSize: 13, cursor: updateSetting.isPending ? "default" : "pointer", alignSelf: "flex-start",
                }}>
                {updateSetting.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const settingInputStyle = {
  flex: 1,
  maxWidth: 240,
  padding: "7px 12px",
  borderRadius: 8,
  border: "0.5px solid #d3d1c7",
  fontSize: 13,
  color: "#2c2c2a",
};

function SettingField({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <label style={{ fontSize: 13, color: "#888", width: 120 }}>{label}</label>
      {children}
    </div>
  );
}

// HistoryView is exported as named export above
// Default export for direct import
export default HistoryView;
