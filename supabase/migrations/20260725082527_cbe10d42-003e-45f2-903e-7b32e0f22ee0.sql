INSERT INTO public.app_settings (key, value) VALUES
  ('scan_disabled', 'false'::jsonb),
  ('remote_config_ttl_minutes', '15'::jsonb),
  ('batch_max_events', '25'::jsonb),
  ('session_ttl_hint_minutes', '30'::jsonb),
  ('notice', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;