
-- Phase 3: Extension session + refresh tokens
CREATE TABLE public.extension_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  session_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extension_sessions_user ON public.extension_sessions(user_id);
CREATE INDEX idx_extension_sessions_api_key ON public.extension_sessions(api_key_id);
CREATE INDEX idx_extension_sessions_session_hash ON public.extension_sessions(session_token_hash);
CREATE INDEX idx_extension_sessions_refresh_hash ON public.extension_sessions(refresh_token_hash);

GRANT SELECT ON public.extension_sessions TO authenticated;
GRANT ALL ON public.extension_sessions TO service_role;

ALTER TABLE public.extension_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.extension_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sessions"
  ON public.extension_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Auto-revoke sessions when API key is revoked or device binding reset.
CREATE OR REPLACE FUNCTION public.revoke_sessions_on_key_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at AND NEW.revoked_at IS NOT NULL)
     OR (NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint) THEN
    UPDATE public.extension_sessions
      SET revoked_at = now()
      WHERE api_key_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_sessions_on_key_change ON public.api_keys;
CREATE TRIGGER trg_revoke_sessions_on_key_change
  AFTER UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_sessions_on_key_change();
