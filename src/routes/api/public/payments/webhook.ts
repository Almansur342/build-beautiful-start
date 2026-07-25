import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function upsertSubscription(sub: any, environment: StripeEnv) {
  const userId = sub.metadata?.userId;
  if (!userId) { console.error("No userId in subscription metadata"); return; }
  const item = sub.items?.data?.[0];
  const lookupKey = item?.price?.lookup_key;
  if (!lookupKey) { console.error("No lookup_key on price"); return; }
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: plan } = await admin.from("plans").select("id, validity_days").eq("stripe_price_id", lookupKey).maybeSingle();
  if (!plan) { console.error("Plan not found for lookup_key", lookupKey); return; }
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan_id: plan.id,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const envParam = new URL(request.url).searchParams.get("env");
        if (envParam !== "sandbox" && envParam !== "live") return new Response("ok", { status: 200 });
        const env: StripeEnv = envParam;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                await supabaseAdmin.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", event.data.object.id);
              }
              break;
            default: break;
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
