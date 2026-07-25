
-- Atomic daily usage tracking
CREATE TABLE IF NOT EXISTS public.user_usage_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_usage_daily_unique UNIQUE (user_id, usage_date),
  CONSTRAINT user_usage_daily_used_nonneg CHECK (used_count >= 0)
);

GRANT SELECT ON public.user_usage_daily TO authenticated;
GRANT ALL ON public.user_usage_daily TO service_role;
ALTER TABLE public.user_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily usage"
  ON public.user_usage_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_usage_daily_user_date_idx
  ON public.user_usage_daily (user_id, usage_date DESC);

-- Idempotency store for scan events (prevents retry double-count)
CREATE TABLE IF NOT EXISTS public.scan_events (
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

GRANT ALL ON public.scan_events TO service_role;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS scan_events_user_created_idx
  ON public.scan_events (user_id, created_at DESC);

-- Atomic quota consumption
CREATE OR REPLACE FUNCTION public.consume_scan_quota(
  _user_id UUID,
  _limit INTEGER,
  _event_id TEXT DEFAULT NULL,
  _scan_id TEXT DEFAULT NULL,
  _website_url TEXT DEFAULT NULL
)
RETURNS TABLE (allowed BOOLEAN, used INTEGER, remaining INTEGER, duplicate BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_used INTEGER;
  v_duplicate BOOLEAN := FALSE;
  v_inserted BOOLEAN := FALSE;
BEGIN
  -- Idempotency: if event_id supplied and already recorded, return current usage without incrementing
  IF _event_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.scan_events (event_id, user_id, scan_id, website_url)
      VALUES (_event_id, _user_id, _scan_id, _website_url);
      v_inserted := TRUE;
    EXCEPTION WHEN unique_violation THEN
      v_duplicate := TRUE;
    END;
  END IF;

  -- Atomic upsert + increment (only when it's a fresh event, or no idempotency key provided)
  IF NOT v_duplicate THEN
    INSERT INTO public.user_usage_daily (user_id, usage_date, used_count)
    VALUES (_user_id, v_today, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
      used_count = public.user_usage_daily.used_count + 1,
      updated_at = now()
    WHERE _limit IS NULL OR public.user_usage_daily.used_count < _limit
    RETURNING used_count INTO v_used;

    IF v_used IS NULL THEN
      -- limit reached, roll back the idempotency insert so future retries can still consume when limit is raised
      IF v_inserted THEN
        DELETE FROM public.scan_events WHERE user_id = _user_id AND event_id = _event_id;
      END IF;
      SELECT used_count INTO v_used FROM public.user_usage_daily
        WHERE user_id = _user_id AND usage_date = v_today;
      v_used := COALESCE(v_used, 0);
      RETURN QUERY SELECT FALSE, v_used,
        CASE WHEN _limit IS NULL THEN NULL ELSE GREATEST(0, _limit - v_used) END,
        FALSE;
      RETURN;
    END IF;
  ELSE
    SELECT used_count INTO v_used FROM public.user_usage_daily
      WHERE user_id = _user_id AND usage_date = v_today;
    v_used := COALESCE(v_used, 0);
  END IF;

  RETURN QUERY SELECT TRUE, v_used,
    CASE WHEN _limit IS NULL THEN NULL ELSE GREATEST(0, _limit - v_used) END,
    v_duplicate;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_usage_daily_set_updated_at ON public.user_usage_daily;
CREATE TRIGGER user_usage_daily_set_updated_at
  BEFORE UPDATE ON public.user_usage_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
