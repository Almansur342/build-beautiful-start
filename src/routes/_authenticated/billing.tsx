import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMyDashboardData } from "@/lib/dashboard.functions";
import { createCheckoutSessionForPlan } from "@/lib/payments.functions";
import { getMyBillingData, createRefundRequest } from "@/lib/billing.functions";
import { getStripeEnvironment, getStripe } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Receipt, FileDown, ExternalLink, Check, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Qrinux LeadLens" }] }),
  component: BillingPage,
});

function BillingPage() {
  const qc = useQueryClient();
  const fetchDash = useServerFn(getMyDashboardData);
  const fetchBilling = useServerFn(getMyBillingData);
  const startCheckout = useServerFn(createCheckoutSessionForPlan);
  const submitRefund = useServerFn(createRefundRequest);

  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const billing = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchBilling({ data: { environment: getStripeEnvironment() } }),
  });

  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");

  const refundMut = useMutation({
    mutationFn: (v: { stripe_invoice_id: string; amount_usd: number; reason: string }) =>
      submitRefund({ data: v }),
    onSuccess: () => {
      setRefundFor(null);
      setRefundReason("");
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const startUpgrade = async (lookupKey: string) => {
    setCheckoutErr(null);
    const res = await startCheckout({
      data: {
        priceLookupKey: lookupKey,
        returnUrl: window.location.origin + "/billing",
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in res) {
      setCheckoutErr(res.error);
      return;
    }
    setCheckoutSecret(res.clientSecret);
  };

  const d = dash.data;
  const currentPlan = d?.subscription?.plans as any;
  const isPaidPlan = Boolean(currentPlan && currentPlan.slug !== "free");
  const bill = billing.data && "invoices" in billing.data ? billing.data : null;

  return (
    <DashboardShell title="Billing" description="Manage your plan, view invoices, and request refunds.">
      {/* Current plan */}
      <section className="bg-background border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Current plan</div>
             <div className="text-2xl font-semibold mt-1">{isPaidPlan ? currentPlan.name : "Free"}</div>
            <div className="text-sm text-muted-foreground mt-1">
               ${isPaidPlan ? currentPlan.price_usd : 0}/mo •{" "}
               {isPaidPlan && currentPlan.daily_scan_limit == null
                ? "Unlimited scans"
                : `${currentPlan?.daily_scan_limit ?? d?.settings?.free_daily_limit ?? 100} scans / day`}
            </div>
          </div>
          {d?.subscription?.current_period_end && (
            <div className="text-sm text-muted-foreground">
              Renews on {new Date(d.subscription.current_period_end).toLocaleDateString()}
            </div>
          )}
        </div>
      </section>

      {/* Plans */}
      <section className="mb-8">
        <h2 className="font-semibold mb-4">Change plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(d?.plans ?? []).map((p: any) => {
             const isCurrent = isPaidPlan ? p.id === currentPlan.id : p.slug === "free";
            return (
              <div
                key={p.id}
                className={`bg-background border rounded-2xl p-5 ${isCurrent ? "border-foreground ring-1 ring-foreground" : "border-border"}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-xs bg-foreground text-background px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <p className="text-3xl font-bold">
                  ${p.price_usd}
                  <span className="text-sm font-normal text-muted-foreground">{p.slug === "free" ? "" : "/mo"}</span>
                </p>
                <ul className="text-sm text-muted-foreground mt-4 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {p.daily_scan_limit == null ? "Unlimited scans / day" : `${p.daily_scan_limit} scans / day`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {p.validity_days ? `${p.validity_days}-day validity` : "No expiry"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Device-bound API key
                  </li>
                </ul>
                {!isCurrent && p.slug !== "free" && p.stripe_price_id && (
                  <Button size="sm" className="w-full mt-5" onClick={() => startUpgrade(p.stripe_price_id)}>
                    Upgrade <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {checkoutErr && <p className="mt-3 text-sm text-destructive">{checkoutErr}</p>}
      </section>

      {/* Invoices */}
      <section className="bg-background border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <h2 className="font-semibold">Invoices</h2>
          </div>
          {billing.isLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
        {billing.data && "error" in billing.data ? (
          <p className="text-sm text-destructive">{billing.data.error}</p>
        ) : bill && bill.invoices.length > 0 ? (
          <div className="divide-y divide-border">
            {bill.invoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    ${inv.amount_paid.toFixed(2)} {inv.currency.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {inv.plan ?? "—"} • {inv.created ? new Date(inv.created).toLocaleDateString() : "—"} •{" "}
                    <span
                      className={
                        inv.status === "paid" ? "text-emerald-700" : "text-muted-foreground"
                      }
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {inv.pdf_url && (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                    >
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </a>
                  )}
                  {inv.hosted_invoice_url && (
                    <a
                      href={inv.hosted_invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                  )}
                  {inv.refundable && (
                    <Button size="sm" variant="outline" onClick={() => setRefundFor(inv)}>
                      Request refund
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No invoices yet.</p>
        )}
      </section>

      {/* Refund history */}
      {bill && bill.refunds.length > 0 && (
        <section className="bg-background border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Refund requests</h2>
          <div className="divide-y divide-border">
            {bill.refunds.map((r: any) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">${Number(r.amount_usd ?? 0).toFixed(2)}</div>
                  <StatusChip status={r.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString()} • {r.reason}
                </div>
                {r.admin_note && (
                  <div className="text-xs text-foreground bg-muted rounded-lg px-3 py-2 mt-2">
                    <b>Support:</b> {r.admin_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Refund modal */}
      {refundFor && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
          <div className="bg-background rounded-2xl max-w-md w-full p-6">
            <h3 className="font-semibold text-lg">Request a refund</h3>
            <p className="text-sm text-muted-foreground mt-1">
              For invoice of ${refundFor.amount_paid.toFixed(2)} on{" "}
              {refundFor.created ? new Date(refundFor.created).toLocaleDateString() : "—"}.
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Tell us what happened…"
              className="mt-4 w-full h-32 rounded-lg border border-border p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground"
              maxLength={1000}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundFor(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  refundMut.mutate({
                    stripe_invoice_id: refundFor.id,
                    amount_usd: refundFor.amount_paid,
                    reason: refundReason,
                  })
                }
                disabled={!refundReason.trim() || refundMut.isPending}
              >
                Submit request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutSecret && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Complete your payment</h3>
              <button onClick={() => setCheckoutSecret(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => checkoutSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-blue-50 text-blue-700",
    rejected: "bg-red-50 text-red-700",
    refunded: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
