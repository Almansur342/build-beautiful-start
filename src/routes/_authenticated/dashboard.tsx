import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { listMyApiKeys } from "@/lib/apiKeys.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Activity, Globe, TrendingUp, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Qrinux LeadLens" },
      { name: "description", content: "Your scan usage, device info, and recent activity." },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const fetchDash = useServerFn(getMyDashboardData);
  const fetchKeys = useServerFn(listMyApiKeys);
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const keys = useQuery({ queryKey: ["apiKeys"], queryFn: () => fetchKeys() });

  const d = dash.data;
  const activeKey = (keys.data ?? []).find((k) => !k.revoked_at);
  const currentPlan = d?.subscription?.plans as any;
  const dailyLimit = (currentPlan?.daily_scan_limit as number | null | undefined) ?? (d?.settings?.free_daily_limit as number ?? 100);
  const isUnlimited = currentPlan?.daily_scan_limit == null && currentPlan?.slug !== "free";
  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round(((d?.todayScans ?? 0) / (dailyLimit || 1)) * 100));

  return (
    <DashboardShell
      title={`Welcome${d?.profile?.full_name ? `, ${d.profile.full_name.split(" ")[0]}` : ""}`}
      description="Here's what's happening with your account today."
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Zap}
          label="Scans today"
          value={String(d?.todayScans ?? 0)}
          sub={isUnlimited ? "Unlimited" : `${dailyLimit - (d?.todayScans ?? 0)} left of ${dailyLimit}`}
        />
        <MetricCard
          icon={Activity}
          label="Current plan"
          value={currentPlan?.name ?? "Free"}
          sub={`$${currentPlan?.price_usd ?? 0}/mo`}
        />
        <MetricCard
          icon={Globe}
          label="Total scans"
          value={String((d?.history?.length ?? 0))}
          sub="Last 20 shown"
        />
        <MetricCard
          icon={TrendingUp}
          label="Device"
          value={activeKey?.device_fingerprint ? "Bound" : "Not bound"}
          sub={activeKey?.bound_at ? new Date(activeKey.bound_at).toLocaleDateString() : "First scan will bind"}
        />
      </div>

      {!isUnlimited && (
        <div className="bg-background border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h3 className="font-semibold">Daily usage</h3>
              <p className="text-sm text-muted-foreground">Resets every 24 hours at UTC midnight.</p>
            </div>
            <div className="text-sm font-medium">{usagePct}%</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-foreground" style={{ width: `${usagePct}%` }} />
          </div>
          {usagePct >= 80 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Running low? Upgrade to keep scanning.</span>
              <Link to="/billing" className="font-medium inline-flex items-center gap-1">
                See plans <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent scans */}
        <div className="lg:col-span-2 bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent scans</h3>
            <span className="text-xs text-muted-foreground">{d?.history?.length ?? 0} recent</span>
          </div>
          {d?.history?.length ? (
            <div className="divide-y divide-border">
              {d.history.slice(0, 10).map((s: any, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center flex-shrink-0">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-mono truncate">{s.website_url}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.scanned_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No scans yet. Install the extension and start scanning.
            </div>
          )}
        </div>

        {/* Device / status */}
        <div className="bg-background border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Session</h3>
          <div className="space-y-3 text-sm">
            <StatusRow label="Account" value="Active" ok />
            <StatusRow label="API key" value={activeKey ? "Generated" : "Missing"} ok={!!activeKey} />
            <StatusRow label="Device" value={activeKey?.device_fingerprint ? "Bound" : "Unbound"} ok={!!activeKey?.device_fingerprint} />
            <StatusRow label="Last scan" value={d?.history?.[0] ? new Date(d.history[0].scanned_at).toLocaleDateString() : "—"} ok />
          </div>
          <div className="mt-5 pt-5 border-t border-border">
            <Link to="/api-key" className="text-sm font-medium inline-flex items-center gap-1">
              Manage API key <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="bg-background border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium">
        <CheckCircle2 className={`h-3.5 w-3.5 ${ok ? "text-emerald-600" : "text-muted-foreground"}`} />
        {value}
      </span>
    </div>
  );
}
