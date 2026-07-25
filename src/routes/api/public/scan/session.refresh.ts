import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  refresh_token: z.string().trim().regex(/^qlr_[a-f0-9]{64}$/i, "Invalid refresh token"),
  device_fingerprint: z.string().trim().min(8).max(200),
});

const SESSION_TTL_MS = 30 * 60 * 1000;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body: unknown, init: ResponseInit & { origin?: string | null } = {}) {
  const { origin, ...rest } = init;
  return new Response(JSON.stringify(body), {
    ...rest,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin ?? null), ...(rest.headers || {}) },
  });
}

export const Route = createFileRoute("/api/public/scan/session/refresh")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const { checkRateLimit, clientIp, rateLimitResponse, RATE_LIMIT_PRESETS } = await import("../_rate-limit");
        const ip = clientIp(request);
        const rl = await checkRateLimit(`refresh:${ip}`, RATE_LIMIT_PRESETS.refresh.max, RATE_LIMIT_PRESETS.refresh.windowSeconds);
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsHeaders);
        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ ok: false, reason: "bad_request", message: "Invalid request body." }, { status: 400, origin }); }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return json({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid refresh request." }, { status: 400, origin });
        const { refresh_token, device_fingerprint } = parsed.data;

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const refreshHash = await sha256Hex(refresh_token);

        const { data: sessionRow, error } = await admin
          .from("extension_sessions")
          .select("id, api_key_id, user_id, device_fingerprint, refresh_expires_at, revoked_at")
          .eq("refresh_token_hash", refreshHash)
          .maybeSingle();
        if (error) return json({ ok: false, reason: "service_error", message: "Session service is temporarily unavailable." }, { status: 503, origin });
        if (!sessionRow) return json({ ok: false, reason: "invalid_refresh", message: "Session expired. Please re-activate the extension with your API key." }, { status: 401, origin });
        if (sessionRow.revoked_at) return json({ ok: false, reason: "revoked", message: "Session revoked. Please re-activate." }, { status: 401, origin });
        if (new Date(sessionRow.refresh_expires_at) <= new Date()) return json({ ok: false, reason: "expired", message: "Session expired. Please re-activate." }, { status: 401, origin });
        if (sessionRow.device_fingerprint !== device_fingerprint) return json({ ok: false, reason: "device_mismatch", message: "Device mismatch. Please re-activate." }, { status: 403, origin });

        // Rotate session token; keep refresh token.
        const sessionToken = "qls_" + randomToken(32);
        const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
        const { error: updateError } = await admin
          .from("extension_sessions")
          .update({
            session_token_hash: await sha256Hex(sessionToken),
            session_expires_at: sessionExpiresAt.toISOString(),
            last_used_at: new Date().toISOString(),
          })
          .eq("id", sessionRow.id);
        if (updateError) return json({ ok: false, reason: "service_error", message: "Could not refresh session." }, { status: 503, origin });

        return json({
          ok: true,
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt.toISOString(),
        }, { origin });
      },
    },
  },
});
