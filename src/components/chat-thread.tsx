import { useEffect, useRef, useState } from "react";
import { Send, CheckCheck } from "lucide-react";

export type ChatMsg = {
  id: string;
  sender: string; // "user" | "support"
  body: string;
  created_at: string;
};

export type ChatParty = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: "user" | "support";
};

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function Avatar({ party, size = 32 }: { party: ChatParty; size?: number }) {
  const style = { width: size, height: size } as React.CSSProperties;
  const bg = party.role === "support" ? "bg-emerald-500 text-white" : "bg-neutral-900 text-white";
  if (party.avatarUrl) {
    return <img src={party.avatarUrl} alt="" style={style} className="object-cover shrink-0" />;
  }
  return (
    <div
      style={style}
      className={`${bg} grid place-items-center text-[11px] font-semibold shrink-0`}
    >
      {initials(party.name, party.email)}
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatDay(d: Date) {
  const today = new Date();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Live-chat style thread. No hard box borders — soft surface, avatars,
 * grouped bubbles, day separators. `viewerRole` decides which side each
 * message renders on (viewer's own messages go right).
 */
export function ChatThread({
  messages,
  viewerRole,
  user,
  support,
  disabled,
  placeholder,
  sending,
  onSend,
  header,
  headerActions,
  emptyLabel,
}: {
  messages: ChatMsg[];
  viewerRole: "user" | "support";
  user: ChatParty;
  support: ChatParty;
  disabled?: boolean;
  placeholder?: string;
  sending?: boolean;
  onSend: (body: string) => void;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  emptyLabel?: string;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const v = text.trim();
    if (!v || disabled) return;
    onSend(v);
    setText("");
  };

  let lastDayKey = "";
  let lastSender = "";

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-background border-b border-border/60">
        <div className="min-w-0">{header}</div>
        <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
      </div>

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            {emptyLabel ?? "Start the conversation."}
          </div>
        )}
        {messages.map((m, idx) => {
          const d = new Date(m.created_at);
          const dayKey = d.toDateString();
          const showDay = dayKey !== lastDayKey;
          lastDayKey = dayKey;
          const mine = m.sender === viewerRole;
          const party = m.sender === "support" ? support : user;
          const grouped = m.sender === lastSender && !showDay;
          lastSender = m.sender;
          const nextSameSender = messages[idx + 1]?.sender === m.sender;

          return (
            <div key={m.id}>
              {showDay && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border/60" />
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    {formatDay(d)}
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                {!mine && (
                  <div className="w-8">
                    {!nextSameSender && <Avatar party={party} />}
                  </div>
                )}
                <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!grouped && (
                    <div className={`text-[11px] mb-1 text-muted-foreground ${mine ? "text-right" : "text-left"}`}>
                      <span className="font-medium text-foreground/80">{party.name}</span>
                      <span className="mx-1.5">·</span>
                      <span>{d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  )}
                  <div
                    className={
                      mine
                        ? "px-3.5 py-2 text-sm bg-neutral-900 text-white shadow-sm"
                        : "px-3.5 py-2 text-sm bg-background text-foreground shadow-sm border border-border/40"
                    }
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {m.body}
                  </div>
                </div>
                {mine && (
                  <div className="w-8">
                    {!nextSameSender && <Avatar party={party} />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer — inside panel, no boxy border everywhere */}
      <div className="bg-background border-t border-border/60 px-4 py-3">
        {disabled ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <CheckCheck className="h-4 w-4" /> This conversation is closed.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={placeholder ?? "Type a message… (Enter to send)"}
              className="flex-1 resize-none bg-neutral-100 focus:bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-foreground max-h-32"
              style={{ minHeight: 42 }}
            />
            <button
              onClick={submit}
              disabled={!text.trim() || sending}
              aria-label="Send"
              className="h-[42px] w-[42px] bg-neutral-900 text-white grid place-items-center disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
