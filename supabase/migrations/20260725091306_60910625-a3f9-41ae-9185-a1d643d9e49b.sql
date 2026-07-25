
CREATE TABLE public.security_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  api_key_id UUID,
  session_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  reason TEXT,
  ip_hash TEXT,
  device_hash TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX security_events_created_at_idx ON public.security_events (created_at DESC);
CREATE INDEX security_events_user_idx ON public.security_events (user_id, created_at DESC);
CREATE INDEX security_events_type_idx ON public.security_events (event_type, created_at DESC);
CREATE INDEX security_events_severity_idx ON public.security_events (severity, created_at DESC) WHERE severity IN ('warn','critical');

GRANT ALL ON public.security_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.security_events_id_seq TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
