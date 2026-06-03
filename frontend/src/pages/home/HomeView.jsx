import { useMemo, useState } from "react";
import { useTodos, useToggleTodo, useNotifications, useSchoolTimetable } from "@/hooks";
import CreateShiftSwapForm from "@/components/schedule/CreateShiftSwapForm.jsx";
import DayTimetableList from "@/components/schedule/DayTimetableList.jsx";
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const todayClassCount = timetable.todayClassCount;
  const weekClassCount = timetable.weekClassCount;
  const substituteCount = isAdmin
    ? notifications.filter((n) => n.category === "SHIFT_SWAP").length
    : 0;

  const typeColor = { 보결: "#f09500", 변경: "#27a859", 완료: "#1d9e75", 안내: "#185fa5" };
  const typeBg = { 보결: "#faeeda", 변경: "#e8f7ee", 완료: "#e1f5ee", 안내: "#e6f1fb" };

  const greetingRole = isAdmin ? DOMAIN.admin : DOMAIN.teacher;

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>{displayDate}</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "#2c2c2a", letterSpacing: "-0.5px" }}>
          안녕하세요, {greetingRole}님! 👋
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <StatCard label="오늘 수업" value={todayClassCount} unit="교시" color="#27a859" />
        {isAdmin ? (
          <StatCard
            label={`이번 주 ${DOMAIN.substitute}`}
            value={substituteCount}
            unit="건"
            color="#f09500"
          />
        ) : (
          <StatCard label="미확인 알림" value={unreadCount} unit="건" color="#f09500" />
        )}
        <StatCard
          label={isAdmin ? "등록 교사" : "이번 주 수업"}
          value={isAdmin ? 42 : weekClassCount}
          unit={isAdmin ? "명" : "시수"}
          color="#1d9e75"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <HomeTimetableTodoPanel
          activeTab={leftPanelTab}
          onTabChange={setLeftPanelTab}
          timetableContent={
            <>
              {timetableLoading && (
                <p style={{ margin: 0, fontSize: 13, color: "#888" }}>시간표 불러오는 중...</p>
              )}
              {timetableError && (
                <p style={{ margin: 0, fontSize: 13, color: "#d85a30" }}>
                  {getTimetableErrorMessage(timetableErr)}
                </p>
              )}
              {!timetableLoading && !timetableError && timetable.weekClassCount === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "#b4b2a9" }}>
                  이번 주 등록된 수업이 없습니다.
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
                  <span
                    style={{
                      fontSize: 13,
                      color: t.completed ? "#b4b2a9" : "#2c2c2a",
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("schedule-create")}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                border: "0.5px solid #27a859",
                background: "#fff",
                color: "#27a859",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + 시간표 생성하기
            </button>
          )}

          {!isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowSwapForm((v) => !v)}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "0.5px solid #f09500",
                  background: "#fff",
                  color: "#f09500",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showSwapForm ? `${DOMAIN.substitute} 요청 닫기` : `${DOMAIN.substitute} 요청하기`}
              </button>
              {showSwapForm && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "0.5px solid #e8e6e0",
                    padding: "16px 18px",
                  }}
                >
                  <CreateShiftSwapForm />
                </div>
              )}
            </>
          )}

          <Card title="실시간 변동 브리핑">
            {briefs.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "#b4b2a9" }}>
                {isAdmin ? "변동 내역이 없습니다." : "나와 관련된 변동이 없습니다."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {briefs.slice(0, 8).map((b) => (
                  <div key={b.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, color: "#888", flexShrink: 0, paddingTop: 2 }}>
                      {b.time}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: typeBg[b.type] || "#f1efe8",
                        color: typeColor[b.type] || "#888",
                        flexShrink: 0,
                      }}
                    >
                      {b.type}
                    </span>
                    <span style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>{b.text}</span>
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

const PANEL_BORDER = "#e8e6e0";
const TAB_INACTIVE_BG = "#f1efe8";

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
                borderTop: `0.5px solid ${PANEL_BORDER}`,
                borderLeft: `0.5px solid ${PANEL_BORDER}`,
                borderRight: `0.5px solid ${PANEL_BORDER}`,
                borderBottom: active ? "1px solid #fff" : `0.5px solid ${PANEL_BORDER}`,
                borderRadius: "10px 10px 0 0",
                background: active ? "#fff" : TAB_INACTIVE_BG,
                color: active ? "#2c2c2a" : "#888",
                fontWeight: active ? 700 : 500,
                fontSize: 15,
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
          background: "#fff",
          border: `0.5px solid ${PANEL_BORDER}`,
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
        background: "#fff",
        borderRadius: 12,
        border: "0.5px solid #e8e6e0",
        padding: "16px 18px",
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#2c2c2a" }}>{title}</p>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        border: "0.5px solid #e8e6e0",
        padding: "14px 18px",
      }}
    >
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color, letterSpacing: "-1px" }}>
        {value}
        <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3, color: "#888" }}>{unit}</span>
      </p>
    </div>
  );
}
