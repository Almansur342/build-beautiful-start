REVOKE EXECUTE ON FUNCTION public.get_effective_scan_limits(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_scan_limits(UUID) TO service_role;