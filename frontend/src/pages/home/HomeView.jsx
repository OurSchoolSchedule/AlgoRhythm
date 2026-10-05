import { useTodos, useNotifications, useSchoolTimetable, useSubstituteRequests } from "@/hooks";
import ScheduleTodoTab from "@/pages/schedule/ScheduleTodoTab.jsx";
import DayTimetableList from "@/components/schedule/DayTimetableList.jsx";
import NotificationActionButtons from "@/components/schedule/NotificationActionButtons.jsx";
import SubstituteRequestList from "@/components/schedule/SubstituteRequestList.jsx";
import { toISODate } from "@/utils";
import { DOMAIN, localizeNotificationMessage, categoryLabel } from "@/constants/domainLabels.js";
import {
  filterActionableNotifications,
  filterBriefingNotifications,
  filterTeacherBriefingNotifications,
  getNotificationAction,
} from "@/utils/notificationActions.js";
import { resolveHomeFocus } from "@/utils/homeFocus.js";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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

  return source.map((n) => ({
    time: formatBriefTime(n.createdAt),
    type: briefingTypeFromCategory(n.category),
    text: localizeNotificationMessage(n.message),
    key: n.id ?? n.createdAt,
  }));
}

function adminWorkCounts(notifications) {
  const approve = (notifications ?? []).filter(
    (item) => getNotificationAction(item, "ADMIN")?.kind === "shift-swap-approve",
  ).length;
  const change = (notifications ?? []).filter((item) => item.category === "SCHEDULE_INPUT").length;
  return { approve, change, total: approve + change };
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
  안내: "var(--color-surface-hover)",
  "추가 근무": "var(--color-info-light)",
};

function SectionHeader({ title, count, onViewAll }) {
  return (
    <div className="home-section-head">
      <h2>
        {title}
        {count > 0 && <span className="home-accent">{count}</span>}
      </h2>
      <button type="button" className="home-text-button" onClick={onViewAll}>
        전체 보기 ›
      </button>
    </div>
  );
}

