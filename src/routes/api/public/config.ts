import { createFileRoute } from "@tanstack/react-router";

// Whitelisted keys returned to the extension. Never expose secrets or admin-only keys.
const PUBLIC_KEYS = [
  "free_tier_enabled",
  "free_daily_limit",
  "scan_disabled",
  "remote_config_ttl_minutes",
  "batch_max_events",
  "session_ttl_hint_minutes",
  "notice",
] as const;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "300",
  };
}

export const Route = createFileRoute("/api/public/config")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),
      GET: async ({ request }) => {
        const origin = request.headers.get("origin");
        const { checkRateLimit, clientIp, rateLimitResponse, RATE_LIMIT_PRESETS } = await import("./_rate-limit");
        const ip = clientIp(request);
        const rl = await checkRateLimit(`config:${ip}`, RATE_LIMIT_PRESETS.config.max, RATE_LIMIT_PRESETS.config.windowSeconds);
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsHeaders);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("app_settings").select("key, value");
        if (error) {
          return new Response(JSON.stringify({ ok: false, message: "Config unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }
        const out: Record<string, unknown> = {};
        for (const row of data ?? []) {
          if ((PUBLIC_KEYS as readonly string[]).includes(row.key)) out[row.key] = row.value;
        }
        return new Response(
          JSON.stringify({
            ok: true,
            config: out,
            server_time: new Date().toISOString(),
            ttl_seconds: Math.max(60, Number(out.remote_config_ttl_minutes ?? 15) * 60),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
              ...corsHeaders(origin),
            },
          },
        );
      },
    },
  },
});
