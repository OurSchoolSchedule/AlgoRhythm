import { useMemo, useState } from "react";
import { useTodos, useToggleTodo, useNotifications, useSchoolTimetable, useStoreStaffSummary } from "@/hooks";
import CreateShiftSwapForm from "@/components/schedule/CreateShiftSwapForm.jsx";
import DayTimetableList from "@/components/schedule/DayTimetableList.jsx";
import { getAccessToken } from "@/api";
import { toISODate } from "@/utils";
import { getTimetableErrorMessage } from "@/utils/timetableErrors.js";
import { DOMAIN, localizeNotificationMessage, categoryLabel } from "@/constants/domainLabels.js";
import {
  filterBriefingNotifications,
  filterTeacherBriefingNotifications,
} from "@/utils/notificationActions.js";

const adminBriefs = [
  { time: "08:40", type: "보결", text: "2교시 · 2-3반 박철수 선생님 부재 → 김민지 선생님 대체 예정" },
  { time: "10:10", type: "변경", text: "5교시 3-1반 장소 변경: 본관 3층 → 시청각실" },
  { time: "11:30", type: "완료", text: "오늘 시간표 최종 확정 완료" },
];

function formatBriefTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function briefingTypeFromCategory(category) {
  const label = categoryLabel(category);
  if (label === DOMAIN.substitute) return DOMAIN.substitute;
  if (label === DOMAIN.extraWork) return DOMAIN.extraWork;
  if (category === "SCHEDULE_INPUT") return "변경";
  return "안내";
}

function buildBriefingItems(notifications, isAdmin) {
  const source = isAdmin
    ? filterBriefingNotifications(notifications)
    : filterTeacherBriefingNotifications(notifications);

  const fromNoti = source.map((n) => ({
    time: formatBriefTime(n.createdAt),
    type: briefingTypeFromCategory(n.category),
    text: localizeNotificationMessage(n.message),
    key: n.id ?? n.createdAt,
  }));

  if (isAdmin) {
    return [...adminBriefs.map((b, i) => ({ ...b, key: `mock-${i}` })), ...fromNoti];
  }
  return fromNoti;
}

/**
 * @param {Object} props
 * @param {(view: string) => void} props.navigate
 * @param {'admin'|'worker'} props.userRole 화면 구성용 (권한과 무관)
 */
