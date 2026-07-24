import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
  if (!data) throw new Error('Forbidden');
}

export const listMyTickets = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTicket = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; body: string; priority?: string }) => {
    const subject = (d.subject ?? '').trim();
    const body = (d.body ?? '').trim();
    if (!subject) throw new Error('Subject required');
    if (!body) throw new Error('Message required');
    if (subject.length > 200) throw new Error('Subject too long');
    if (body.length > 2000) throw new Error('Message too long');
    const priority = ['low', 'normal', 'high', 'urgent'].includes(d.priority ?? '') ? d.priority! : 'normal';
    return { subject, body, priority };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({ user_id: userId, subject: data.subject, priority: data.priority, unread_for_admin: 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: msgErr } = await supabase.from('support_messages').insert({
      user_id: userId,
      sender: 'user',
      body: data.body,
      ticket_id: ticket.id,
    });
    if (msgErr) throw new Error(msgErr.message);
    return ticket;
  });

export const listTicketMessages = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify access (RLS also enforces)
    const { data: t } = await supabase.from('support_tickets').select('id, user_id').eq('id', data.ticketId).maybeSingle();
    if (!t) throw new Error('Not found');
    const { data: msgs, error } = await supabase
      .from('support_messages')
      .select('id, sender, body, created_at')
      .eq('ticket_id', data.ticketId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    // Mark read for viewer
    if (t.user_id === userId) {
      await supabase.from('support_tickets').update({ unread_for_user: 0 }).eq('id', data.ticketId);
    }
    return msgs ?? [];
  });

export const replyTicket = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string; body: string }) => {
    const body = (d.body ?? '').trim();
    if (!body) throw new Error('Message required');
    if (body.length > 2000) throw new Error('Message too long');
    return { ticketId: d.ticketId, body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: t, error: te } = await supabase
      .from('support_tickets')
      .select('id, user_id, status')
      .eq('id', data.ticketId)
      .maybeSingle();
    if (te) throw new Error(te.message);
    if (!t) throw new Error('Not found');
    const isOwner = t.user_id === userId;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isOwner && !isAdmin) throw new Error('Forbidden');
    const sender = isOwner ? 'user' : 'support';
    const { error } = await supabase.from('support_messages').insert({
      user_id: t.user_id,
      sender,
      body: data.body,
      ticket_id: t.id,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from('support_tickets')
      .update({
        last_message_at: new Date().toISOString(),
        status: sender === 'user' ? 'open' : 'pending',
        unread_for_admin: sender === 'user' ? (t as any).unread_for_admin ? (t as any).unread_for_admin + 1 : 1 : 0,
        unread_for_user: sender === 'support' ? 1 : 0,
      })
      .eq('id', t.id);
    return { ok: true };
  });

export const setTicketStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string; status: 'open' | 'pending' | 'resolved' | 'closed' }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: t } = await supabase.from('support_tickets').select('user_id').eq('id', data.ticketId).maybeSingle();
    if (!t) throw new Error('Not found');
    const isOwner = t.user_id === userId;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!isOwner && !isAdmin) throw new Error('Forbidden');
    const { error } = await supabase.from('support_tickets').update({ status: data.status }).eq('id', data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin
export const adminListAllTickets = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, profiles(email, full_name)')
      .order('last_message_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
