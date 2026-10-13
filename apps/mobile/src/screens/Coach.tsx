import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { apiRequest } from "../api.js";
import { ScreenHeader } from "../ui.js";

interface Message {
  role: "user" | "coach";
  text: string;
}

const PROMPTS = ["How was my eating this week?", "What should I train today?", "Am I eating enough protein?"];

export function Coach({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  async function send(message: string) {
    const content = message.trim();
    if (!content || busy) return;
    setMessages((items) => [...items, { role: "user", text: content }]);
    setText("");
    setBusy(true);
    try {
      const payload = await apiRequest<{ result?: { configured?: boolean; data?: { text?: string; message?: string } | string | null } }>({ token }, "/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: content })
      });
      const data = payload.result?.data;
      const reply = typeof data === "string" ? data : data?.text ?? data?.message;
      setMessages((items) => [...items, { role: "coach", text: reply ?? "I've reviewed your recent data, but I don't have a written answer yet." }]);
    } catch {
      setMessages((items) => [...items, { role: "coach", text: "The AI coach isn't available yet. Everything else in ORVIX works as normal, and your questions will be answered here once it's switched on." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen chat">
      <ScreenHeader eyebrow="Guidance" title="Coach" />
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-intro">
            <div className="empty-icon"><Sparkles size={24} /></div>
            <strong>Ask me anything about your plan</strong>
            <p>I look at your meals, workouts and weight to give personal suggestions.</p>
            <div className="suggestions center">
              {PROMPTS.map((prompt) => <button key={prompt} className="chip" onClick={() => void send(prompt)}>{prompt}</button>)}
            </div>
          </div>
        )}
        {messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.text}</div>)}
        {busy && <div className="bubble coach typing"><i /><i /><i /></div>}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={(event) => { event.preventDefault(); void send(text); }}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask your coach…" aria-label="Message" />
        <button className="icon-btn filled" type="submit" aria-label="Send" disabled={!text.trim() || busy}><Send size={18} /></button>
      </form>
    </div>
  );
}
