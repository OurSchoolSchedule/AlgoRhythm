import { useTodos, useNotifications, useSchoolTimetable, useSubstituteRequests } from "@/hooks";
import ScheduleTodoTab from "@/pages/schedule/ScheduleTodoTab.jsx";
import DayTimetableList from "@/components/schedule/DayTimetableList.jsx";
import NotificationActionButtons from "@/components/schedule/NotificationActionButtons.jsx";
import SubstituteRequestList from "@/components/schedule/SubstituteRequestList.jsx";
import LoadError from "@/components/LoadError.jsx";
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
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return <div className="home-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

function SectionHeader({ title, count, countReady = true, onViewAll }) {
  return (
    <div className="home-section-head">
      <div className="home-section-title-wrap">
        <h2 className="home-section-title">{title}</h2>
        <span className="home-section-count">{countReady ? count : "—"}</span>
      </div>
      {onViewAll && (
        <button type="button" className="home-text-button" onClick={onViewAll}>
          전체 보기
        </button>
      )}
    </div>
  );
}

function HomeStats({ lessons, substitutes, alerts, loading, failed }) {
  const items = [
    { label: "오늘 수업", value: lessons },
    { label: "이번 주 보결", value: substitutes },
    { label: "알림", value: alerts },
  ];
  return (
    <div className="home-stats" aria-label="요약">
      {items.map((item) => (
        <div key={item.label} className="home-stat">
          <p className="home-stat-label">{item.label}</p>
          {loading ? (
            <SkeletonBlock width={36} height={28} />
          ) : (
            <p className="home-stat-value">{failed ? "—" : item.value}</p>
          )}
        </div>
      ))}
    </div>
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
  const actionable = filterActionableNotifications(notifications || []);
  const briefing = filterBriefingNotifications(notifications || []);
  const teacherBriefing = filterTeacherBriefingNotifications(notifications || []);
  const todayClassCount = (timetable?.periods || []).filter((p) => p.subject && p.subject !== "공강").length;
  const hasClass = todayClassCount > 0;
  const unreadCount = (notifications || []).filter((n) => !n.read).length;
  const substituteCount = (substituteRequests || []).filter((r) => {
    const status = String(r.status || "").toUpperCase();
    return status === "PENDING" || status === "REQUESTED" || status === "OPEN";
  }).length;
  const taskCount = openTodos.length + actionable.length;
  const summaryLoading = todosLoading || notificationsLoading || timetableLoading;
  const summaryFailed = Boolean(todoError || notificationsError || timetableError);
  const pageError = todoError || notificationsError || timetableError;
  const retryPage = () => {
    if (todoError) refetchTodos();
    if (notificationsError) refetchNotifications();
    if (timetableError) refetchTimetable();
  };
  const focus = resolveHomeFocus(timetable, now);

  const briefs = [
    ...teacherBriefing.map((n) => ({
      key: `tb-${n.id ?? n.createdAt}`,
      time: formatBriefTime(n.createdAt),
      type: categoryLabel(n.category) || "안내",
      text: localizeNotificationMessage(n.message),
    })),
    ...briefing.map((n) => {
      const action = getNotificationAction(n);
      return {
        key: `br-${n.id ?? n.createdAt}`,
        time: formatBriefTime(n.createdAt),
        type: action?.label || categoryLabel(n.category) || "변동",
        text: localizeNotificationMessage(n.message),
      };
    }),
  ];

  const typeBg = {
    [DOMAIN.SUBSTITUTE]: "var(--color-warning-soft)",
    보결: "var(--color-warning-soft)",
    [DOMAIN.SWAP]: "var(--color-info-soft)",
    수업교환: "var(--color-info-soft)",
    안내: "var(--color-surface-hover)",
  };
  const typeColor = {
    [DOMAIN.SUBSTITUTE]: "var(--color-warning)",
    보결: "var(--color-warning)",
    [DOMAIN.SWAP]: "var(--color-info)",
    수업교환: "var(--color-info)",
    안내: "var(--color-text-muted)",
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-copy">
          <h1 className="home-title">
            {now.getMonth() + 1}월 {now.getDate()}일 ({weekdayLabel})
          </h1>
          <div className="home-hero-work">
            {summaryLoading ? (
              <SkeletonBlock width={220} height={28} />
            ) : summaryFailed ? (
              <p className="home-work-line">—</p>
            ) : taskCount > 0 ? (
              <p className="home-work-line">
                처리할 일 <strong>{taskCount}</strong>건
              </p>
            ) : (
              <p className="home-work-line home-work-line-muted">처리할 일이 없습니다</p>
            )}
            {userRole === "ADMIN" && (
              <button type="button" className="btn btn-secondary btn-sm home-create-btn" onClick={() => navigate("timetable-create")}>
                시간표 생성
              </button>
            )}
          </div>
          <div className="home-hero-focus home-hero-focus-mobile-only" aria-label="지금 수업">
            {timetableLoading ? (
              <SkeletonBlock width="100%" height={72} />
            ) : timetableError || !focus ? (
              <p className="home-focus-empty">—</p>
            ) : focus.kind === "empty-day" ? (
              <p className="home-focus-empty">{focus.title}</p>
            ) : (
              <>
                <p className="home-focus-label">{focus.label}</p>
                <p className="home-focus-title">{focus.title}</p>
                <p className="home-focus-detail">{focus.detail}</p>
              </>
            )}
          </div>
        </div>
        <div className="home-hero-focus home-hero-focus-desktop-only" aria-label="지금 수업">
          {timetableLoading ? (
            <SkeletonBlock width="100%" height={72} />
          ) : timetableError || !focus ? (
            <p className="home-focus-empty">—</p>
          ) : focus.kind === "empty-day" ? (
            <p className="home-focus-empty">{focus.title}</p>
          ) : (
            <>
              <p className="home-focus-label">{focus.label}</p>
              <p className="home-focus-title">{focus.title}</p>
              <p className="home-focus-detail">{focus.detail}</p>
            </>
          )}
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
            count={hasClass ? todayClassCount : 0}
            countReady={!timetableLoading && !timetableError}
            onViewAll={() => navigate("timetable")}
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
            <DayTimetableList timetable={timetable} now={now} />
          )}
        </section>

        <div className="home-side">
          <section className="home-tasks">
            <SectionHeader
              title="오늘 할 일"
              count={taskCount}
              countReady={!todosLoading && !notificationsLoading && !todoError && !notificationsError}
              onViewAll={() => navigate("todos")}
            />
            {(todosLoading || notificationsLoading || todoError || notificationsError) && (
              <div className="home-skeleton-list" aria-hidden="true">
                <SkeletonBlock width="100%" height={64} />
              </div>
            )}
            {!todosLoading && !notificationsLoading && !todoError && !notificationsError && (
              <>
                <SubstituteRequestList position={position} notifications={notifications} />
                {actionable.slice(0, 3).map((item) => (
                  <div key={item.id ?? item.createdAt} className="home-row">
                    <p className="home-item-title">{localizeNotificationMessage(item.message)}</p>
                    {formatBriefTime(item.createdAt) && (
                      <p className="home-item-meta">{formatBriefTime(item.createdAt)}</p>
                    )}
                    <NotificationActionButtons notification={item} position={position} />
                  </div>
                ))}
                <ScheduleTodoTab embedded date={todayDateStr} userRole={userRole} />
              </>
            )}
          </section>

          <section className="home-changes">
            <SectionHeader
              title="오늘 변동"
              count={briefs.length}
              countReady={!notificationsLoading && !notificationsError}
              onViewAll={() => navigate("history")}
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
              briefs.slice(0, 8).map((item) => (
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
