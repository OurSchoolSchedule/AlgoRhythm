import { useMemo } from "react";
import { useTodos, useToggleTodo, useNotifications, useSchoolTimetable } from "@/hooks";
import DayTimetableList from "@/components/schedule/DayTimetableList.jsx";
import NotificationActionButtons from "@/components/schedule/NotificationActionButtons.jsx";
import { getAccessToken } from "@/api";
import { toISODate } from "@/utils";
import { getTimetableErrorMessage } from "@/utils/timetableErrors.js";
import { DOMAIN, localizeNotificationMessage, categoryLabel } from "@/constants/domainLabels.js";
import {
  filterActionableNotifications,
  filterBriefingNotifications,
  filterTeacherBriefingNotifications,
} from "@/utils/notificationActions.js";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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

const typeColor = {
  보결: "var(--color-warning)",
  변경: "var(--color-info)",
  완료: "var(--color-success)",
  안내: "var(--color-text-subtle)",
  "추가 근무": "var(--color-info)",
};
const typeBg = {
  보결: "var(--color-warning-light)",
  변경: "var(--color-info-light)",
  완료: "var(--color-success-light)",
  안내: "var(--color-border-light)",
  "추가 근무": "var(--color-info-light)",
};

function sectionTitleStyle() {
  return {
    margin: "0 0 12px",
    fontSize: "var(--font-heading)",
    fontWeight: 600,
    color: "var(--color-text)",
  };
}

/**
 * @param {Object} props
 * @param {(view: string) => void} props.navigate
 * @param {'admin'|'worker'} props.userRole 화면 구성용 (권한과 무관)
 */
