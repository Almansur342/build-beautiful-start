import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminGetOverview, adminUpdatePlan, adminUpdateSetting, adminRevokeUserKey,
  adminResetUserDevice, adminToggleBan, adminAssignPlan,
} from "@/lib/admin.functions";
import { adminListRefunds, adminUpdateRefund } from "@/lib/billing.functions";
import { adminListThreads, adminListThreadMessages, adminReplyMessage } from "@/lib/support.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, KeyRound, Activity, TrendingUp, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Qrinux LeadLens" }] }),
  component: AdminPage,
});

type Tab = "overview" | "users" | "plans" | "refunds" | "support";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <DashboardShell title="Super Admin" description="Manage users, plans, refunds, and live support.">
      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-xl w-fit overflow-x-auto">
        {(["overview", "users", "plans", "refunds", "support"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize whitespace-nowrap ${
              tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "refunds" && <RefundsTab />}
      {tab === "support" && <SupportTab />}
    </DashboardShell>
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Users} label="Total users" value={o.users.length} />
        <Metric icon={KeyRound} label="Active keys" value={o.apiKeys.filter((k: any) => !k.revoked_at).length} />
        <Metric icon={Activity} label="Scans today" value={o.totalScansToday} />
        <Metric icon={TrendingUp} label="Total scans" value={o.totalScans} />
      </div>
      <section className="bg-background border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Free tier</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Enabled</label>
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
    <section className="bg-background border border-border rounded-2xl p-6 overflow-x-auto">
      <h2 className="font-semibold mb-4">Users ({o.users.length})</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Joined</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {o.users.map((u: any) => {
            const userKeys = o.apiKeys.filter((k: any) => k.user_id === u.id && !k.revoked_at);
            return (
              <tr key={u.id} className="border-b border-border/60">
                <td className="py-3 pr-4 font-medium">{u.email}</td>
                <td className="py-3 pr-4 text-muted-foreground">{u.full_name ?? "—"}</td>
                <td className="py-3 pr-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-3 pr-4">
                  {u.banned ? (
                    <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full">Banned</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Active</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <select
                      className="text-xs border border-border rounded-md px-2 py-1 bg-background"
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
                        <button className="text-xs px-2 py-1 border border-border rounded-md hover:bg-muted" onClick={async () => { await resetDevice({ data: { user_id: u.id } }); invalidate(); }}>Reset device</button>
                        <button className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-md hover:bg-red-50" onClick={async () => { await revokeKey({ data: { user_id: u.id } }); invalidate(); }}>Revoke key</button>
                      </>
                    )}
                    <button className="text-xs px-2 py-1 border border-border rounded-md hover:bg-muted" onClick={async () => { await toggleBan({ data: { user_id: u.id, banned: !u.banned } }); invalidate(); }}>
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function PlansTab() {
  const overview = useOverview();
  const qc = useQueryClient();
  const updatePlan = useServerFn(adminUpdatePlan);
  if (!overview.data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <section className="bg-background border border-border rounded-2xl p-6 overflow-x-auto">
      <h2 className="font-semibold mb-4">Plans</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
            <th className="py-2 pr-4">Slug</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Price</th>
            <th className="py-2 pr-4">Daily limit</th><th className="py-2 pr-4">Validity (d)</th><th className="py-2 pr-4">Active</th><th></th>
          </tr>
        </thead>
        <tbody>
          {overview.data.plans.map((p: any) => (
            <PlanRow key={p.id} plan={p} onSave={async (u) => { await updatePlan({ data: { id: p.id, ...u } }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); }} />
          ))}
        </tbody>
      </table>
    </section>
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
    <section className="bg-background border border-border rounded-2xl p-6">
      <h2 className="font-semibold mb-4">Refund requests ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No refund requests.</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r: any) => (
            <div key={r.id} className="py-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  ${Number(r.amount_usd ?? 0).toFixed(2)} — {r.profiles?.email ?? r.user_id}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                <div className="text-sm mt-2">{r.reason}</div>
                {r.admin_note && (
                  <div className="text-xs bg-muted rounded-lg px-3 py-2 mt-2"><b>Note:</b> {r.admin_note}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 md:w-56 flex-shrink-0">
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
    </section>
  );
}

function SupportTab() {
  const qc = useQueryClient();
  const fetchThreads = useServerFn(adminListThreads);
  const fetchMsgs = useServerFn(adminListThreadMessages);
  const reply = useServerFn(adminReplyMessage);
  const threads = useQuery({ queryKey: ["admin-threads"], queryFn: () => fetchThreads() });
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const msgs = useQuery({
    queryKey: ["admin-thread", selected],
    queryFn: () => fetchMsgs({ data: { userId: selected! } }),
    enabled: !!selected,
  });
  const replyMut = useMutation({
    mutationFn: (body: string) => reply({ data: { userId: selected!, body } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-thread", selected] });
      qc.invalidateQueries({ queryKey: ["admin-threads"] });
    },
  });

  return (
    <section className="bg-background border border-border rounded-2xl overflow-hidden grid md:grid-cols-[18rem_1fr] h-[70vh]">
      <div className="border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border font-semibold text-sm">Conversations</div>
        {threads.data?.length === 0 && <div className="p-6 text-sm text-muted-foreground">No conversations yet.</div>}
        {(threads.data ?? []).map((t: any) => (
          <button
            key={t.user_id}
            onClick={() => setSelected(t.user_id)}
            className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted ${selected === t.user_id ? "bg-muted" : ""}`}
          >
            <div className="text-sm font-medium truncate">{t.profile?.email ?? t.user_id}</div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">{t.last?.body}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{new Date(t.last?.created_at).toLocaleString()}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        {!selected ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a conversation.</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {(msgs.data ?? []).map((m: any) => (
                <div key={m.id} className={`flex ${m.sender === "support" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.sender === "support" ? "bg-foreground text-background" : "bg-background border border-border"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`text-[10px] mt-1 ${m.sender === "support" ? "text-background/60" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) replyMut.mutate(text.trim()); } }}
                rows={2}
                placeholder="Reply as support…"
                className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm"
              />
              <Button onClick={() => text.trim() && replyMut.mutate(text.trim())} disabled={!text.trim() || replyMut.isPending} size="icon" className="h-10 w-10">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-background border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center"><Icon className="h-4 w-4" /></div>
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
    <tr className="border-b border-border/60">
      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{plan.slug}</td>
      <td className="py-2 pr-4"><Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" /></td>
      <td className="py-2 pr-4"><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-8 w-20" /></td>
      <td className="py-2 pr-4"><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="∞" className="h-8 w-24" /></td>
      <td className="py-2 pr-4"><Input type="number" value={validity} onChange={(e) => setValidity(e.target.value === "" ? "" : Number(e.target.value))} placeholder="∞" className="h-8 w-20" /></td>
      <td className="py-2 pr-4"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></td>
      <td className="py-2 pr-4">
        <Button size="sm" variant="outline" onClick={() => onSave({ name, price_usd: price, daily_scan_limit: limit === "" ? null : limit, validity_days: validity === "" ? null : validity, is_active: active })}>Save</Button>
      </td>
    </tr>
  );
}
