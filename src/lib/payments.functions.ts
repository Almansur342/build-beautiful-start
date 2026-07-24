import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from './stripe.server';

type CheckoutResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, opts: { email?: string; userId: string }): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.userId)) throw new Error('Invalid userId');
  const found = await stripe.customers.search({ query: `metadata['userId']:'${opts.userId}'`, limit: 1 });
  if (found.data.length) return found.data[0].id;
  if (opts.email) {
    const byEmail = await stripe.customers.list({ email: opts.email, limit: 1 });
    if (byEmail.data.length) {
      const c = byEmail.data[0];
      await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId: opts.userId } });
      return c.id;
    }
  }
  const created = await stripe.customers.create({ ...(opts.email && { email: opts.email }), metadata: { userId: opts.userId } });
  return created.id;
}

export const createCheckoutSessionForPlan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priceLookupKey: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(d.priceLookupKey)) throw new Error('Invalid price');
    return d;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { userId, supabase } = context;
      const { data: user } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceLookupKey] });
      if (!prices.data.length) return { error: 'Price not found. Please contact support.' };
      const price = prices.data[0];
      const customerId = await resolveOrCreateCustomer(stripe, { email: user.user?.email ?? undefined, userId });
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: price.type === 'recurring' ? 'subscription' : 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, plan_lookup: data.priceLookupKey },
        ...(price.type === 'recurring' && { subscription_data: { metadata: { userId, plan_lookup: data.priceLookupKey } } }),
      });
      return { clientSecret: session.client_secret ?? '' };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
