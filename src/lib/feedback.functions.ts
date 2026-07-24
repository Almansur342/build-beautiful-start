import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const submitFeedback = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rating: number; category?: string; message?: string }) => {
    const rating = Math.round(Number(d.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error('Rating must be 1–5');
    const category = (d.category ?? '').trim().slice(0, 60) || null;
    const message = (d.message ?? '').trim().slice(0, 2000) || null;
    return { rating, category, message };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      rating: data.rating,
      category: data.category,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyFeedback = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListFeedback = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { data, error } = await supabase
      .from('feedback')
      .select('*, profiles(email, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
