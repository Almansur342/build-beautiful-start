import { useEffect, useRef, useState } from "react";
import { Send, CheckCheck, CircleAlert, Radio, Sparkles } from "lucide-react";

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
  liveLabel,
  sendError,
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
  liveLabel?: string;
  sendError?: string | null;
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
    <div className="flex flex-col h-full bg-[#f7f8f5]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-background border-b border-border/60">
        <div className="min-w-0">{header}{liveLabel && <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>{liveLabel}</div>}</div>
        <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
      </div>

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="h-full grid place-items-center text-center px-6"><div><div className="mx-auto mb-3 h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center"><Sparkles className="h-4 w-4" /></div><div className="text-sm font-medium text-foreground">{emptyLabel ?? "Start the conversation."}</div><p className="mt-1 text-xs text-muted-foreground">Share the details and we will keep this conversation updated here.</p></div></div>
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
                        ? "px-3.5 py-2.5 text-sm bg-neutral-900 text-white shadow-sm rounded-2xl rounded-br-md"
                        : "px-3.5 py-2.5 text-sm bg-background text-foreground shadow-sm border border-border/40 rounded-2xl rounded-bl-md"
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
          <div>
            {sendError && <div role="alert" className="mb-2 flex items-center gap-1.5 text-xs text-destructive"><CircleAlert className="h-3.5 w-3.5" /> {sendError}</div>}
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
              className="flex-1 resize-none rounded-xl bg-neutral-100 focus:bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-foreground max-h-32"
              style={{ minHeight: 42 }}
            />
            <button
              onClick={submit}
              disabled={!text.trim() || sending}
              aria-label="Send"
              className="h-[42px] w-[42px] rounded-xl bg-neutral-900 text-white grid place-items-center disabled:opacity-40 transition hover:bg-neutral-700"
            >
              <Send className="h-4 w-4" />
            </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Radio className="h-3 w-3 text-emerald-600" /> Live updates are on</span><span>{text.length}/2000</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
