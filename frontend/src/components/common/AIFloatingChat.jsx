import { useState, useRef, useEffect } from "react";

export default function AIFloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "보결, 시간표, 제약 조건을 질문할 수 있습니다." }
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
        <div className="ai-assistant-panel" role="dialog" aria-label="AI 도우미">
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)",
          }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>AI 도우미</p>
            <button type="button" className="panel-close" onClick={() => setOpen(false)} aria-label="질문 닫기">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "82%", padding: "10px 14px", borderRadius: "var(--radius-lg)",
                  background: m.role === "user" ? "var(--color-primary-50)" : "var(--color-border-light)",
                  color: "var(--color-text)",
                  fontSize: "var(--font-body)", lineHeight: "22px", whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex" }}>
                <div style={{ background: "var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>답변 작성 중</span>
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
                  borderRadius: "var(--radius-md)",
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
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "none",
                background: input.trim() && !loading ? "var(--color-primary-500)" : "var(--color-border)",
                color: input.trim() && !loading ? "var(--color-surface)" : "var(--color-text-muted)", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                alignSelf: "flex-end",
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          className="ai-assistant-button"
          onClick={() => setOpen(true)}
          aria-label="AI 도우미 열기"
        >
          ✦ AI 도우미
        </button>
      )}
    </>
  );
}
