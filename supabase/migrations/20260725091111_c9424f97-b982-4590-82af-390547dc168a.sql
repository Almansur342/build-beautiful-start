ALTER TABLE public.extension_sessions
  ADD COLUMN IF NOT EXISTS previous_refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS rotation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reuse_detected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS extension_sessions_prev_refresh_idx
  ON public.extension_sessions (previous_refresh_token_hash)
  WHERE previous_refresh_token_hash IS NOT NULL;