function LoadError({ onRetry }) {
  return (
    <div className="home-load-error">
      <span className="home-error-mark" aria-hidden="true">!</span>
      <span>불러오지 못했어요</span>
      <button type="button" className="home-text-button home-accent" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}

function SkeletonBlock({ width, height }) {
  return <span className="home-skeleton" style={{ width, height }} />;
}

function HomeStats({ lessons, substitutes, alerts, loading }) {
  const items = [
    ["오늘 수업", lessons, "교시"],
    [`이번 주 ${DOMAIN.substitute}`, substitutes, "건"],
    ["알림", alerts, "건"],
  ];
  return (
    <div className="home-stats">
      {items.map(([label, value, unit], index) => (
        <div key={label} className="home-stat-cell">
          {index > 0 && <span className="home-stat-rule" aria-hidden="true" />}
          <div className="home-stat">
            <div className="home-stat-label">{label}</div>
            {loading ? (
              <SkeletonBlock width={48} height={20} />
            ) : (
              <div className="home-stat-value-row">
                <span className="home-stat-value">{value}</span>
                <span className="home-stat-unit">{unit}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
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
    refetch: refetchTimetable,
  } = useSchoolTimetable();
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useNotifications();
  const now = new Date();
  const weekdayLabel = WEEKDAY_LABELS[now.getDay()];
  const displayDate = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const briefs = buildBriefingItems(notifications, isAdmin);
  const actionable = filterActionableNotifications(notifications, position);
  const work = adminWorkCounts(notifications);

  const todayDateStr = toISODate();
  const {
    data: todoData,
    isError: todoError,
  } = useTodos(todayDateStr);
  const todoItems = todoData
    ? [...todoData.schoolTodos, ...todoData.handoverTodos, ...todoData.personalTodos]
    : [];

  const todayClassCount = timetable.todayClassCount;
  const hasClass = todayClassCount > 0;
  const substituteCount = notifications.filter((n) => n.category === "SUBSTITUTE").length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const openSubstitutes = useSubstituteRequests("OPEN");
  const openSubstituteCount = openSubstitutes.data?.length ?? 0;
  const focus = resolveHomeFocus(timetable, now);
  const taskCount = actionable.length + todoItems.length + openSubstituteCount;
  const summaryLoading = timetableLoading || notificationsLoading;

  return (
    <div>
      <div className="home-title-row">
        <h1>{displayDate}</h1>
        {isAdmin && (
          <div className="home-title-side">
            <button
              type="button"
              onClick={() => navigate("schedule-create")}
              className="home-create-button"
            >
              시간표 생성
            </button>
          </div>
        )}
      </div>

      {isAdmin ? (
        notificationsLoading ? (
          <div className="home-hero" aria-hidden="true">
            <SkeletonBlock width={180} height={20} />
            <SkeletonBlock width={140} height={14} />
          </div>
        ) : notificationsError ? null : (
          <div className="home-hero">
            <p className="home-hero-title">
              {work.total > 0 ? `처리할 일 ${work.total}건` : "처리할 일이 없습니다"}
            </p>
            {work.total > 0 && (
              <p className="home-hero-detail">
                {`승인 대기 ${work.approve} · 변경 요청 ${work.change}`}
              </p>
            )}
          </div>
        )
      ) : timetableLoading ? (
        <div className="home-hero" aria-hidden="true">
          <SkeletonBlock width={48} height={12} />
          <SkeletonBlock width={220} height={20} />
          <SkeletonBlock width={160} height={14} />
        </div>
      ) : timetableError ? null : (
        <div className="home-hero">
          <p className="home-hero-label">{focus.label}</p>
          <p className="home-hero-title">{focus.headline}</p>
          {focus.detail && <p className="home-hero-detail">{focus.detail}</p>}
        </div>
      )}

      <HomeStats
        lessons={todayClassCount}
        substitutes={substituteCount}
        alerts={unreadCount}
        loading={summaryLoading}
      />

      <div className="home-columns">
        <section className="home-timetable">
          <SectionHeader title="오늘 시간표" count={hasClass ? todayClassCount : 0} onViewAll={() => navigate("timetable")} />
          {timetableLoading && (
            <div className="home-skeleton-list" aria-hidden="true">
              <SkeletonBlock width="100%" height={64} />
              <SkeletonBlock width="100%" height={64} />
              <SkeletonBlock width="100%" height={64} />
            </div>
          )}
          {!timetableLoading && timetableError && (
            <LoadError onRetry={() => refetchTimetable()} />
          )}
          {!timetableLoading && !timetableError && !hasClass && (
            <p className="home-empty">오늘({weekdayLabel})은 수업이 없는 날입니다</p>
          )}
          {!timetableLoading && !timetableError && hasClass && (
            <DayTimetableList timetable={timetable} now={now} />
          )}
        </section>

        <div className="home-side">
          <section className="home-tasks">
            <SectionHeader title="오늘 할 일" count={todoError ? 0 : taskCount} onViewAll={() => navigate("todos")} />
            {notificationsLoading && (
              <div className="home-skeleton-list" aria-hidden="true">
                <SkeletonBlock width="100%" height={64} />
              </div>
            )}
            <SubstituteRequestList position={position} notifications={notifications} />
            {actionable.map((item) => (
              <div key={item.id ?? item.createdAt} className="home-row">
                <p className="home-item-title">{localizeNotificationMessage(item.message)}</p>
                {formatBriefTime(item.createdAt) && (
                  <p className="home-item-meta">{formatBriefTime(item.createdAt)}</p>
                )}
                <NotificationActionButtons notification={item} position={position} />
              </div>
            ))}
            <ScheduleTodoTab date={todayDateStr} userRole={userRole} />
          </section>

          <section className="home-changes">
            <SectionHeader title="오늘 변동" count={briefs.length} onViewAll={() => navigate("history")} />
            {notificationsLoading && (
              <div className="home-skeleton-list" aria-hidden="true">
                <SkeletonBlock width="100%" height={44} />
              </div>
            )}
            {!notificationsLoading && notificationsError && (
              <LoadError onRetry={() => refetchNotifications()} />
            )}
            {!notificationsLoading && !notificationsError && briefs.length === 0 && (
              <p className="home-empty">오늘 변동이 없습니다</p>
            )}
            {!notificationsError && briefs.slice(0, 8).map((item) => (
              <div key={item.key} className="home-row home-change">
                <span className="home-change-time">{item.time}</span>
                <span
                  className="day-badge"
                  style={{
                    background: typeBg[item.type] || "var(--color-surface-hover)",
                    color: typeColor[item.type] || "var(--color-text-muted)",
                  }}
                >
                  {item.type}
                </span>
                <span className="home-change-text">{item.text}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
