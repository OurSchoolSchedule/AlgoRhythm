import { useTodos, useNotifications, useSchoolTimetable, useSubstituteRequests } from "@/hooks";
import ScheduleTodoTab from "@/pages/schedule/ScheduleTodoTab.jsx";
import DayTimetableList from "@/components/schedule/DayTimetableList.jsx";
import LoadError from "@/components/LoadError.jsx";
import SectionHeader from "@/components/ui/SectionHeader.jsx";
import { toISODate } from "@/utils";
import { DOMAIN, localizeNotificationMessage, categoryLabel } from "@/constants/domainLabels.js";
import {
  filterBriefingNotifications,
  getNotificationAction,
} from "@/utils/notificationActions.js";
import { resolveHomeFocus } from "@/utils/homeFocus.js";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
/** 홈 미리보기: 넘치면 더보기로 해당 탭 이동 */
const HOME_PREVIEW = {
  timetable: 5,
  todos: 3,
  changes: 4,
};

function formatBriefTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return <div className="home-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

function homeStatTone(value, tone) {
  if (value == null || Number(value) === 0) return "is-zero";
  return `is-${tone}`;
}

function HomeStats({ lessons, substitutes, alerts, loading, failed }) {
  const items = [
    { label: "오늘 수업", value: lessons, tone: "primary" },
    { label: "이번 주 보결", value: substitutes, tone: "warning" },
    { label: "알림", value: alerts, tone: "info" },
  ];
  return (
    <div className="home-stats" aria-label="요약">
      {items.map((item) => (
        <div key={item.label} className="home-stat">
          <p className="home-stat-label">{item.label}</p>
          {loading ? (
            <SkeletonBlock width={36} height={28} />
          ) : (
            <p className={`home-stat-value ${failed ? "is-zero" : homeStatTone(item.value, item.tone)}`}>
              {failed ? "—" : item.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function HomeFocus({ focus, loading, failed }) {
  if (loading) return <SkeletonBlock width={160} height={44} />;
  if (failed || !focus) return <p className="home-focus-empty">—</p>;
  if (focus.kind === "empty-day") {
    return <p className="home-focus-empty">{focus.title}</p>;
  }
  return (
    <>
      <p className="home-focus-label">{focus.label}</p>
      <p className="home-focus-title">{focus.title}</p>
      <p className="home-focus-detail">{focus.detail}</p>
    </>
  );
}

export default function HomeView({ user, navigate }) {
  const position = user?.position || "TEACHER";
  const userRole = position === "ADMIN" ? "ADMIN" : "TEACHER";
  const now = new Date();
  const todayDateStr = toISODate(now);
  const weekdayLabel = WEEKDAY_LABELS[now.getDay()] || "";

  const { todos, loading: todosLoading, error: todoError, refetch: refetchTodos } = useTodos({
    role: userRole,
    date: todayDateStr,
  });
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useNotifications({ role: userRole });
  const {
    timetable,
    loading: timetableLoading,
    error: timetableError,
    refetch: refetchTimetable,
  } = useSchoolTimetable({ role: userRole });
  const { requests: substituteRequests } = useSubstituteRequests({ role: userRole });

  const openTodos = (todos || []).filter((t) => !t.done && !t.completed);
  const todayClassCount = (timetable?.periods || []).filter((p) => p.subject && p.subject !== "공강").length;
  const hasClass = todayClassCount > 0;
  const unreadCount = (notifications || []).filter((n) => !n.read).length;
  const substituteCount = (substituteRequests || []).filter((r) => {
    const status = String(r.status || "").toUpperCase();
    return status === "PENDING" || status === "REQUESTED" || status === "OPEN";
  }).length;
  // 보결·교환 등 확인 필요 건은 알림 사이드바로만 — 오늘 할 일에는 실제 할 일만
  const taskCount = openTodos.length;
  const summaryLoading = todosLoading || notificationsLoading || timetableLoading;
  const summaryFailed = Boolean(todoError || notificationsError || timetableError);
  const tasksLoading = todosLoading;
  const tasksFailed = Boolean(todoError);
  const pageError = todoError || notificationsError || timetableError;
  const retryPage = () => {
    if (todoError) refetchTodos();
    if (notificationsError) refetchNotifications();
    if (timetableError) refetchTimetable();
  };
  const focus = resolveHomeFocus(timetable, now);

  const briefs = filterBriefingNotifications(notifications || []).map((n) => {
    const action = getNotificationAction(n);
    return {
      key: `br-${n.id ?? n.createdAt}`,
      time: formatBriefTime(n.createdAt),
      type: action?.label || categoryLabel(n.category) || "변동",
      text: localizeNotificationMessage(n.message),
    };
  });
  const visibleBriefs = briefs.slice(0, HOME_PREVIEW.changes);
  const hiddenBriefs = Math.max(0, briefs.length - visibleBriefs.length);

  const typeBg = {
    [DOMAIN.SUBSTITUTE]: "var(--color-warning-subtle)",
    보결: "var(--color-warning-subtle)",
    [DOMAIN.SWAP]: "var(--color-info-subtle)",
    수업교환: "var(--color-info-subtle)",
    안내: "var(--color-surface-hover)",
  };
  const typeColor = {
    [DOMAIN.SUBSTITUTE]: "var(--color-warning-text)",
    보결: "var(--color-warning-text)",
    [DOMAIN.SWAP]: "var(--color-info-text)",
    수업교환: "var(--color-info-text)",
    안내: "var(--color-text-muted)",
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-main">
          <h1 className="home-title">
            {now.getMonth() + 1}월 {now.getDate()}일 ({weekdayLabel})
          </h1>
          {userRole === "ADMIN" && (
            <button type="button" className="btn btn-secondary btn-sm home-create-btn" onClick={() => navigate("timetable-create")}>
              시간표 생성
            </button>
          )}
        </div>
        <div className="home-hero-focus" aria-label="지금 수업">
          <HomeFocus focus={focus} loading={timetableLoading} failed={Boolean(timetableError)} />
        </div>
      </div>

      {pageError && <LoadError onRetry={retryPage} />}

      <HomeStats
        lessons={todayClassCount}
        substitutes={substituteCount}
        alerts={unreadCount}
        loading={summaryLoading}
        failed={summaryFailed}
      />

      <div className="home-columns">
        <section className="home-timetable">
          <SectionHeader
            title="오늘 시간표"
            meta={!timetableLoading && !timetableError ? (hasClass ? todayClassCount : 0) : "—"}
            onAction={() => navigate("timetable")}
          />
          {timetableLoading && (
            <div className="home-skeleton-list" aria-hidden="true">
              <SkeletonBlock width="100%" height={64} />
              <SkeletonBlock width="100%" height={64} />
              <SkeletonBlock width="100%" height={64} />
            </div>
          )}
          {!timetableLoading && timetableError && (
            <div className="home-skeleton-list" aria-hidden="true">
              <SkeletonBlock width="100%" height={64} />
              <SkeletonBlock width="100%" height={64} />
            </div>
          )}
          {!timetableLoading && !timetableError && !hasClass && (
            <p className="home-empty">오늘({weekdayLabel})은 수업이 없는 날입니다</p>
          )}
          {!timetableLoading && !timetableError && hasClass && (
            <DayTimetableList
              timetable={timetable}
              now={now}
              limit={HOME_PREVIEW.timetable}
              onMore={() => navigate("timetable")}
            />
          )}
        </section>

        <div className="home-side">
          <section className="home-tasks">
            <SectionHeader
              title="오늘 할 일"
              meta={!tasksLoading && !tasksFailed ? taskCount : "—"}
              onAction={() => navigate("todos")}
              actionLabel="전체 보기"
            />
            <div className="home-task-summary" aria-label="처리할 일">
              <div className="home-stat">
                <p className="home-stat-label">처리할 일</p>
                {tasksLoading ? (
                  <SkeletonBlock width={36} height={28} />
                ) : (
                  <p className={`home-stat-value ${tasksFailed ? "is-zero" : homeStatTone(taskCount, "warning")}`}>
                    {tasksFailed ? "—" : taskCount}
                  </p>
                )}
              </div>
            </div>
            {(tasksLoading || tasksFailed) && (
              <div className="home-skeleton-list" aria-hidden="true">
                <SkeletonBlock width="100%" height={64} />
              </div>
            )}
            {!tasksLoading && !tasksFailed && (
              <ScheduleTodoTab
                embedded
                date={todayDateStr}
                userRole={userRole}
                limit={HOME_PREVIEW.todos}
                onMore={() => navigate("todos")}
              />
            )}
          </section>

          <section className="home-changes">
            <SectionHeader
              title="오늘 변동"
              meta={!notificationsLoading && !notificationsError ? briefs.length : "—"}
              onAction={() => navigate("history")}
              actionLabel="전체 보기"
            />
            {notificationsLoading && (
              <div className="home-skeleton-list" aria-hidden="true">
                <SkeletonBlock width="100%" height={44} />
              </div>
            )}
            {!notificationsLoading && notificationsError && (
              <div className="home-skeleton-list" aria-hidden="true">
                <SkeletonBlock width="100%" height={44} />
              </div>
            )}
            {!notificationsLoading && !notificationsError && briefs.length === 0 && (
              <p className="home-empty">오늘 변동이 없습니다</p>
            )}
            {!notificationsError &&
              visibleBriefs.map((item) => (
                <div key={item.key} className="home-row home-change list-row">
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
            {hiddenBriefs > 0 && (
              <button type="button" className="home-more" onClick={() => navigate("history")}>
                더보기 {hiddenBriefs}건
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
