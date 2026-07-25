create table if not exists public.scan_preflight_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  device_fingerprint text not null,
  website_url text not null,
  event_id text not null,
  scan_id text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

GRANT ALL ON public.scan_preflight_tokens TO service_role;

create index if not exists scan_preflight_tokens_lookup_idx on public.scan_preflight_tokens(token_hash, expires_at);
create index if not exists scan_preflight_tokens_user_idx on public.scan_preflight_tokens(user_id, created_at desc);

alter table public.scan_preflight_tokens enable row level security;

-- No policies: RLS enabled with zero policies denies all non-service-role access,
-- so only server-side supabaseAdmin (service_role) can read/write these tokens.

-- Re-assert the tighter grants from earlier pending migrations (idempotent).
REVOKE EXECUTE ON FUNCTION public.get_effective_scan_limits(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_scan_limits(UUID) TO service_role;