import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminGetOverview, adminUpdatePlan, adminUpdateSetting, adminRevokeUserKey,
  adminResetUserDevice, adminToggleBan, adminAssignPlan,
} from "@/lib/admin.functions";
import { adminListRefunds, adminUpdateRefund } from "@/lib/billing.functions";
import { adminListAllTickets, listTicketMessages, replyTicket, setTicketStatus } from "@/lib/tickets.functions";
import { adminListFeedback } from "@/lib/feedback.functions";
import { getAvatarSignedUrl } from "@/lib/profile.functions";
import { AdminShell, type AdminTab } from "@/components/admin-shell";
import { ChatThread, type ChatParty } from "@/components/chat-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, KeyRound, Activity, TrendingUp, Star, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Super Admin — Qrinux LeadLens" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: AdminTab } => {
    const v = s?.tab as string | undefined;
    const valid: AdminTab[] = ["overview", "users", "plans", "refunds", "support", "feedback"];
    return { tab: valid.includes(v as AdminTab) ? (v as AdminTab) : undefined };
  },
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    // Server-side gate is still in each fn; this is a UX gate.
  },
  component: AdminPage,
});

function AdminPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: AdminTab = search.tab ?? "overview";
  const setTab = (t: AdminTab) => navigate({ search: { tab: t } });

  const titles: Record<AdminTab, { t: string; d: string }> = {
    overview: { t: "Platform overview", d: "Signals across users, keys, and scan volume." },
    users: { t: "Users", d: "Assign plans, reset devices, revoke keys." },
    plans: { t: "Plans", d: "Manage pricing, daily limits, and validity." },
    refunds: { t: "Refund requests", d: "Review and process customer refunds." },
    support: { t: "Support inbox", d: "Reply to open tickets and mark them resolved." },
    feedback: { t: "Feedback", d: "5-star ratings from your users." },
  };

  return (
    <AdminShell tab={tab} onTab={setTab} title={titles[tab].t} description={titles[tab].d}>
      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "refunds" && <RefundsTab />}
      {tab === "support" && <AdminSupport />}
      {tab === "feedback" && <FeedbackTab />}
    </AdminShell>
  );
}

function useOverview() {
  const fetchOverview = useServerFn(adminGetOverview);
  return useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });
}

