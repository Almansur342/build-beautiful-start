import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listMyMessages = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, sender, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendMyMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { body: string }) => {
    const body = (d.body ?? '').trim();
    if (!body) throw new Error('Message cannot be empty');
    if (body.length > 2000) throw new Error('Message too long');
    return { body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from('support_messages').insert({
      user_id: userId,
      sender: 'user',
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: list distinct threads (latest message per user)
export const adminListThreads = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { data, error } = await supabase
      .from('support_messages')
      .select('user_id, body, sender, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const byUser = new Map<string, any>();
    for (const m of data ?? []) if (!byUser.has(m.user_id)) byUser.set(m.user_id, m);
    const userIds = Array.from(byUser.keys());
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: pr } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);
      profiles = pr ?? [];
    }
    return userIds.map((uid) => ({
      user_id: uid,
      last: byUser.get(uid),
      profile: profiles.find((p) => p.id === uid) ?? null,
    }));
  });

export const adminListThreadMessages = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { data: msgs, error } = await supabase
      .from('support_messages')
      .select('id, sender, body, created_at')
      .eq('user_id', data.userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

export const adminReplyMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; body: string }) => {
    const body = (d.body ?? '').trim();
    if (!body) throw new Error('Message cannot be empty');
    if (body.length > 2000) throw new Error('Message too long');
    return { userId: d.userId, body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { error } = await supabase.from('support_messages').insert({
      user_id: data.userId,
      sender: 'support',
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
