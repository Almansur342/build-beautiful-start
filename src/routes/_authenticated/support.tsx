import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyTickets,
  createTicket,
  listTicketMessages,
  replyTicket,
  setTicketStatus,
} from "@/lib/tickets.functions";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { getAvatarSignedUrl } from "@/lib/profile.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { ChatThread, type ChatParty } from "@/components/chat-thread";
import { Button } from "@/components/ui/button";
import { Plus, LifeBuoy, X, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — Qrinux LeadLens" }] }),
  component: SupportPage,
});

function statusPill(status: string) {
  const map: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    resolved: "bg-blue-50 text-blue-700",
    closed: "bg-neutral-100 text-neutral-500",
  };
  return <span className={`text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider ${map[status] ?? map.open}`}>{status}</span>;
}

function SupportPage() {
  const qc = useQueryClient();
  const fetchTickets = useServerFn(listMyTickets);
  const fetchDash = useServerFn(getMyDashboardData);
  const create = useServerFn(createTicket);
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: () => fetchTickets() });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

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

  const list = tickets.data ?? [];
  const active = list.filter((t: any) => t.status !== "closed" && t.status !== "resolved");
  const archived = list.filter((t: any) => t.status === "closed" || t.status === "resolved");

  return (
    <DashboardShell title="Support" description="Each conversation is its own ticket. Reopen anytime or start a new one.">
      <div className="grid lg:grid-cols-[22rem_1fr] gap-6 h-[76vh]">
        {/* Ticket list — no borders, subtle surface */}
        <div className="bg-background shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Your tickets</div>
            <Button size="sm" onClick={() => setShowNew(true)} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tickets.isLoading && <div className="p-4 text-xs text-muted-foreground">Loading…</div>}
            {list.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No tickets yet.
                <div className="mt-3">
                  <Button size="sm" onClick={() => setShowNew(true)}>Open your first ticket</Button>
                </div>
              </div>
            )}
            {active.length > 0 && <Section label={`Active · ${active.length}`} icon={Clock} />}
            {active.map((t: any) => (
              <TicketItem key={t.id} t={t} active={selected === t.id} onSelect={() => setSelected(t.id)} />
            ))}
            {archived.length > 0 && <Section label={`Resolved · ${archived.length}`} icon={CheckCircle2} />}
            {archived.map((t: any) => (
              <TicketItem key={t.id} t={t} active={selected === t.id} onSelect={() => setSelected(t.id)} />
            ))}
          </div>
        </div>

        <div className="bg-background shadow-sm overflow-hidden">
          {selected ? (
            <TicketThread ticketId={selected} ticket={list.find((t: any) => t.id === selected)} profile={dash.data?.profile} />
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">Select a ticket or open a new one.</div>
          )}
        </div>
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSubmit={(v) => createMut.mutate(v)} pending={createMut.isPending} />}
    </DashboardShell>
  );
}

function Section({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2 bg-neutral-50">
      <Icon className="h-3 w-3" /> {label}
    </div>
  );
}

function TicketItem({ t, active, onSelect }: { t: any; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 hover:bg-neutral-50 transition ${active ? "bg-neutral-100" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm truncate flex-1">{t.subject}</div>
        {t.unread_for_user > 0 && <span className="h-2 w-2 bg-emerald-500 mt-1.5 shrink-0" />}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {statusPill(t.status)}
        <div className="text-[10px] text-muted-foreground">
          {new Date(t.last_message_at ?? t.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
        </div>
      </div>
    </button>
  );
}

function TicketThread({ ticketId, ticket, profile }: { ticketId: string; ticket: any; profile: any }) {
  const qc = useQueryClient();
  const fetchMsgs = useServerFn(listTicketMessages);
  const reply = useServerFn(replyTicket);
  const setStatus = useServerFn(setTicketStatus);
  const signAvatar = useServerFn(getAvatarSignedUrl);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);

  const msgs = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: () => fetchMsgs({ data: { ticketId } }),
  });

  useEffect(() => {
    if (profile?.avatar_url) signAvatar({ data: { path: profile.avatar_url } }).then((r: any) => setMyAvatar(r.url)).catch(() => {});
    else setMyAvatar(null);
  }, [profile, signAvatar]);

  const replyMut = useMutation({
    mutationFn: (body: string) => reply({ data: { ticketId, body } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: "resolved" | "closed" | "open") => setStatus({ data: { ticketId, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const closed = ticket?.status === "closed" || ticket?.status === "resolved";

  const me: ChatParty = {
    role: "user",
    name: profile?.full_name ?? profile?.email ?? "You",
    email: profile?.email,
    avatarUrl: myAvatar,
  };
  const support: ChatParty = { role: "support", name: "Qrinux Support" };

  return (
    <ChatThread
      messages={msgs.data ?? []}
      viewerRole="user"
      user={me}
      support={support}
      disabled={closed}
      sending={replyMut.isPending}
      sendError={replyMut.isError ? "Message could not be sent. Please try again." : null}
      onSend={(v) => replyMut.mutate(v)}
      placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
      liveLabel="Live updates enabled for this conversation"
      header={
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{ticket?.subject ?? "Conversation"}</div>
          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
            {ticket?.status && statusPill(ticket.status)}
            <span>Ticket #{ticketId.slice(0, 8)}</span>
          </div>
        </div>
      }
      headerActions={
        closed ? (
          <Button variant="outline" size="sm" onClick={() => statusMut.mutate("open")}>Reopen</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => statusMut.mutate("resolved")}>
            Mark resolved
          </Button>
        )
      }
    />
  );
}

function NewTicketModal({ onClose, onSubmit, pending }: { onClose: () => void; onSubmit: (v: { subject: string; body: string; priority: string }) => void; pending: boolean }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4">
      <div className="bg-background w-full max-w-lg shadow-xl">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="font-semibold">New support ticket</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200}
              className="w-full bg-neutral-100 focus:bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
              placeholder="Short summary" />
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-neutral-100 focus:bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground">
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Message">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000}
              className="w-full bg-neutral-100 focus:bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground resize-none"
              placeholder="Describe your issue…" />
          </Field>
        </div>
        <div className="p-4 border-t border-border/60 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ subject, body, priority })} disabled={!subject.trim() || !body.trim() || pending}>
            {pending ? "Creating…" : "Send message"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
