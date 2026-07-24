import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'super_admin' });
  if (!data) throw new Error('Forbidden: super admin only');
}

export const adminGetOverview = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const [users, keys, totalScans, plans, settings] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, email, full_name, banned, created_at').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('api_keys').select('id, user_id, key_prefix, device_fingerprint, bound_at, last_used_at, revoked_at'),
      supabaseAdmin.from('scan_logs').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('plans').select('*').order('sort_order'),
      supabaseAdmin.from('app_settings').select('*'),
    ]);
    const { count: totalScansToday } = await supabaseAdmin
      .from('scan_logs')
      .select('id', { count: 'exact', head: true })
      .gte('scanned_at', new Date(new Date().toISOString().slice(0, 10)).toISOString());
    return {
      users: users.data ?? [],
      apiKeys: keys.data ?? [],
      totalScansToday: totalScansToday ?? 0,
      totalScans: totalScans.count ?? 0,
      plans: plans.data ?? [],
      settings: settings.data ?? [],
    };
  });

export const adminUpdatePlan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; price_usd?: number; daily_scan_limit?: number | null; validity_days?: number | null; is_active?: boolean; name?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { id, ...updates } = data;
    const { error } = await supabaseAdmin.from('plans').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateSetting = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('app_settings').upsert({ key: data.key, value: data.value as any, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRevokeUserKey = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('user_id', data.user_id).is('revoked_at', null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetUserDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('api_keys').update({ device_fingerprint: null, bound_at: null }).eq('user_id', data.user_id).is('revoked_at', null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleBan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; banned: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('profiles').update({ banned: data.banned }).eq('id', data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPromoteUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('user_roles').upsert({ user_id: data.user_id, role: 'super_admin' as any });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAssignPlan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; plan_slug: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: plan } = await supabaseAdmin.from('plans').select('id, validity_days').eq('slug', data.plan_slug).maybeSingle();
    if (!plan) throw new Error('Plan not found');
    const period_end = plan.validity_days ? new Date(Date.now() + plan.validity_days * 86400_000).toISOString() : null;
    // Deactivate existing active subs
    await supabaseAdmin.from('subscriptions').update({ status: 'canceled' }).eq('user_id', data.user_id).eq('status', 'active');
    const { error } = await supabaseAdmin.from('subscriptions').insert({ user_id: data.user_id, plan_id: plan.id, status: 'active', current_period_end: period_end });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
