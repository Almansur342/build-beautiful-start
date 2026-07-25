import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from './stripe.server';

const ZERO_DECIMAL = new Set(['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','ugx','vnd','vuv','xaf','xof','xpf']);
const THREE_DECIMAL = new Set(['bhd','jod','kwd','omr','tnd']);
function toMajor(a: number | null | undefined, c: string) {
  const v = a ?? 0; const cc = (c ?? '').toLowerCase();
  if (ZERO_DECIMAL.has(cc)) return v;
  if (THREE_DECIMAL.has(cc)) return v / 1000;
  return v / 100;
}

type InvoiceRow = {
  id: string;
  status: string | null;
  amount_paid: number;
  currency: string;
  created: string | null;
  hosted_invoice_url: string | null;
  pdf_url: string | null;
  plan: string | null;
  refundable: boolean;
};

export const getMyBillingData = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment: StripeEnv }) => d)
  .handler(async ({ data, context }): Promise<{ invoices: InvoiceRow[]; refunds: any[] } | { error: string }> => {
    const { userId, supabase } = context;
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email ?? undefined;
      const stripe = createStripeClient(data.environment);
      if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error('Invalid userId');

      const customerIds = new Set<string>();
      try {
        const subs = await stripe.subscriptions.search({ query: `metadata['userId']:'${userId}'`, limit: 100 });
        for (const s of subs.data) {
          const c = typeof s.customer === 'string' ? s.customer : s.customer?.id;
          if (c) customerIds.add(c);
        }
      } catch {}
      try {
        const cs = await stripe.customers.search({ query: `metadata['userId']:'${userId}'`, limit: 100 });
        for (const c of cs.data) customerIds.add(c.id);
      } catch {}
      if (customerIds.size === 0 && email) {
        const byE = await stripe.customers.list({ email, limit: 100 });
        for (const c of byE.data) customerIds.add(c.id);
      }

      const invoices: InvoiceRow[] = [];
      for (const cid of customerIds) {
        const list = await stripe.invoices.list({ customer: cid, limit: 50 });
        for (const inv of list.data) {
          const line = inv.lines?.data?.[0] as any;
          const createdMs = inv.created ? inv.created * 1000 : 0;
          const refundable = inv.status === 'paid' && Date.now() - createdMs < 30 * 24 * 60 * 60 * 1000;
          invoices.push({
            id: inv.id ?? '',
            status: inv.status ?? null,
            amount_paid: toMajor(inv.amount_paid, inv.currency),
            currency: inv.currency,
            created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            hosted_invoice_url: inv.hosted_invoice_url ?? null,
            pdf_url: inv.invoice_pdf ?? null,
            plan: line?.price?.lookup_key ?? line?.price?.metadata?.lovable_external_id ?? null,
            refundable,
          });
        }
      }

      const { data: refunds } = await supabase
        .from('refund_requests')
        .select('id, stripe_invoice_id, amount_usd, reason, status, admin_note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return { invoices, refunds: refunds ?? [] };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

export const createRefundRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stripe_invoice_id: string; amount_usd: number; reason: string }) => {
    const reason = (d.reason ?? '').trim();
    if (!reason) throw new Error('Reason is required');
    if (reason.length > 1000) throw new Error('Reason too long');
    if (!d.stripe_invoice_id) throw new Error('Invoice required');
    return { stripe_invoice_id: d.stripe_invoice_id, amount_usd: d.amount_usd, reason };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from('refund_requests').insert({
      user_id: userId,
      stripe_invoice_id: data.stripe_invoice_id,
      amount_usd: data.amount_usd,
      reason: data.reason,
      status: 'pending',
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListRefunds = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { data, error } = await supabase
      .from('refund_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean))) as string[];
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    return rows.map((r: any) => ({ ...r, profiles: profilesById[r.user_id] ?? null }));
  });

export const adminUpdateRefund = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: 'approved' | 'rejected' | 'refunded'; admin_note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { error } = await supabase
      .from('refund_requests')
      .update({ status: data.status, admin_note: data.admin_note ?? null, updated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
