
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_updated_at_idx
  ON public.api_rate_limits (updated_at);

GRANT ALL ON public.api_rate_limits TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (BYPASSRLS) can access.

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _bucket TEXT,
  _max_hits INTEGER,
  _window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, hits INTEGER, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _window_start TIMESTAMPTZ;
  _current_hits INTEGER;
BEGIN
  -- Fixed window bucketed to _window_seconds.
  _window_start := to_timestamp(
    floor(extract(epoch FROM _now) / _window_seconds) * _window_seconds
  );

  INSERT INTO public.api_rate_limits (bucket, window_start, hits, updated_at)
  VALUES (_bucket, _window_start, 1, _now)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET hits = public.api_rate_limits.hits + 1, updated_at = _now
  RETURNING public.api_rate_limits.hits INTO _current_hits;

  IF _current_hits <= _max_hits THEN
    RETURN QUERY SELECT TRUE, _current_hits, 0;
  ELSE
    RETURN QUERY SELECT
      FALSE,
      _current_hits,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (_window_start + make_interval(secs => _window_seconds) - _now)))::INTEGER
      );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Housekeeping helper (optional cron): delete rate-limit rows older than 1 day.
CREATE OR REPLACE FUNCTION public.cleanup_api_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.api_rate_limits WHERE updated_at < now() - INTERVAL '1 day';
$$;
REVOKE ALL ON FUNCTION public.cleanup_api_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_api_rate_limits() TO service_role;
