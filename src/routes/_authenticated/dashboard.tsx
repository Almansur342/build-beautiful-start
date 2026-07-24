import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { generateMyApiKey, listMyApiKeys, resetMyDeviceBinding } from "@/lib/apiKeys.functions";
import { createCheckoutSessionForPlan } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { getStripeEnvironment } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import extensionAsset from "@/assets/qrinux-leadlens.zip.asset.json";
import { Copy, Download, KeyRound, RefreshCw, Shield, LogOut, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Qrinux LeadLens" },
      { name: "description", content: "Manage your API key, download the extension, and view your scan usage." },
      { property: "og:title", content: "Qrinux LeadLens Dashboard" },
      { property: "og:description", content: "Your Qrinux LeadLens control center." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getMyDashboardData);
  const fetchKeys = useServerFn(listMyApiKeys);
  const genKey = useServerFn(generateMyApiKey);
  const resetDev = useServerFn(resetMyDeviceBinding);
  const startCheckout = useServerFn(createCheckoutSessionForPlan);

  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const keys = useQuery({ queryKey: ["apiKeys"], queryFn: () => fetchKeys() });

  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const generateMut = useMutation({
    mutationFn: () => genKey(),
    onSuccess: (r) => { setFreshKey(r.plaintext); qc.invalidateQueries({ queryKey: ["apiKeys"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const resetMut = useMutation({
    mutationFn: () => resetDev(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const startUpgrade = async (lookupKey: string) => {
    setCheckoutErr(null);
    const res = await startCheckout({ data: { priceLookupKey: lookupKey, returnUrl: window.location.origin + "/dashboard", environment: getStripeEnvironment() } });
    if ("error" in res) { setCheckoutErr(res.error); return; }
    setCheckoutSecret(res.clientSecret);
  };

  const downloadExtension = () => {
    const a = document.createElement("a");
    a.href = extensionAsset.url;
    a.download = "qrinux-leadlens.zip";
    a.click();
  };

  if (dash.isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (dash.isError) return <div className="min-h-screen flex items-center justify-center text-red-600">Error: {(dash.error as Error).message}</div>;
  const d = dash.data!;
  const activeKey = (keys.data ?? []).find((k) => !k.revoked_at);
  const currentPlan = d.subscription?.plans;
  const dailyLimit = (currentPlan?.daily_scan_limit as number | null | undefined) ?? (d.settings.free_daily_limit as number ?? 100);
  const isUnlimited = currentPlan?.daily_scan_limit == null && currentPlan?.slug !== "free";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center"><span className="text-white font-bold text-sm">Q</span></div>
            <span className="font-semibold text-slate-900">Qrinux LeadLens</span>
          </Link>
          <div className="flex items-center gap-3">
            {d.isSuperAdmin && (
              <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1">
                <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
            <span className="text-sm text-slate-500 hidden sm:block">{d.profile?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome{d.profile?.full_name ? `, ${d.profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="text-slate-500 mt-1">Manage your API key, install the extension, and track daily usage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Current plan" value={currentPlan?.name ?? "Free"} sub={`$${currentPlan?.price_usd ?? 0}/mo`} />
          <StatCard label="Scans today" value={String(d.todayScans)} sub={isUnlimited ? "Unlimited" : `of ${dailyLimit}`} />
          <StatCard label="Device bound" value={activeKey?.device_fingerprint ? "Yes" : "Not yet"} sub={activeKey?.bound_at ? new Date(activeKey.bound_at).toLocaleDateString() : "First scan will bind"} />
        </div>

        {/* API Key */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><KeyRound className="w-5 h-5" /> Your API Key</h2>
              <p className="text-sm text-slate-500 mt-1">One key per account. Locks to the first device that uses it.</p>
            </div>
            <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending} className="bg-slate-900 hover:bg-slate-800">
              {activeKey ? "Regenerate" : "Generate API Key"}
            </Button>
          </div>

          {freshKey ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">Copy your API key now — it will not be shown again.</p>
              <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-md px-3 py-2 font-mono text-sm text-slate-900 break-all">
                <span className="flex-1">{freshKey}</span>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(freshKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  <Copy className="w-4 h-4 mr-1" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : activeKey ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-500">Active key</p>
              <p className="font-mono text-slate-900 mt-1">{activeKey.key_prefix}••••••••••••••••</p>
              {activeKey.device_fingerprint && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Locked to device • {new Date(activeKey.bound_at!).toLocaleString()}</span>
                  <Button size="sm" variant="outline" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Reset device binding
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-500">No API key yet. Generate one to start scanning.</p>
            </div>
          )}
        </section>

        {/* Install Extension */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4"><Download className="w-5 h-5" /> Install the Chrome extension</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <StepItem n={1}>Click <b>Download extension</b> below to get the ZIP.</StepItem>
            <StepItem n={2}>Unzip the file on your computer.</StepItem>
            <StepItem n={3}>Open <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">chrome://extensions</span> in Chrome.</StepItem>
            <StepItem n={4}>Turn on <b>Developer mode</b> (top-right toggle).</StepItem>
            <StepItem n={5}>Click <b>Load unpacked</b> and select the unzipped folder.</StepItem>
            <StepItem n={6}>Open the extension's <b>Options</b> page and paste your API key.</StepItem>
          </ol>
          <div className="mt-5">
            <Button onClick={downloadExtension} className="bg-slate-900 hover:bg-slate-800">
              <Download className="w-4 h-4 mr-2" /> Download extension
            </Button>
          </div>
        </section>

        {/* Plans */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Plans</h2>
          <p className="text-sm text-slate-500 mb-5">More scans per day + paid plan validity.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {d.plans.map((p: any) => {
              const isCurrent = p.id === currentPlan?.id;
              return (
                <div key={p.id} className={`border rounded-xl p-5 ${isCurrent ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"}`}>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    {isCurrent && <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <p className="text-2xl font-bold text-slate-900">${p.price_usd}<span className="text-sm font-normal text-slate-500">{p.slug === "free" ? "" : "/mo"}</span></p>
                  <p className="text-sm text-slate-600 mt-3">
                    {p.daily_scan_limit == null ? "Unlimited scans / day" : `${p.daily_scan_limit} scans / day`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{p.validity_days ? `${p.validity_days}-day validity` : "No expiry"}</p>
                  {!isCurrent && p.slug !== "free" && p.stripe_price_id && (
                    <Button size="sm" className="w-full mt-4 bg-slate-900 hover:bg-slate-800" onClick={() => startUpgrade(p.stripe_price_id)}>
                      Upgrade <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {checkoutErr && <p className="mt-3 text-sm text-red-600">{checkoutErr}</p>}
        </section>

        {/* Recent scans */}
        {d.history.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent scans</h2>
            <div className="space-y-1 text-sm">
              {d.history.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="font-mono text-slate-700 truncate max-w-md">{s.website_url}</span>
                  <span className="text-slate-500 text-xs">{new Date(s.scanned_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-sm text-slate-500 py-8">
          Qrinux LeadLens • Evidence-first lead qualification.
        </footer>
      </main>

      {checkoutSecret && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Complete your payment</h3>
              <button onClick={() => setCheckoutSecret(null)} className="text-slate-500 hover:text-slate-900">✕</button>
            </div>
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => checkoutSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function StepItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">{n}</span>
      <span>{children}</span>
    </li>
  );
}
