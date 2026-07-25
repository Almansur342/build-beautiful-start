
REVOKE ALL ON FUNCTION public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;

CREATE POLICY "scan_events service only"
  ON public.scan_events FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
