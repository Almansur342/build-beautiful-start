-- Lead Lens v1.13: atomic scan events are the dashboard source of truth.
ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS scan_mode TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'counted';
DROP POLICY IF EXISTS "Users can view their own scan events" ON public.scan_events;
CREATE POLICY "Users can view their own scan events" ON public.scan_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
GRANT SELECT ON public.scan_events TO authenticated;
CREATE OR REPLACE FUNCTION public.get_today_scan_count(_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE((SELECT used_count FROM public.user_usage_daily
    WHERE user_id = _user_id AND usage_date = (now() AT TIME ZONE 'UTC')::date), 0)::INTEGER;
$$;
REVOKE ALL ON FUNCTION public.get_today_scan_count(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_today_scan_count(UUID) TO authenticated, service_role;
