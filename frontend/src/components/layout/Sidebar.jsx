export default function Sidebar({ open, onClose, navigate, currentView, userRole, setUserRole }) {
  const adminItems = [
    { id: "home", label: "홈", icon: HomeIcon },
    { id: "schedule-create", label: "시간표 생성", icon: CalendarIcon },
    { id: "subject-manage", label: "과목·수업 관리", icon: BookIcon },
    { id: "history", label: "내역", icon: HistoryIcon },
    { id: "admin", label: "관리자 도구", icon: AdminIcon },
  ];

  const workerItems = [
    { id: "home", label: "홈", icon: HomeIcon },
    { id: "history", label: "내역", icon: HistoryIcon },
  ];

  const items = userRole === "admin" ? adminItems : workerItems;

  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
      background: "#fff", borderRight: "0.5px solid #e8e6e0",
      zIndex: 50, transform: open ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "20px 20px 12px", borderBottom: "0.5px solid #e8e6e0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#534ab7", letterSpacing: "-0.5px" }}>AlgoRhythm</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888" }}>지능형 시간표 관리 시스템</p>
      </div>

      <div style={{ padding: "8px 12px", borderBottom: "0.5px solid #e8e6e0" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["admin", "worker"].map(role => (
            <button
              key={role}
              onClick={() => setUserRole(role)}
              style={{
                flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 500,
                border: "0.5px solid", cursor: "pointer", borderRadius: 6,
                transition: "all 0.15s",
                background: userRole === role ? "#534ab7" : "transparent",
                borderColor: userRole === role ? "#534ab7" : "#d3d1c7",
                color: userRole === role ? "#fff" : "#5f5e5a",
              }}
            >
              {role === "admin" ? "관리자" : "일반"}
            </button>
          ))}
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
        {items.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none",
                cursor: "pointer", marginBottom: 2, textAlign: "left",
                background: active ? "#eeedfe" : "transparent",
                color: active ? "#534ab7" : "#444441",
                fontWeight: active ? 600 : 400, fontSize: 14,
                transition: "background 0.12s",
              }}
            >
              <Icon size={18} active={active} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "0.5px solid #e8e6e0" }}>
        <p style={{ fontSize: 11, color: "#b4b2a9", margin: 0 }}>2026 Team AlgoRhythm</p>
      </div>
    </aside>
  );
}

function HomeIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} fill="none" stroke={active ? "#534ab7" : "#888"} strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
    </svg>
  );
}
function CalendarIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} fill="none" stroke={active ? "#534ab7" : "#888"} strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function BookIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} fill="none" stroke={active ? "#534ab7" : "#888"} strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  );
}
function HistoryIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} fill="none" stroke={active ? "#534ab7" : "#888"} strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 105.96-7.95"/><polyline points="3 4 3 10 9 10"/>
    </svg>
  );
}
function AdminIcon({ size = 18, active }) {
  return (
    <svg width={size} height={size} fill="none" stroke={active ? "#534ab7" : "#888"} strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      <circle cx="18" cy="8" r="1.5" fill={active ? "#534ab7" : "#888"} stroke="none"/>
    </svg>
  );
}
