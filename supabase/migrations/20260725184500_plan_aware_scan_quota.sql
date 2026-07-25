-- Plan-aware, database-side quota enforcement for LeadLens scans.
-- Keeps the existing RPC name but moves limit authority into the database.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS monthly_scan_limit INTEGER,
  ADD CONSTRAINT plans_daily_scan_limit_nonneg CHECK (daily_scan_limit IS NULL OR daily_scan_limit >= 0) NOT VALID,
  ADD CONSTRAINT plans_monthly_scan_limit_nonneg CHECK (monthly_scan_limit IS NULL OR monthly_scan_limit >= 0) NOT VALID;

INSERT INTO public.plans (slug, name, price_usd, daily_scan_limit, validity_days, sort_order)
VALUES
  ('pro', 'Pro', 3, 2000, 30, 2),
  ('agency', 'Agency', 10, 10000, 30, 3),
  ('team', 'Team', 10, 10000, 30, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  daily_scan_limit = COALESCE(public.plans.daily_scan_limit, EXCLUDED.daily_scan_limit),
  validity_days = COALESCE(public.plans.validity_days, EXCLUDED.validity_days),
  sort_order = LEAST(public.plans.sort_order, EXCLUDED.sort_order);

CREATE TABLE IF NOT EXISTS public.user_quota_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_scan_limit INTEGER,
  monthly_scan_limit INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_quota_overrides_daily_nonneg CHECK (daily_scan_limit IS NULL OR daily_scan_limit >= 0),
  CONSTRAINT user_quota_overrides_monthly_nonneg CHECK (monthly_scan_limit IS NULL OR monthly_scan_limit >= 0)
);

GRANT ALL ON public.user_quota_overrides TO service_role;
ALTER TABLE public.user_quota_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quota overrides admin only" ON public.user_quota_overrides;
CREATE POLICY "quota overrides admin only"
  ON public.user_quota_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.user_usage_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_month DATE NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'UTC')::date,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_usage_monthly_unique UNIQUE (user_id, usage_month),
  CONSTRAINT user_usage_monthly_used_nonneg CHECK (used_count >= 0)
);

GRANT SELECT ON public.user_usage_monthly TO authenticated;
GRANT ALL ON public.user_usage_monthly TO service_role;
ALTER TABLE public.user_usage_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own monthly usage" ON public.user_usage_monthly;
CREATE POLICY "Users can view their own monthly usage"
  ON public.user_usage_monthly FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_usage_monthly_user_month_idx
  ON public.user_usage_monthly (user_id, usage_month DESC);

