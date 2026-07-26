import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { listMyApiKeys } from "@/lib/apiKeys.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Activity, Globe, TrendingUp, Zap, ArrowRight, CheckCircle2, KeyRound, Laptop, MessageCircleMore, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview â€” Qrinux LeadLens" },
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
  const quota = d?.quota;
  const dailyLimit = quota?.dailyLimit ?? null;
  const remainingToday = quota?.remainingToday ?? null;
  const usagePct = quota?.usagePct ?? 0;
  const isUnlimited = dailyLimit == null;
  const planName = quota?.planName ?? currentPlan?.name ?? "Free";
  const resetAt = quota?.resetAt ? new Date(quota.resetAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "UTC midnight";
  const usageMessage = isUnlimited
    ? "Unlimited scans available."
    : usagePct >= 100
      ? "Daily scan limit reached. Upgrade or wait for reset."
      : usagePct >= 80
        ? "You are close to today's scan limit."
        : `${remainingToday ?? 0} scans remaining today.`;
  const setupReady = Boolean(activeKey?.device_fingerprint);
  const nextStep = !activeKey
    ? { to: "/api-key" as const, icon: KeyRound, title: "Create your API key", body: "Your extension needs an API key before it can submit verified scans.", action: "Create API key" }
    : !setupReady
      ? { to: "/devices" as const, icon: Laptop, title: "Bind your Chrome device", body: "Run your first authorized scan to protect your account and enable scanning.", action: "View device setup" }
      : usagePct >= 80
        ? { to: "/api-key" as const, icon: TrendingUp, title: "Protect today's scan capacity", body: usageMessage, action: "View API key" }
        : { to: "/support" as const, icon: MessageCircleMore, title: "Need help with a scan?", body: "Our support inbox keeps every answer tied to the right conversation.", action: "Open support" };
  const NextStepIcon = nextStep.icon;

  return (
    <DashboardShell
      title={`Welcome${d?.profile?.full_name ? `, ${d.profile.full_name.split(" ")[0]}` : ""}`}
      description="Here's what's happening with your account today."
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Zap}
          label="Scans today"
          value={String(d?.todayScans ?? 0)}
          sub={isUnlimited ? "Unlimited" : `${remainingToday ?? 0} left of ${dailyLimit}`}
        />
        <MetricCard
          icon={Activity}
          label="Current plan"
          value={planName}
          sub="Scan allowance tier"
        />
        <MetricCard
          icon={Globe}
          label="Total scans"
          value={String(d?.totalScans ?? 0)}
          sub="All-time counted scans"
        />
        <MetricCard
          icon={TrendingUp}
          label="Device"
          value={activeKey?.device_fingerprint ? "Bound" : "Not bound"}
          sub={activeKey?.bound_at ? new Date(activeKey.bound_at).toLocaleDateString() : "First scan will bind"}
        />
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 text-white"><div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400 text-neutral-950"><NextStepIcon className="h-5 w-5" /></div><div><div className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Recommended next step</div><h2 className="mt-1 text-lg font-semibold">{nextStep.title}</h2><p className="mt-1 text-sm text-neutral-300">{nextStep.body}</p></div></div><Link to={nextStep.to} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-100">{nextStep.action}<ArrowRight className="h-4 w-4" /></Link></div></section>

      {!isUnlimited && (
        <div className="bg-background border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h3 className="font-semibold">Daily usage</h3>
              <p className="text-sm text-muted-foreground">Resets at {resetAt}.</p>
            </div>
            <div className="text-sm font-medium">{usagePct}%</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-foreground" style={{ width: `${usagePct}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className={usagePct >= 100 ? "text-destructive font-medium" : "text-muted-foreground"}>{usageMessage}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent scans */}
        <div className="lg:col-span-2 bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold">Recent scans</h3><p className="mt-0.5 text-xs text-muted-foreground">Your latest authorized scan activity.</p></div>
            <span className="text-xs text-muted-foreground">Last 20 shown</span>
          </div>
          {d?.history?.length ? (
            <div className="divide-y divide-border">
              {d.history.slice(0, 10).map((s: any, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center flex-shrink-0">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0"><span className="block text-sm font-mono truncate">{s.website_url}</span><span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"><ScanStatus status={s.status} />{s.status.replaceAll("_", " ")}</span></div>
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
          <div className="mb-4 flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck className="h-4 w-4" /></div><div><h3 className="font-semibold">Account health</h3><p className="text-[11px] text-muted-foreground">Ready-state for secure scanning.</p></div></div>
          <div className="space-y-3 text-sm">
            <StatusRow label="Account" value="Active" ok />
            <StatusRow label="Plan" value={planName} ok />
            <StatusRow label="API key" value={activeKey ? "Generated" : "Missing"} ok={!!activeKey} />
            <StatusRow label="Device" value={activeKey?.device_fingerprint ? "Bound" : "Unbound"} ok={!!activeKey?.device_fingerprint} />
            <StatusRow label="Last scan" value={d?.history?.[0] ? new Date(d.history[0].scanned_at).toLocaleDateString() : "â€”"} ok />
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

function ScanStatus({ status }: { status: string }) {
  const pending = status === "partial" || status === "usable_partial";
  return <span className={`h-1.5 w-1.5 rounded-full ${pending ? "bg-amber-500" : status === "success" || status === "counted" ? "bg-emerald-500" : "bg-muted-foreground"}`} />;
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



