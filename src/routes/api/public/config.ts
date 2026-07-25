import { createFileRoute } from "@tanstack/react-router";
import { corsFactory, corsHeaders, jsonResponse, preflight, bodyTooLarge } from "./-cors";
import { checkRateLimit, clientIp, rateLimitResponse, RATE_LIMIT_PRESETS } from "./-rate-limit";
import { signPayload } from "./-signing";

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

const METHODS = "GET, OPTIONS" as const;

export const Route = createFileRoute("/api/public/config")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request.headers.get("origin"), METHODS),
      GET: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (bodyTooLarge(request)) {
          return jsonResponse({ ok: false, reason: "payload_too_large", message: "Request too large." }, { status: 413, origin, methods: METHODS });
        }
        const ip = clientIp(request);
        // Public config: fail-open on rate-limit infra failure (availability > strictness).
        const rl = await checkRateLimit(`config:${ip}`, RATE_LIMIT_PRESETS.config.max, RATE_LIMIT_PRESETS.config.windowSeconds);
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsFactory(METHODS), METHODS);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("app_settings").select("key, value");
        if (error) {
          return jsonResponse({ ok: false, message: "Config unavailable" }, { status: 503, origin, methods: METHODS });
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
              ...corsHeaders(origin, METHODS),
            },
          },
        );
      },
    },
  },
});
