import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminGetOverview, adminUpdatePlan, adminUpdateSetting, adminRevokeUserKey,
  adminResetUserDevice, adminToggleBan, adminAssignPlan
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Qrinux LeadLens" },
      { name: "description", content: "Super admin control panel for Qrinux LeadLens." },
      { property: "og:title", content: "Qrinux LeadLens Admin" },
      { property: "og:description", content: "Manage users, plans, and platform settings." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(adminGetOverview);
  const updatePlan = useServerFn(adminUpdatePlan);
  const updateSetting = useServerFn(adminUpdateSetting);
  const revokeKey = useServerFn(adminRevokeUserKey);
  const resetDevice = useServerFn(adminResetUserDevice);
  const toggleBan = useServerFn(adminToggleBan);
  const assignPlan = useServerFn(adminAssignPlan);

  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-overview"] });

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };

  if (overview.isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (overview.isError) return <div className="min-h-screen flex items-center justify-center text-red-600">Error: {(overview.error as Error).message}</div>;
  const o = overview.data!;

  const settingsMap: Record<string, any> = {};
  for (const s of o.settings) settingsMap[s.key] = s.value;
  const freeEnabled = settingsMap.free_tier_enabled !== false;
  const freeLimit = Number(settingsMap.free_daily_limit ?? 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">Super Admin</span>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign out</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Total users" value={o.users.length} />
          <Metric label="Active API keys" value={o.apiKeys.filter((k) => !k.revoked_at).length} />
          <Metric label="Scans today" value={o.totalScansToday} />
          <Metric label="Total scans" value={o.totalScans} />
        </div>

        {/* Free tier controls */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Free tier settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 block mb-2">Free tier enabled</label>
              <Button
                variant={freeEnabled ? "default" : "outline"}
                onClick={async () => { await updateSetting({ data: { key: "free_tier_enabled", value: !freeEnabled } }); invalidate(); }}
                className={freeEnabled ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {freeEnabled ? "Enabled" : "Disabled"} — click to toggle
              </Button>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-2">Free daily scan limit</label>
              <FreeLimitEditor initial={freeLimit} onSave={async (v) => { await updateSetting({ data: { key: "free_daily_limit", value: v } }); invalidate(); }} />
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Slug</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Daily limit</th><th className="py-2 pr-4">Validity (d)</th><th className="py-2 pr-4">Active</th>
                </tr>
              </thead>
              <tbody>
                {o.plans.map((p) => (
                  <PlanRow key={p.id} plan={p} onSave={async (u) => { await updatePlan({ data: { id: p.id, ...u } }); invalidate(); }} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Users */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Users ({o.users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Joined</th>
                  <th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {o.users.map((u) => {
                  const userKeys = o.apiKeys.filter((k) => k.user_id === u.id && !k.revoked_at);
                  return (
                    <tr key={u.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">{u.email}</td>
                      <td className="py-3 pr-4 text-slate-600">{u.full_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        {u.banned ? <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Banned</span> :
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Active</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          <select
                            className="text-xs border border-slate-200 rounded px-2 py-1"
                            defaultValue=""
                            onChange={async (e) => { if (!e.target.value) return; await assignPlan({ data: { user_id: u.id, plan_slug: e.target.value } }); invalidate(); e.target.value = ""; }}
                          >
                            <option value="">Assign plan…</option>
                            {o.plans.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                          </select>
                          {userKeys.length > 0 && (
                            <>
                              <button className="text-xs px-2 py-1 border border-slate-200 rounded hover:bg-slate-50" onClick={async () => { await resetDevice({ data: { user_id: u.id } }); invalidate(); }}>Reset device</button>
                              <button className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50" onClick={async () => { await revokeKey({ data: { user_id: u.id } }); invalidate(); }}>Revoke key</button>
                            </>
                          )}
                          <button className="text-xs px-2 py-1 border border-slate-200 rounded hover:bg-slate-50" onClick={async () => { await toggleBan({ data: { user_id: u.id, banned: !u.banned } }); invalidate(); }}>
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
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
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
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4 font-mono text-xs text-slate-500">{plan.slug}</td>
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
