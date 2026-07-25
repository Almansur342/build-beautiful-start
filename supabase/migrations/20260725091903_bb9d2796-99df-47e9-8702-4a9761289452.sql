-- Phase I: Revoke EXECUTE on privileged SECURITY DEFINER functions from public/anon/authenticated.
-- These are only called by the service_role from server endpoints; signed-in users must not invoke them directly.

REVOKE ALL ON FUNCTION public.consume_scan_quota(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(uuid, integer, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_api_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_api_rate_limits() TO service_role;

-- has_role and get_today_scan_count are legitimately called by signed-in users (RLS policies, dashboard);
-- keep them callable by authenticated.