export default function HomeView({ navigate, userRole = "admin" }) {
  const isAdmin = userRole === "admin";
  const position = isAdmin ? "ADMIN" : "TEACHER";
  const {
    timetable,
    isLoading: timetableLoading,
    isError: timetableError,
    error: timetableErr,
  } = useSchoolTimetable();
  const now = new Date();
  const weekdayLabel = WEEKDAY_LABELS[now.getDay()];
  const isWeekend = !timetable.todayKey;
  const displayDate = now.toLocaleDateString("ko-KR", {
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
  const actionable = useMemo(
    () => filterActionableNotifications(notifications, position),
    [notifications, position],
  );

  const todayDateStr = toISODate();
  const { data: todoData, isLoading: todoLoading, isError: todoError } = useTodos(todayDateStr);
  const toggleTodo = useToggleTodo();
  const todoItems = todoData
    ? [...todoData.storeTodos, ...todoData.handoverTodos, ...todoData.personalTodos]
    : [];

  const previewOnly = !getAccessToken();
  const todayClassCount = timetable.todayClassCount;
  const hasClass = todayClassCount > 0;
  const substituteCount = isAdmin
    ? notifications.filter((n) => n.category === "SUBSTITUTE").length
    : 0;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const showTimetableError = timetableError && !previewOnly;
  const showEmptyNote = !timetableLoading && !showTimetableError && !hasClass;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "var(--font-display)", fontWeight: 700, color: "var(--color-text)" }}>
            오늘
          </h1>
          <p style={{ margin: 0, fontSize: "var(--font-caption)", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {displayDate}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate("schedule-create")}
            className="home-create-button"
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary-500)",
              color: "var(--color-surface)",
              fontSize: "var(--font-body)",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            시간표 생성
          </button>
        )}
      </div>

      <p style={{ margin: "0 0 32px", fontSize: "var(--font-body)", color: "var(--color-text-secondary)" }}>
        오늘 수업{" "}
        <span style={{ fontWeight: 600, color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
          {todayClassCount}
        </span>
        교시 · {isAdmin ? `이번 주 ${DOMAIN.substitute}` : "미확인 알림"}{" "}
        <span style={{ fontWeight: 600, color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
          {isAdmin ? substituteCount : unreadCount}
        </span>
        건
      </p>

      <div className="home-columns">
        <section className="home-timetable">
          <h2 style={sectionTitleStyle()}>오늘 시간표</h2>
          {timetableLoading && (
            <p style={{ margin: "0 0 12px", fontSize: "var(--font-caption)", color: "var(--color-text-muted)" }}>
              시간표 불러오는 중
            </p>
          )}
          {showTimetableError && (
            <p style={{ margin: "0 0 12px", fontSize: "var(--font-caption)", color: "var(--color-danger)" }}>
              {getTimetableErrorMessage(timetableErr)}
            </p>
          )}
          {showEmptyNote && isWeekend && (
            <p style={{ margin: "0 0 12px", fontSize: "var(--font-caption)", color: "var(--color-text-muted)" }}>
              오늘({weekdayLabel})은 수업이 없는 날입니다
            </p>
          )}
          {showEmptyNote && !isWeekend && (
            <p style={{ margin: "0 0 12px", fontSize: "var(--font-caption)", color: "var(--color-text-muted)" }}>
              오늘 등록된 수업이 없습니다
              {isAdmin && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => navigate("schedule-create")}
                    style={{
                      padding: 0,
                      border: "none",
                      background: "none",
                      color: "var(--color-primary-500)",
                      fontSize: "var(--font-caption)",
                      fontWeight: 600,
                    }}
                  >
                    시간표 생성
                  </button>
                </>
              )}
            </p>
          )}
          <DayTimetableList timetable={timetable} />
        </section>

        <div className="home-side">
          <section className="home-tasks">
            <h2 style={sectionTitleStyle()}>처리할 일</h2>
            {todoLoading && (
              <p style={{ margin: 0, fontSize: "var(--font-caption)", color: "var(--color-text-muted)" }}>불러오는 중</p>
            )}
            {todoError && (
              <p style={{ margin: 0, fontSize: "var(--font-caption)", color: "var(--color-danger)" }}>
                할 일을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.
              </p>
            )}
            {!todoLoading && !todoError && actionable.length === 0 && todoItems.length === 0 && (
              <p style={{ margin: 0, fontSize: "var(--font-caption)", color: "var(--color-text-muted)" }}>
                {isAdmin ? "승인할 대타 요청이 없습니다." : "수락할 대타 요청이 없습니다."}
              </p>
            )}
            {actionable.map((item) => (
              <div
                key={item.id ?? item.createdAt}
                className="home-row"
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid var(--color-border-light)",
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--font-body)", color: "var(--color-text)", lineHeight: "22px" }}>
                  {localizeNotificationMessage(item.message)}
                </p>
                <NotificationActionButtons notification={item} position={position} />
              </div>
            ))}
            {todoItems.map((todo) => (
              <label
                key={todo.id}
                className="home-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--color-border-light)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(todo.completed)}
                  disabled={toggleTodo.isPending}
                  onChange={() => toggleTodo.mutate(todo.id)}
                  style={{ accentColor: "var(--color-primary-500)", width: 16, height: 16 }}
                />
                <span
                  style={{
                    fontSize: "var(--font-body)",
                    color: todo.completed ? "var(--color-text-muted)" : "var(--color-text)",
                    textDecoration: todo.completed ? "line-through" : "none",
                  }}
                >
                  {todo.content}
                </span>
              </label>
            ))}
          </section>

          <section className="home-changes">
            <h2 style={sectionTitleStyle()}>오늘 변동</h2>
            {briefs.length === 0 ? (
              <p style={{ margin: 0, fontSize: "var(--font-caption)", color: "var(--color-text-muted)" }}>
                {isAdmin
                  ? "오늘 변동이 없습니다. 보결이나 변경이 생기면 여기에 표시됩니다."
                  : "오늘 변동이 없습니다. 내 수업과 관련된 변경이 생기면 여기에 표시됩니다."}
              </p>
            ) : (
              briefs.slice(0, 8).map((item) => (
                <div
                  key={item.key}
                  className="home-row"
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-micro)",
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                      paddingTop: 2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.time}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-micro)",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: typeBg[item.type] || "var(--color-border-light)",
                      color: typeColor[item.type] || "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {item.type}
                  </span>
                  <span style={{ fontSize: "var(--font-micro)", color: "var(--color-text-secondary)", lineHeight: "18px" }}>
                    {item.text}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
