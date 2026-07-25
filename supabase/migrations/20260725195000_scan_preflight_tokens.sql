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
create index if not exists scan_preflight_tokens_lookup_idx on public.scan_preflight_tokens(token_hash, expires_at);
alter table public.scan_preflight_tokens enable row level security;
