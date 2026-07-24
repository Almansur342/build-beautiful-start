import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { generateApiKeyPlaintext, hashApiKey } from './apiKey.helpers';

// Generate (or rotate) the caller's API key. Returns plaintext ONCE.
export const generateMyApiKey = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Revoke existing active keys
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null);
    const plaintext = generateApiKeyPlaintext();
    const key_hash = await hashApiKey(plaintext);
    const { data, error } = await supabase
      .from('api_keys')
      .insert({ user_id: userId, key_hash, key_prefix: plaintext.slice(0, 8) })
      .select('id, key_prefix, created_at')
      .single();
    if (error) throw new Error(error.message);
    return { plaintext, id: data.id, key_prefix: data.key_prefix };
  });

export const listMyApiKeys = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, device_fingerprint, bound_at, last_used_at, revoked_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resetMyDeviceBinding = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from('api_keys')
      .update({ device_fingerprint: null, bound_at: null })
      .eq('user_id', userId)
      .is('revoked_at', null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
