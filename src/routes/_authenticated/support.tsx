import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyTickets,
  createTicket,
  listTicketMessages,
  replyTicket,
  setTicketStatus,
} from "@/lib/tickets.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Send, Plus, LifeBuoy, CheckCircle2, Clock, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — Qrinux LeadLens" }] }),
  component: SupportPage,
});

function statusChip(status: string) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    open: { label: "Open", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Clock },
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    resolved: { label: "Resolved", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
    closed: { label: "Closed", cls: "bg-muted text-muted-foreground border-border", icon: X },
  };
  const s = map[status] ?? map.open;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border font-medium ${s.cls}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

function SupportPage() {
  const qc = useQueryClient();
  const fetchTickets = useServerFn(listMyTickets);
  const create = useServerFn(createTicket);
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: () => fetchTickets() });

  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!selected && tickets.data && tickets.data.length > 0) {
      setSelected(tickets.data[0].id);
    }
  }, [tickets.data, selected]);

  useEffect(() => {
    const ch = supabase
      .channel("tickets_self")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        qc.invalidateQueries({ queryKey: ["tickets"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["tickets"] });
        if (selected) qc.invalidateQueries({ queryKey: ["ticket-messages", selected] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, selected]);

  const createMut = useMutation({
    mutationFn: (v: { subject: string; body: string; priority: string }) => create({ data: v }),
    onSuccess: (t: any) => {
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setSelected(t.id);
    },
  });

  return (
    <DashboardShell title="Support" description="Ticketing-based support. Every request gets its own thread with our team.">
      <div className="grid lg:grid-cols-[20rem_1fr] gap-4 h-[75vh]">
        {/* Ticket list */}
        <div className="border border-border bg-background flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-medium">Your tickets</div>
            <Button size="sm" onClick={() => setShowNew(true)} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tickets.isLoading && <div className="p-4 text-xs text-muted-foreground">Loading…</div>}
            {tickets.data && tickets.data.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No tickets yet.
              </div>
            )}
            {(tickets.data ?? []).map((t: any) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/40 ${
                  selected === t.id ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm truncate flex-1">{t.subject}</div>
                  {t.unread_for_user > 0 && (
                    <span className="h-2 w-2 bg-emerald-500 mt-1.5 shrink-0" />
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {statusChip(t.status)}
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(t.last_message_at ?? t.created_at).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="border border-border bg-background flex flex-col overflow-hidden">
          {selected ? (
            <TicketThread ticketId={selected} />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
              Select a ticket or create a new one.
            </div>
          )}
        </div>
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSubmit={(v) => createMut.mutate(v)} pending={createMut.isPending} />}
    </DashboardShell>
  );
}

function TicketThread({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const fetchMsgs = useServerFn(listTicketMessages);
  const reply = useServerFn(replyTicket);
  const setStatus = useServerFn(setTicketStatus);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const msgs = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: () => fetchMsgs({ data: { ticketId } }),
  });

  const replyMut = useMutation({
    mutationFn: (body: string) => reply({ data: { ticketId, body } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const closeMut = useMutation({
    mutationFn: () => setStatus({ data: { ticketId, status: "closed" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.data]);

  return (
    <>
      <div className="border-b border-border p-3 flex items-center justify-between">
        <div className="text-sm font-medium">Ticket #{ticketId.slice(0, 8)}</div>
        <Button variant="outline" size="sm" onClick={() => closeMut.mutate()} className="h-8">
          Close ticket
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {msgs.isLoading && <div className="text-xs text-muted-foreground text-center">Loading…</div>}
        {(msgs.data ?? []).map((m: any) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 text-sm border ${
                m.sender === "user"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
              <div className={`text-[10px] mt-1 ${m.sender === "user" ? "text-background/60" : "text-muted-foreground"}`}>
                {new Date(m.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) replyMut.mutate(text.trim());
            }
          }}
          placeholder="Reply to this ticket… (Enter to send)"
          rows={2}
          maxLength={2000}
          className="flex-1 resize-none border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <Button
          onClick={() => text.trim() && replyMut.mutate(text.trim())}
          disabled={!text.trim() || replyMut.isPending}
          size="icon"
          className="h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function NewTicketModal({ onClose, onSubmit, pending }: { onClose: () => void; onSubmit: (v: { subject: string; body: string; priority: string }) => void; pending: boolean }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4">
      <div className="bg-background border border-border w-full max-w-lg">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold">New support ticket</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className="mt-1 w-full border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              placeholder="Short description of the issue"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              className="mt-1 w-full border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              placeholder="Describe your issue in detail…"
            />
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSubmit({ subject, body, priority })}
            disabled={!subject.trim() || !body.trim() || pending}
          >
            {pending ? "Creating…" : "Create ticket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
