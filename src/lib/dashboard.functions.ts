import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

function nextUtcMidnight(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

export const getMyDashboardData = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const countableStatuses = ['counted', 'partial', 'usable_partial', 'success'];
    const [profileRes, subRes, plansRes, settingsRes, todayRes, totalRes, historyRes, roleRes, limitsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('id, status, current_period_end, plans(*)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('app_settings').select('*'),
      supabase.from('user_usage_daily').select('used_count').eq('user_id', userId).eq('usage_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
      supabase.from('scan_events').select('event_id', { count: 'exact', head: true }).eq('user_id', userId).in('status', countableStatuses),
      supabase.from('scan_events').select('website_url, created_at, status').eq('user_id', userId).in('status', countableStatuses).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.rpc('get_effective_scan_limits', { _user_id: userId }),
    ]);

    const settings: Record<string, any> = {};
    for (const s of settingsRes.data ?? []) settings[s.key] = s.value;

    const roles = (roleRes.data ?? []).map((r) => r.role);

    const subscription = subRes.data && (
      !subRes.data.current_period_end || new Date(subRes.data.current_period_end) > new Date()
    ) ? subRes.data : null;

    const limits = Array.isArray(limitsRes.data) ? limitsRes.data[0] : limitsRes.data;
    const todayScans = todayRes.data?.used_count ?? 0;
    const dailyLimit = limits?.daily_limit ?? null;
    const remainingToday = dailyLimit == null ? null : Math.max(0, dailyLimit - todayScans);
    const usagePct = dailyLimit == null ? 0 : Math.min(100, Math.round((todayScans / (dailyLimit || 1)) * 100));

    return {
      profile: profileRes.data,
      subscription,
      plans: plansRes.data ?? [],
      settings,
      quota: {
        usedToday: todayScans,
        dailyLimit,
        remainingToday,
        resetAt: nextUtcMidnight(),
        usagePct,
        planName: limits?.plan_name ?? 'Free',
        planSlug: limits?.plan_slug ?? 'free',
        source: limits?.source ?? 'fallback_free',
      },
      todayScans,
      totalScans: totalRes.count ?? 0,
      history: (historyRes.data ?? []).map((row: any) => ({ website_url: row.website_url, scanned_at: row.created_at, status: row.status })),
      isSuperAdmin: roles.includes('super_admin'),
    };
  });