export default function HomeView({ navigate, userRole = "admin" }) {
  const isAdmin = userRole === "admin";
  const {
    timetable,
    isLoading: timetableLoading,
    isError: timetableError,
    error: timetableErr,
  } = useSchoolTimetable();
  const displayDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const { data: notifications = [] } = useNotifications();
  const briefs = useMemo(
    () => buildBriefingItems(notifications, isAdmin),
    [notifications, isAdmin],
  );
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState("timetable");

  const todayDateStr = toISODate();
  const { data: todoData, isLoading: todoLoading, isError: todoError } = useTodos(todayDateStr);
  const toggleTodo = useToggleTodo();
  const todoItems = todoData
    ? [...todoData.storeTodos, ...todoData.handoverTodos, ...todoData.personalTodos]
    : [];

  const { data: staffSummary } = useStoreStaffSummary({ enabled: isAdmin });
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const previewOnly = !getAccessToken();
  const todayClassCount = timetable.todayClassCount;
  const weekClassCount = timetable.weekClassCount;
  const substituteCount = isAdmin
    ? notifications.filter((n) => n.category === "SUBSTITUTE").length
    : 0;

  const typeColor = { 보결: "var(--color-warning)", 변경: "var(--color-info)", 완료: "var(--color-success)", 안내: "var(--color-text-subtle)" };
  const typeBg = { 보결: "var(--color-warning-light)", 변경: "var(--color-info-light)", 완료: "var(--color-success-light)", 안내: "var(--color-border-light)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>오늘</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>{displayDate}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        <StatCard label="오늘 수업" value={todayClassCount} unit="교시" />
        {isAdmin ? (
          <StatCard
            label={`이번 주 ${DOMAIN.substitute}`}
            value={substituteCount}
            unit="건"
          />
        ) : (
          <StatCard label="미확인 알림" value={unreadCount} unit="건" />
        )}
        <StatCard
          label={isAdmin ? "등록 교사" : "등록 수업"}
          value={isAdmin ? (staffSummary?.totalStaffCount ?? 0) : weekClassCount}
          unit={isAdmin ? "명" : "시수"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
        <HomeTimetableTodoPanel
          activeTab={leftPanelTab}
          onTabChange={setLeftPanelTab}
          timetableContent={
            <>
              {timetableLoading && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>시간표 불러오는 중...</p>
              )}
              {timetableError && !previewOnly && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-danger)" }}>
                  {getTimetableErrorMessage(timetableErr)}
                </p>
              )}
              {!timetableLoading && (previewOnly || !timetableError) && timetable.weekClassCount === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                  등록된 수업이 없습니다. 시간표를 만들면 여기에 표시됩니다.
                </p>
              )}
              {!timetableLoading && !timetableError && timetable.weekClassCount > 0 && (
                <DayTimetableList timetable={timetable} />
              )}
            </>
          }
          todoContent={
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 280 }}>
              {todoLoading && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>불러오는 중...</p>
              )}
              {todoError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-danger)" }}>할 일을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.</p>
              )}
              {!todoLoading && !todoError && todoItems.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>오늘 할 일이 없습니다. 투두 탭에서 추가하세요.</p>
              )}
              {todoItems.map((t) => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(t.completed)}
                    disabled={toggleTodo.isPending}
                    onChange={() => toggleTodo.mutate(t.id)}
                    style={{ accentColor: "var(--color-primary-500)", width: 15, height: 15 }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: t.completed ? "var(--color-text-muted)" : "var(--color-text)",
                      textDecoration: t.completed ? "line-through" : "none",
                      flex: 1,
                    }}
                  >
                    {t.content}
                  </span>
                </label>
              ))}
            </div>
          }
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("schedule-create")}
              style={{
                width: "100%",
                height: 40,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--color-primary-500)",
                color: "var(--color-surface)",
                fontSize: "var(--font-body)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              시간표 생성
            </button>
          )}

          {!isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowSwapForm((v) => !v)}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--color-primary-500)",
                  color: "var(--color-surface)",
                  fontSize: "var(--font-body)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showSwapForm ? "닫기" : "교환 요청하기"}
              </button>
              {showSwapForm && (
                <div
                  style={{
                    background: "var(--color-surface)",
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    padding: "16px 18px",
                  }}
                >
                  <CreateShiftSwapForm />
                </div>
              )}
            </>
          )}

          <Card title="오늘 변동">
            {briefs.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
                {isAdmin
                  ? "오늘 변동이 없습니다. 보결이나 변경이 생기면 여기에 표시됩니다."
                  : "오늘 변동이 없습니다. 내 수업과 관련된 변경이 생기면 여기에 표시됩니다."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {briefs.slice(0, 8).map((b) => (
                  <div key={b.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0, paddingTop: 2 }}>
                      {b.time}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 6,
                        background: typeBg[b.type] || "var(--color-border-light)",
                        color: typeColor[b.type] || "var(--color-text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {b.type}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{b.text}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const PANEL_BORDER = "var(--color-border)";
const TAB_INACTIVE_BG = "var(--color-border-light)";

const LEFT_PANEL_TABS = [
  { id: "timetable", label: "시간표" },
  { id: "todo", label: "투두" },
];

function HomeTimetableTodoPanel({ activeTab, onTabChange, timetableContent, todoContent }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, paddingLeft: 2 }}>
        {LEFT_PANEL_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                position: "relative",
                zIndex: active ? 2 : 1,
                marginBottom: active ? -1 : 0,
                padding: "10px 28px",
                borderTop: `1px solid ${PANEL_BORDER}`,
                borderLeft: `1px solid ${PANEL_BORDER}`,
                borderRight: `1px solid ${PANEL_BORDER}`,
                borderBottom: active ? "1px solid var(--color-surface)" : `1px solid ${PANEL_BORDER}`,
                borderRadius: "8px 8px 0 0",
                background: active ? "var(--color-surface)" : TAB_INACTIVE_BG,
                color: active ? "var(--color-text)" : "var(--color-text-muted)",
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1.2,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "var(--color-surface)",
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: "0 12px 12px 12px",
          padding: "16px 18px",
        }}
      >
        {activeTab === "timetable" ? timetableContent : todoContent}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        padding: "16px 18px",
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{title}</p>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        padding: "14px 18px",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-muted)" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
        <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4, color: "var(--color-text-muted)" }}>{unit}</span>
      </p>
    </div>
  );
}
