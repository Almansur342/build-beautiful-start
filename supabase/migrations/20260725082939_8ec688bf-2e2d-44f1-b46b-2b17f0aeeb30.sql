
-- Explicit deny policies for anon/authenticated on api_rate_limits (service_role bypasses RLS).
CREATE POLICY "api_rate_limits deny anon" ON public.api_rate_limits AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "api_rate_limits deny authenticated" ON public.api_rate_limits AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;

REVOKE ALL ON FUNCTION public.cleanup_api_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_api_rate_limits() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_api_rate_limits() FROM authenticated;
