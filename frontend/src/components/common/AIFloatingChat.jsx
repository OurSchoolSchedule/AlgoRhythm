import { useState, useRef, useEffect } from "react";

export default function AIFloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕하세요! 시간표 관리 AI 어시스턴트입니다.\n보결 처리, 시간표 최적화, 제약 조건 설정 등 무엇이든 도와드릴게요." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "당신은 학교 시간표 관리 AI 어시스턴트입니다. AlgoRhythm이라는 시스템에 내장되어 있으며, 교사 시간표 생성, 보결 처리, 수업 배정 최적화, 제약 조건 설정 등에 대해 친절하고 간결하게 도움을 드립니다. 항상 한국어로 답변하세요. 답변은 3-5문장 이내로 간결하게 유지하세요.",
          messages: messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).concat([{ role: "user", content: userMsg }]),
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "죄송합니다, 잠시 후 다시 시도해 주세요.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "연결에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 24, width: 400, height: 600,
          background: "var(--color-surface)", borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column",
          zIndex: 20, overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 18px", borderBottom: "0.5px solid #e8e6e0",
            display: "flex", alignItems: "center", gap: 10, background: "#27a859",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>✦</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff" }}>AI 어시스턴트</p>
              <p style={{ margin: 0, fontSize: "var(--font-micro)", lineHeight: "16px", color: "rgba(255,255,255,0.7)" }}>AlgoRhythm 시간표 AI</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "82%", padding: "10px 14px", borderRadius: "var(--radius-lg)",
                  background: m.role === "user" ? "var(--color-primary-500)" : "var(--color-border-light)",
                  color: m.role === "user" ? "var(--color-surface)" : "var(--color-text)",
                  fontSize: "var(--font-body)", lineHeight: "22px", whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex" }}>
                <div style={{ background: "#f1efe8", borderRadius: 10, borderBottomLeftRadius: 2, padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 0.15, 0.3].map((d, i) => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#27a859",
                        animation: "pulse 1s ease-in-out infinite",
                        animationDelay: `${d}s`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 12px 0" }}>
            {["내일 3교시 보결 처리", "이번 주 공강 알려줘", "시간표 충돌 확인해줘"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                style={{
                  border: "1px solid var(--color-border-input)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--radius-full)",
                  padding: "4px 10px",
                  fontSize: "var(--font-micro)",
                  lineHeight: "16px",
                  cursor: "pointer",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--color-border)", display: "flex", gap: 8 }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
              rows={1}
              style={{
                flex: 1, resize: "none", border: "0.5px solid #d3d1c7", borderRadius: 8,
                padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "none",
                background: input.trim() && !loading ? "#27a859" : "#e8e6e0",
                color: "#fff", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                alignSelf: "flex-end",
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: "var(--radius-full)",
          background: "var(--color-primary-500)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-md)", zIndex: 20,
          transition: "transform 0.18s, box-shadow 0.18s",
          color: "#fff", fontSize: 20,
        }}
        title="AI 어시스턴트"
      >
        {open ? "×" : "✦"}
      </button>

      <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </>
  );
}
