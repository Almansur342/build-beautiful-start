import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getMyDashboardData = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, subRes, plansRes, settingsRes, todayRes, totalRes, historyRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('id, status, current_period_end, plans(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('app_settings').select('*'),
      supabase.from('user_usage_daily').select('used_count').eq('user_id', userId).eq('usage_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
      supabase.from('scan_events').select('event_id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('scan_events').select('website_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    const settings: Record<string, any> = {};
    for (const s of settingsRes.data ?? []) settings[s.key] = s.value;

    const roles = (roleRes.data ?? []).map((r) => r.role);

    return {
      profile: profileRes.data,
      subscription: subRes.data,
      plans: plansRes.data ?? [],
      settings,
      todayScans: todayRes.data?.used_count ?? 0,
      totalScans: totalRes.count ?? 0,
      history: (historyRes.data ?? []).map((row: any) => ({ website_url: row.website_url, scanned_at: row.created_at })),
      isSuperAdmin: roles.includes('super_admin'),
    };
  });
