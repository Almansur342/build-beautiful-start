-- get_today_scan_count doesn't need elevated privileges; users can read their own scan_logs under RLS.
CREATE OR REPLACE FUNCTION public.get_today_scan_count(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INT FROM public.scan_logs
  WHERE user_id = _user_id AND scanned_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
$function$;