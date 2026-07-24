import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const updateMyProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    full_name?: string | null;
    company?: string | null;
    phone?: string | null;
    timezone?: string | null;
    bio?: string | null;
    website?: string | null;
    avatar_url?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of ['full_name', 'company', 'phone', 'timezone', 'bio', 'website', 'avatar_url'] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { error } = await supabase.from('profiles').update(patch as any).eq('id', userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAvatarSignedUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: signed, error } = await supabase.storage.from('avatars').createSignedUrl(data.path, 60 * 60 * 24 * 7);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => {
    if (d.confirm !== 'DELETE') throw new Error('Please type DELETE to confirm.');
    return d;
  })
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    // Cascades via FK: profiles, user_roles, subscriptions, scan_logs, support_*, api_keys, refund_requests
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