DROP TRIGGER IF EXISTS user_usage_monthly_set_updated_at ON public.user_usage_monthly;
CREATE TRIGGER user_usage_monthly_set_updated_at
  BEFORE UPDATE ON public.user_usage_monthly
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_effective_scan_limits(_user_id UUID)
RETURNS TABLE (
  plan_slug TEXT,
  plan_name TEXT,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_daily INTEGER := 100;
  v_plan RECORD;
  v_override RECORD;
BEGIN
  SELECT COALESCE(NULLIF((value #>> '{}'), '')::INTEGER, 100)
    INTO v_free_daily
  FROM public.app_settings
  WHERE key = 'free_daily_limit';

  v_free_daily := COALESCE(v_free_daily, 100);

  SELECT p.slug, p.name, p.daily_scan_limit, p.monthly_scan_limit
    INTO v_plan
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = _user_id
    AND s.status IN ('active', 'trialing', 'past_due')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
    AND p.is_active = true
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT daily_scan_limit, monthly_scan_limit
    INTO v_override
  FROM public.user_quota_overrides
  WHERE user_id = _user_id;

  RETURN QUERY SELECT
    COALESCE(v_plan.slug, 'free')::TEXT,
    COALESCE(v_plan.name, 'Free')::TEXT,
    CASE
      WHEN v_override.daily_scan_limit IS NOT NULL THEN v_override.daily_scan_limit
      WHEN v_plan.slug IS NOT NULL THEN v_plan.daily_scan_limit
      ELSE v_free_daily
    END::INTEGER,
    CASE
      WHEN v_override.monthly_scan_limit IS NOT NULL THEN v_override.monthly_scan_limit
      WHEN v_plan.slug IS NOT NULL THEN v_plan.monthly_scan_limit
      ELSE NULL
    END::INTEGER,
    CASE
      WHEN v_override.daily_scan_limit IS NOT NULL OR v_override.monthly_scan_limit IS NOT NULL THEN 'override'
      WHEN v_plan.slug IS NOT NULL THEN 'subscription'
      ELSE 'fallback_free'
    END::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_scan_limits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_scan_limits(UUID) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.consume_scan_quota(
  _user_id UUID,
  _limit INTEGER DEFAULT NULL,
  _event_id TEXT DEFAULT NULL,
  _scan_id TEXT DEFAULT NULL,
  _website_url TEXT DEFAULT NULL,
  _status TEXT DEFAULT 'counted',
  _scan_mode TEXT DEFAULT 'manual'
)
RETURNS TABLE (
  ok BOOLEAN,
  allowed BOOLEAN,
  reason TEXT,
  counted BOOLEAN,
  duplicate BOOLEAN,
  used INTEGER,
  "limit" INTEGER,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  monthly_used INTEGER,
  monthly_limit INTEGER,
  monthly_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_month DATE := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_daily_used INTEGER := 0;
  v_monthly_used INTEGER := 0;
  v_daily_limit INTEGER;
  v_monthly_limit INTEGER;
  v_duplicate BOOLEAN := FALSE;
  v_countable BOOLEAN := COALESCE(_status, 'counted') IN ('counted', 'partial', 'usable_partial', 'success');
  v_reset_at TIMESTAMPTZ := ((v_today + 1)::timestamp AT TIME ZONE 'UTC');
BEGIN
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'missing_user'::TEXT, FALSE, FALSE, 0, 100, 100, v_reset_at, 0, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT daily_limit, monthly_limit
    INTO v_daily_limit, v_monthly_limit
  FROM public.get_effective_scan_limits(_user_id)
  LIMIT 1;

  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::TEXT, 0));

  IF _event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.scan_events WHERE user_id = _user_id AND event_id = _event_id
  ) THEN
    v_duplicate := TRUE;
  END IF;

  SELECT COALESCE(used_count, 0)
    INTO v_daily_used
  FROM public.user_usage_daily
  WHERE user_id = _user_id AND usage_date = v_today;

  v_daily_used := COALESCE(v_daily_used, 0);

  SELECT COALESCE(used_count, 0)
    INTO v_monthly_used
  FROM public.user_usage_monthly
  WHERE user_id = _user_id AND usage_month = v_month;

  v_monthly_used := COALESCE(v_monthly_used, 0);

  IF v_duplicate THEN
    RETURN QUERY SELECT TRUE, TRUE, NULL::TEXT, FALSE, TRUE, v_daily_used, v_daily_limit,
      CASE WHEN v_daily_limit IS NULL THEN NULL ELSE GREATEST(0, v_daily_limit - v_daily_used) END, v_reset_at, v_monthly_used, v_monthly_limit,
      CASE WHEN v_monthly_limit IS NULL THEN NULL ELSE GREATEST(0, v_monthly_limit - v_monthly_used) END;
    RETURN;
  END IF;

  IF v_countable AND v_daily_limit IS NOT NULL AND v_daily_used >= v_daily_limit THEN
    RETURN QUERY SELECT FALSE, FALSE, 'quota_exceeded'::TEXT, FALSE, FALSE, v_daily_used, v_daily_limit,
      0, v_reset_at, v_monthly_used, v_monthly_limit,
      CASE WHEN v_monthly_limit IS NULL THEN NULL ELSE GREATEST(0, v_monthly_limit - v_monthly_used) END;
    RETURN;
  END IF;

  IF v_countable AND v_monthly_limit IS NOT NULL AND v_monthly_used >= v_monthly_limit THEN
    RETURN QUERY SELECT FALSE, FALSE, 'monthly_quota_exceeded'::TEXT, FALSE, FALSE, v_daily_used, v_daily_limit,
      CASE WHEN v_daily_limit IS NULL THEN NULL ELSE GREATEST(0, v_daily_limit - v_daily_used) END, v_reset_at, v_monthly_used, v_monthly_limit, 0;
    RETURN;
  END IF;

  IF _event_id IS NOT NULL THEN
    INSERT INTO public.scan_events (event_id, user_id, scan_id, website_url, status, scan_mode)
    VALUES (_event_id, _user_id, _scan_id, _website_url, COALESCE(_status, 'counted'), COALESCE(_scan_mode, 'manual'));
  END IF;

  IF v_countable THEN
    INSERT INTO public.user_usage_daily (user_id, usage_date, used_count)
    VALUES (_user_id, v_today, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET used_count = public.user_usage_daily.used_count + 1, updated_at = now()
    RETURNING used_count INTO v_daily_used;

    INSERT INTO public.user_usage_monthly (user_id, usage_month, used_count)
    VALUES (_user_id, v_month, 1)
    ON CONFLICT (user_id, usage_month)
    DO UPDATE SET used_count = public.user_usage_monthly.used_count + 1, updated_at = now()
    RETURNING used_count INTO v_monthly_used;
  END IF;

  RETURN QUERY SELECT TRUE, TRUE, NULL::TEXT, v_countable, FALSE, v_daily_used, v_daily_limit,
    CASE WHEN v_daily_limit IS NULL THEN NULL ELSE GREATEST(0, v_daily_limit - v_daily_used) END, v_reset_at, v_monthly_used, v_monthly_limit,
    CASE WHEN v_monthly_limit IS NULL THEN NULL ELSE GREATEST(0, v_monthly_limit - v_monthly_used) END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;


