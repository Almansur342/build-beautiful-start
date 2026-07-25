
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _bucket TEXT,
  _max_hits INTEGER,
  _window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, hits INTEGER, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _window_start TIMESTAMPTZ;
  _current_hits INTEGER;
BEGIN
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

CREATE OR REPLACE FUNCTION public.cleanup_api_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  DELETE FROM public.api_rate_limits WHERE updated_at < now() - INTERVAL '1 day';
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_api_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_api_rate_limits() TO service_role;
