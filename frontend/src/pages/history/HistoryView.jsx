import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  useMySwapRequests,
  useSchoolUnavailabilities,
  useStoreStaffSummary,
  useSubstituteHistory,
} from "@/hooks";
import LoadError from "@/components/LoadError.jsx";
import SchoolClassPanel from "@/components/schedule/SchoolClassPanel.jsx";
import SchoolSettingPanel from "@/components/schedule/SchoolSettingPanel.jsx";
import {
  HISTORY_PAGE_SIZE,
  HISTORY_STATUSES,
  HISTORY_TYPES,
  countByType,
  countPending,
  emptyMonthMessage,
  filterHistory,
  formatGroupDate,
  formatMonthTitle,
  groupHistoryByDate,
  monthsWithData,
  recordsInMonth,
  substituteToHistoryRecord,
  swapToHistoryRecord,
} from "@/utils/historyList.js";

const typeColor = {
  보결: "var(--color-warning)",
  변경: "var(--color-info)",
  생성: "var(--color-success)",
  수정: "var(--color-text)",
  교환: "var(--color-text)",
};
const typeBg = {
  보결: "var(--color-warning-light)",
  변경: "var(--color-info-light)",
  생성: "var(--color-success-light)",
  수정: "var(--color-surface-hover)",
  교환: "var(--color-surface-hover)",
};

