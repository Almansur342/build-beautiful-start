import { loadStripe, type Stripe } from "@stripe/stripe-js";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export type StripeEnv = "sandbox" | "live";

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  // Sandbox default lets Stripe upgrade flow surface a clear error rather than crash the dashboard.
  return "sandbox";
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = clientToken ? loadStripe(clientToken) : Promise.resolve(null);
  }
  return stripePromise;
}