function OverviewTab() {
  const overview = useOverview();
  const qc = useQueryClient();
  const updateSetting = useServerFn(adminUpdateSetting);
  if (overview.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!overview.data) return null;
  const o = overview.data;
  const settingsMap: Record<string, any> = {};
  for (const s of o.settings) settingsMap[s.key] = s.value;
  const freeEnabled = settingsMap.free_tier_enabled !== false;
  const freeLimit = Number(settingsMap.free_daily_limit ?? 100);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Users} label="Total users" value={o.users.length} />
        <Metric icon={KeyRound} label="Active keys" value={o.apiKeys.filter((k: any) => !k.revoked_at).length} />
        <Metric icon={Activity} label="Scans today" value={o.totalScansToday} />
        <Metric icon={TrendingUp} label="Total scans" value={o.totalScans} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Free tier controls</h2>
        <div className="bg-background shadow-sm p-6 grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Enabled for all users</label>
            <Button
              variant={freeEnabled ? "default" : "outline"}
              onClick={async () => {
                await updateSetting({ data: { key: "free_tier_enabled", value: !freeEnabled } });
                qc.invalidateQueries({ queryKey: ["admin-overview"] });
              }}
            >
              {freeEnabled ? "Enabled" : "Disabled"} — click to toggle
            </Button>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Free daily scan limit</label>
            <FreeLimitEditor
              initial={freeLimit}
              onSave={async (v) => {
                await updateSetting({ data: { key: "free_daily_limit", value: v } });
                qc.invalidateQueries({ queryKey: ["admin-overview"] });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function UsersTab() {
  const overview = useOverview();
  const qc = useQueryClient();
  const revokeKey = useServerFn(adminRevokeUserKey);
  const resetDevice = useServerFn(adminResetUserDevice);
  const toggleBan = useServerFn(adminToggleBan);
  const assignPlan = useServerFn(adminAssignPlan);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-overview"] });

  if (!overview.data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const o = overview.data;
  return (
    <div className="bg-background shadow-sm overflow-x-auto">
      <div className="p-5 border-b border-border/60 flex items-center justify-between">
        <div className="font-semibold text-sm">{o.users.length} users</div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-muted-foreground bg-neutral-50">
            <th className="py-3 px-5">Email</th>
            <th className="py-3 pr-4">Name</th>
            <th className="py-3 pr-4">Joined</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {o.users.map((u: any) => {
            const userKeys = o.apiKeys.filter((k: any) => k.user_id === u.id && !k.revoked_at);
            return (
              <tr key={u.id} className="border-t border-border/40">
                <td className="py-3 px-5 font-medium">{u.email}</td>
                <td className="py-3 pr-4 text-muted-foreground">{u.full_name ?? "—"}</td>
                <td className="py-3 pr-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-3 pr-4">
                  {u.banned ? (
                    <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700">Banned</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700">Active</span>
                  )}
                </td>
                <td className="py-3 pr-5">
                  <div className="flex flex-wrap gap-1">
                    <select
                      className="text-xs border border-border px-2 py-1 bg-background"
                      defaultValue=""
                      onChange={async (e) => {
                        if (!e.target.value) return;
                        await assignPlan({ data: { user_id: u.id, plan_slug: e.target.value } });
                        invalidate();
                        e.target.value = "";
                      }}
                    >
                      <option value="">Assign plan…</option>
                      {o.plans.map((p: any) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                    </select>
                    {userKeys.length > 0 && (
                      <>
                        <button className="text-xs px-2 py-1 border border-border hover:bg-muted" onClick={async () => { await resetDevice({ data: { user_id: u.id } }); invalidate(); }}>Reset device</button>
                        <button className="text-xs px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50" onClick={async () => { await revokeKey({ data: { user_id: u.id } }); invalidate(); }}>Revoke key</button>
                      </>
                    )}
                    <button className="text-xs px-2 py-1 border border-border hover:bg-muted" onClick={async () => { await toggleBan({ data: { user_id: u.id, banned: !u.banned } }); invalidate(); }}>
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlansTab() {
  const overview = useOverview();
  const qc = useQueryClient();
  const updatePlan = useServerFn(adminUpdatePlan);
  if (!overview.data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="bg-background shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-muted-foreground bg-neutral-50">
            <th className="py-3 px-5">Slug</th><th className="py-3 pr-4">Name</th><th className="py-3 pr-4">Price</th>
            <th className="py-3 pr-4">Daily limit</th><th className="py-3 pr-4">Validity (d)</th><th className="py-3 pr-4">Active</th><th className="pr-5"></th>
          </tr>
        </thead>
        <tbody>
          {overview.data.plans.map((p: any) => (
            <PlanRow key={p.id} plan={p} onSave={async (u) => { await updatePlan({ data: { id: p.id, ...u } }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); }} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefundsTab() {
  const qc = useQueryClient();
  const fetch = useServerFn(adminListRefunds);
  const update = useServerFn(adminUpdateRefund);
  const list = useQuery({ queryKey: ["admin-refunds"], queryFn: () => fetch() });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "refunded"; admin_note?: string }) =>
      update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });

  if (list.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const rows = list.data ?? [];
  return (
    <div className="bg-background shadow-sm">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground p-8 text-center">No refund requests.</p>
      ) : (
        <div className="divide-y divide-border/40">
          {rows.map((r: any) => (
            <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  ${Number(r.amount_usd ?? 0).toFixed(2)} — {r.profiles?.email ?? r.user_id}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                <div className="text-sm mt-2">{r.reason}</div>
                {r.admin_note && (
                  <div className="text-xs bg-muted px-3 py-2 mt-2"><b>Note:</b> {r.admin_note}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 md:w-56 shrink-0">
                <span className="text-xs uppercase tracking-wider font-medium">{r.status}</span>
                {r.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "approved" })}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "rejected", admin_note: "Not eligible per policy." })}>Reject</Button>
                  </>
                )}
                {r.status === "approved" && (
                  <Button size="sm" onClick={() => mut.mutate({ id: r.id, status: "refunded", admin_note: "Refund processed in Stripe." })}>Mark refunded</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================ SUPPORT ================================ */

function AdminSupport() {
  const qc = useQueryClient();
  const fetchTickets = useServerFn(adminListAllTickets);
  const tickets = useQuery({ queryKey: ["admin-tickets"], queryFn: () => fetchTickets(), refetchOnWindowFocus: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all" | "closed">("open");

  useEffect(() => {
    const ch = supabase
      .channel("admin_tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-tickets"] });
        if (selected) qc.invalidateQueries({ queryKey: ["admin-ticket", selected] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, selected]);

  const filtered = useMemo(() => {
    const list = tickets.data ?? [];
    if (filter === "all") return list;
    if (filter === "closed") return list.filter((t: any) => t.status === "closed" || t.status === "resolved");
    return list.filter((t: any) => t.status !== "closed" && t.status !== "resolved");
  }, [tickets.data, filter]);

  useEffect(() => {
    if (!selected && filtered.length > 0) setSelected(filtered[0].id);
  }, [filtered, selected]);

  return (
    <div className="grid lg:grid-cols-[22rem_1fr] gap-4 h-[75vh] bg-background shadow-sm overflow-hidden">
      <div className="flex flex-col border-r border-border/40">
        <div className="p-3 flex items-center gap-1 border-b border-border/40">
          {(["open", "all", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 capitalize ${
                filter === f ? "bg-neutral-900 text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && <div className="p-8 text-sm text-muted-foreground text-center">No tickets.</div>}
          {filtered.map((t: any) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full text-left p-3 border-b border-border/30 hover:bg-neutral-50 ${selected === t.id ? "bg-neutral-100" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{t.profiles?.email ?? t.user_id.slice(0, 8)}</div>
                  <div className="text-sm font-medium truncate mt-0.5">{t.subject}</div>
                </div>
                {t.unread_for_admin > 0 && <span className="h-2 w-2 bg-emerald-500 mt-1.5 shrink-0" />}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.status} · {t.priority}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(t.last_message_at ?? t.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0">
        {selected ? (
          <AdminTicketThread ticketId={selected} ticket={filtered.find((t: any) => t.id === selected)} />
        ) : (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">Select a ticket.</div>
        )}
      </div>
    </div>
  );
}

function AdminTicketThread({ ticketId, ticket }: { ticketId: string; ticket: any }) {
  const qc = useQueryClient();
  const fetchMsgs = useServerFn(listTicketMessages);
  const reply = useServerFn(replyTicket);
  const setStatus = useServerFn(setTicketStatus);
  const signAvatar = useServerFn(getAvatarSignedUrl);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const msgs = useQuery({
    queryKey: ["admin-ticket", ticketId],
    queryFn: () => fetchMsgs({ data: { ticketId } }),
  });

  useEffect(() => {
    const a = ticket?.profiles?.avatar_url;
    if (a) signAvatar({ data: { path: a } }).then((r: any) => setUserAvatar(r.url)).catch(() => setUserAvatar(null));
    else setUserAvatar(null);
  }, [ticket, signAvatar]);

  const replyMut = useMutation({
    mutationFn: (body: string) => reply({ data: { ticketId, body } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: "resolved" | "open" | "closed") => setStatus({ data: { ticketId, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });

  const closed = ticket?.status === "closed" || ticket?.status === "resolved";

  const user: ChatParty = {
    role: "user",
    name: ticket?.profiles?.full_name ?? ticket?.profiles?.email ?? "User",
    email: ticket?.profiles?.email,
    avatarUrl: userAvatar,
  };
  const support: ChatParty = { role: "support", name: "Qrinux Support", email: null };

  return (
    <ChatThread
      messages={msgs.data ?? []}
      viewerRole="support"
      user={user}
      support={support}
      disabled={closed}
      sending={replyMut.isPending}
      onSend={(v) => replyMut.mutate(v)}
      placeholder="Reply as Qrinux Support…"
      header={
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{ticket?.subject}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {ticket?.profiles?.email} · {ticket?.status} · {ticket?.priority}
          </div>
        </div>
      }
      headerActions={
        !closed ? (
          <>
            <Button variant="outline" size="sm" onClick={() => statusMut.mutate("resolved")}>Mark resolved</Button>
            <Button variant="outline" size="sm" onClick={() => statusMut.mutate("closed")}>Close</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => statusMut.mutate("open")}>Reopen</Button>
        )
      }
    />
  );
}

/* ================================ FEEDBACK ================================ */

function FeedbackTab() {
  const fetchFn = useServerFn(adminListFeedback);
  const list = useQuery({ queryKey: ["admin-feedback"], queryFn: () => fetchFn() });
  if (list.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const rows = list.data ?? [];
  const avg = rows.length ? rows.reduce((a: number, r: any) => a + r.rating, 0) / rows.length : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Star} label="Total feedback" value={rows.length} />
        <Metric icon={Star} label="Avg rating" value={Number(avg.toFixed(2))} />
        <Metric icon={CheckCircle2} label="5-star" value={rows.filter((r: any) => r.rating === 5).length} />
        <Metric icon={CheckCircle2} label="≤ 3-star" value={rows.filter((r: any) => r.rating <= 3).length} />
      </div>
      <div className="bg-background shadow-sm">
        {rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No feedback yet.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((r: any) => (
              <div key={r.id} className="p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm font-medium">{r.profiles?.full_name ?? r.profiles?.email ?? r.user_id}</div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
                    ))}
                  </div>
                </div>
                {r.category && <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{r.category}</div>}
                {r.message && <div className="text-sm text-foreground/90 whitespace-pre-wrap">{r.message}</div>}
                <div className="text-[11px] text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ HELPERS ================================ */

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-background shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 bg-neutral-100 grid place-items-center"><Icon className="h-4 w-4" /></div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function FreeLimitEditor({ initial, onSave }: { initial: number; onSave: (v: number) => Promise<void> }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex gap-2">
      <Input type="number" value={v} onChange={(e) => setV(Number(e.target.value))} className="w-32" />
      <Button variant="outline" onClick={() => onSave(v)}>Save</Button>
    </div>
  );
}

function PlanRow({ plan, onSave }: { plan: any; onSave: (u: any) => Promise<void> }) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(plan.price_usd);
  const [limit, setLimit] = useState<number | "">(plan.daily_scan_limit ?? "");
  const [validity, setValidity] = useState<number | "">(plan.validity_days ?? "");
  const [active, setActive] = useState(plan.is_active);
  return (
    <tr className="border-t border-border/40">
      <td className="py-2 px-5 font-mono text-xs text-muted-foreground">{plan.slug}</td>
      <td className="py-2 pr-4"><Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" /></td>
      <td className="py-2 pr-4"><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-8 w-20" /></td>
      <td className="py-2 pr-4"><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="∞" className="h-8 w-24" /></td>
      <td className="py-2 pr-4"><Input type="number" value={validity} onChange={(e) => setValidity(e.target.value === "" ? "" : Number(e.target.value))} placeholder="∞" className="h-8 w-20" /></td>
      <td className="py-2 pr-4"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></td>
      <td className="py-2 pr-5">
        <Button size="sm" variant="outline" onClick={() => onSave({ name, price_usd: price, daily_scan_limit: limit === "" ? null : limit, validity_days: validity === "" ? null : validity, is_active: active })}>Save</Button>
      </td>
    </tr>
  );
}