const STATUS_BADGE = {
  미처리: { color: "var(--color-danger)", background: "var(--color-danger-light)" },
  "대기 중": { color: "var(--color-warning)", background: "var(--color-warning-light)" },
  취소됨: { color: "var(--color-text-muted)", background: "var(--color-surface-hover)" },
};

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function HistoryDetail({ record, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" className="history-scrim" aria-label="상세 닫기" onClick={onClose} />
      <aside className="history-detail" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="history-detail-head">
          <span className="day-badge" style={{ background: typeBg[record.type], color: typeColor[record.type] }}>{record.type}</span>
          <button ref={closeRef} type="button" className="panel-close" onClick={onClose}>닫기</button>
        </div>
        <h2 id={titleId}>{record.title}</h2>
        {(record.before || record.after) ? (
          <p className="history-detail-change">
            {record.before ? <s>{record.before}</s> : null}
            {record.before && record.after ? <span> → </span> : null}
            {record.after ? <span>{record.after}</span> : null}
          </p>
        ) : null}
        <dl>
          {record.status ? (
            <div>
              <dt>상태</dt>
              <dd>{record.status}</dd>
            </div>
          ) : null}
          {record.actor ? (
            <div>
              <dt>관련</dt>
              <dd>{record.actor}</dd>
            </div>
          ) : null}
          {record.time ? (
            <div>
              <dt>등록</dt>
              <dd>{record.time}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </>
  );
}

export function HistoryView() {
  const historyQuery = useSubstituteHistory();
  const swapQuery = useMySwapRequests();
  const historyData = useMemo(() => {
    const substitutes = historyQuery.isError
      ? []
      : (historyQuery.data ?? []).map(substituteToHistoryRecord);
    const swaps = swapQuery.isError
      ? []
      : (swapQuery.data ?? []).map(swapToHistoryRecord);
    return [...substitutes, ...swaps].filter((record) => record.date);
  }, [historyQuery.data, historyQuery.isError, swapQuery.data, swapQuery.isError]);
  const listLoading = (historyQuery.isLoading && !historyQuery.data)
    || (swapQuery.isLoading && !swapQuery.data);
  const listError = historyQuery.isError && swapQuery.isError;
  const listPartialError = !listError && (historyQuery.isError || swapQuery.isError);
  const refetchList = () => {
    historyQuery.refetch();
    swapQuery.refetch();
  };
  const months = monthsWithData(historyData);
  const [monthChoice, setMonthChoice] = useState("");
  const month = months.includes(monthChoice) ? monthChoice : (months[0] ?? "");
  const [monthOpen, setMonthOpen] = useState(false);
  const [type, setType] = useState("전체");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState(null);
  const monthRef = useRef(null);

  const monthItems = recordsInMonth(historyData, month);
  const counts = countByType(monthItems);
  const pending = countPending(monthItems);
  const filtered = filterHistory(monthItems, { type, query, status });
  const visible = filtered.slice(0, visibleCount);
  const groups = groupHistoryByDate(visible);
  const selected = historyData.find((record) => record.id === selectedId) ?? null;
  const narrowed = type !== "전체" || query.trim() !== "" || status !== "";

  useEffect(() => {
    if (!monthOpen) return undefined;
    const onPointer = (event) => {
      if (monthRef.current && !monthRef.current.contains(event.target)) setMonthOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [monthOpen]);

  const resetFilters = () => {
    setType("전체");
    setQuery("");
    setStatus("");
    setVisibleCount(HISTORY_PAGE_SIZE);
  };

  const changeMonth = (next) => {
    setMonthChoice(next);
    setMonthOpen(false);
    setVisibleCount(HISTORY_PAGE_SIZE);
    setSelectedId(null);
  };

  const openRecord = (id) => setSelectedId(id);

  const renderRow = (record) => {
    const badge = STATUS_BADGE[record.status];
    return (
      <div
        key={record.id}
        className={`history-row${record.status === "미처리" ? " is-pending" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => openRecord(record.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openRecord(record.id);
          }
        }}
      >
        <span className="day-badge" style={{ background: typeBg[record.type], color: typeColor[record.type] }}>{record.type}</span>
        <div className="history-main">
          <div className="history-line1">
            <span className="history-title">{record.title}</span>
            {badge && (
              <span className="day-badge" style={{ color: badge.color, background: badge.background }}>{record.status}</span>
            )}
          </div>
          {(record.before || record.after || record.time) ? (
            <p className="history-line2">
              {record.before ? <s>{record.before}</s> : null}
              {record.before && record.after ? <span> → </span> : null}
              {record.after ? <span>{record.after}</span> : null}
              {record.time ? <span className="history-time-mobile"> · {record.time}</span> : null}
            </p>
          ) : null}
        </div>
        <div className="history-side">
          {(record.actor || record.time) ? (
            <span className="history-actor">{[record.actor, record.time].filter(Boolean).join(" · ")}</span>
          ) : null}
          {record.status === "미처리" && (
            <button
              type="button"
              className="history-link"
              onClick={(event) => {
                event.stopPropagation();
                openRecord(record.id);
              }}
            >
              처리하기
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="history-page">
      <h1 className="sr-only">내역</h1>
      <div className="history-head">
        <div className="history-month" ref={monthRef}>
          <button
            type="button"
            className="history-month-label"
            aria-expanded={monthOpen}
            aria-haspopup="listbox"
            onClick={() => setMonthOpen((open) => !open)}
          >
            {month ? formatMonthTitle(month) : "월 선택"} ▾
          </button>
          {monthOpen && (
            <div className="dropdown-panel dropdown-panel-top" role="listbox" aria-label="월 선택">
              {months.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={item === month}
                  className="menu-item"
                  onClick={() => changeMonth(item)}
                >
                  {formatMonthTitle(item)}
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="history-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder="교시·사유 검색"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(HISTORY_PAGE_SIZE);
            }}
          />
        </label>
      </div>

      <div className="history-summary">
        <p>
          변동 <strong>{listLoading || listError ? "—" : monthItems.length}</strong>
          {!(listLoading || listError) ? "건" : ""}
          <span aria-hidden="true"> · </span>
          {listLoading || listError ? (
            <span className="is-muted">미처리 —</span>
          ) : pending > 0 ? (
            <>미처리 <strong className="is-danger">{pending}</strong>건</>
          ) : (
            <span className="is-muted">미처리 없음</span>
          )}
        </p>
        {monthItems.length > 0 && (
          <div className="history-status" role="group" aria-label="상태">
            {HISTORY_STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={status === item}
                onClick={() => {
                  setStatus((current) => (current === item ? "" : item));
                  setVisibleCount(HISTORY_PAGE_SIZE);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {listLoading && <p className="history-empty">불러오는 중...</p>}
      {(listError || listPartialError) && (
        <LoadError onRetry={refetchList} />
      )}
      {!listLoading && !listError && historyData.length === 0 && (
        <p className="history-empty">변동 내역이 없습니다</p>
      )}

      {!listLoading && !listError && historyData.length > 0 && (monthItems.length === 0 ? (
        <p className="history-empty">{month ? emptyMonthMessage(month) : "변동 내역이 없습니다"}</p>
      ) : (
        <>
          <div className="history-tabs" role="tablist" aria-label="내역 종류">
            {HISTORY_TYPES.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={type === item}
                className={counts[item] === 0 ? "is-zero" : undefined}
                onClick={() => {
                  setType(item);
                  setVisibleCount(HISTORY_PAGE_SIZE);
                }}
              >
                {item}
                <span>{counts[item]}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="history-empty">
              조건에 맞는 내역이 없습니다
              {narrowed && (
                <button type="button" className="history-link" onClick={resetFilters}>필터 초기화</button>
              )}
            </p>
          ) : (
            <div className="history-list">
              {groups.flatMap((group) => [
                <h2 key={`${group.date}-day`} className="history-day">{formatGroupDate(group.date)}</h2>,
                ...group.items.map((record) => renderRow(record)),
              ])}
            </div>
          )}

          {filtered.length > visibleCount && (
            <button
              type="button"
              className="history-more"
              onClick={() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE)}
            >
              더 보기
            </button>
          )}
        </>
      ))}

      {selected && <HistoryDetail record={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

const STATUS_LABEL = { HIRED: "재직", ON_LEAVE: "휴직", RESIGNED: "퇴직" };
const STATUS_STYLE = {
  HIRED: { bg: "var(--color-success-light)", color: "var(--color-success)" },
  ON_LEAVE: { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  RESIGNED: { bg: "var(--color-surface-hover)", color: "var(--color-text-muted)" },
};
const ROLE_LABEL = { ADMIN: "관리자", TEACHER: "교사" };

export function AdminView({ navigate }) {
  const [tab, setTab] = useState("교사");
  const tabs = ["교사", "학급", "불가", "설정"];

  const {
    data: staffSummary,
    isLoading: staffLoading,
    isError: staffError,
  } = useStoreStaffSummary();
  const staffList = staffSummary?.staffList ?? [];
  const schoolUnavail = useSchoolUnavailabilities({ enabled: tab === "불가" });
  const DAY_LABEL = { MON: "월", TUE: "화", WED: "수", THU: "목", FRI: "금" };
  const memberName = (schoolUserId) => (
    staffList.find((item) => item.schoolUserId === schoolUserId)?.username
    || `구성원 ${schoolUserId ?? ""}`
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>관리자 도구</h1>
      </div>

      <div style={{
        background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)",
        padding: "20px 24px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>시간표 생성</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>새 학기 시간표를 만듭니다.</p>
        </div>
        <button
          onClick={() => navigate("schedule-create")}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "var(--color-primary-button)", color: "var(--color-on-primary)", fontSize: 14, fontWeight: 500, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          시간표 생성
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid var(--color-border)" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
            color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", fontWeight: tab === t ? 600 : 400,
            borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>

      {tab === "교사" && (
        <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
              구성원 목록{staffSummary ? ` · 총 ${staffSummary.totalStaffCount}명` : ""}
            </p>
            {staffSummary?.schoolName && (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{staffSummary.schoolName}</span>
            )}
          </div>

          {staffLoading && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>불러오는 중...</p>
          )}
          {staffError && (
            <LoadError />
          )}
          {!staffLoading && !staffError && staffList.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>등록된 구성원이 없습니다.</p>
          )}

          {!staffLoading && !staffError && staffList.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["이름", "역할", "재직상태", "담당 과목", "담임", "주간 시수"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => {
                  const st = STATUS_STYLE[s.employmentStatus] ?? { bg: "var(--color-border-light)", color: "var(--color-text-muted)" };
                  return (
                    <tr key={s.schoolUserId} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--color-text)" }}>{s.username}</td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{ROLE_LABEL[s.role] ?? s.role}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, background: st.bg, color: st.color }}>
                          {STATUS_LABEL[s.employmentStatus] ?? s.employmentStatus}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>
                        {s.subjects?.length ? s.subjects.map((item) => item.subjectName).join(", ") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>
                        {s.homeroomClasses?.length
                          ? s.homeroomClasses.map((item) => `${item.grade}-${item.classNumber}`).join(", ")
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {s.weeklyLessonCount ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "학급" && <SchoolClassPanel />}

      {tab === "불가" && (
        <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", padding: "20px 24px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
            학교 전체 근무 불가
          </p>
          {schoolUnavail.isLoading && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>불러오는 중...</p>
          )}
          {schoolUnavail.isError && (
            <LoadError onRetry={() => schoolUnavail.refetch()} />
          )}
          {!schoolUnavail.isLoading && !schoolUnavail.isError && (schoolUnavail.data?.length ?? 0) === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>등록된 근무 불가가 없습니다.</p>
          )}
          {!schoolUnavail.isLoading && !schoolUnavail.isError && (schoolUnavail.data?.length ?? 0) > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["교사", "요일", "교시", "사유"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schoolUnavail.data.map((item) => (
                  <tr key={item.id ?? `${item.schoolUserId}-${item.dayOfWeek}-${item.periodNumber}`} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{memberName(item.schoolUserId)}</td>
                    <td style={{ padding: "10px 12px" }}>{DAY_LABEL[item.dayOfWeek] || item.dayOfWeek}</td>
                    <td style={{ padding: "10px 12px" }}>{item.periodNumber}교시</td>
                    <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{item.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "설정" && <SchoolSettingPanel />}
    </div>
  );
}

// HistoryView is exported as named export above
// Default export for direct import
export default HistoryView;
