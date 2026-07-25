import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  api_key: z.string().trim().regex(/^qlk_[a-f0-9]{40}$/i, "Invalid API key format"),
  device_fingerprint: z.string().trim().min(8).max(200),
  user_agent: z.string().trim().max(300).optional(),
});

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

export const Route = createFileRoute("/api/public/scan/session")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const { checkRateLimit, clientIp, rateLimitResponse, RATE_LIMIT_PRESETS } = await import("../-rate-limit");
        const ip = clientIp(request);
        const rl = await checkRateLimit(`session:${ip}`, RATE_LIMIT_PRESETS.session.max, RATE_LIMIT_PRESETS.session.windowSeconds);
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsHeaders);
        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ ok: false, reason: "bad_request", message: "Invalid request body." }, { status: 400, origin }); }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return json({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid session request." }, { status: 400, origin });
        const { api_key: apiKey, device_fingerprint: device, user_agent } = parsed.data;

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const keyHash = await sha256Hex(apiKey);

        const { data: keyRow, error: keyError } = await admin.from("api_keys").select("id, user_id, device_fingerprint, revoked_at").eq("key_hash", keyHash).maybeSingle();
        if (keyError) return json({ ok: false, reason: "service_error", message: "Session service is temporarily unavailable." }, { status: 503, origin });
        if (!keyRow) return json({ ok: false, reason: "invalid_key", message: "Invalid API key. Regenerate one from your dashboard." }, { status: 401, origin });
        if (keyRow.revoked_at) return json({ ok: false, reason: "revoked", message: "This API key has been revoked. Generate a new one." }, { status: 401, origin });

        const { data: profile } = await admin.from("profiles").select("banned").eq("id", keyRow.user_id).maybeSingle();
        if (profile?.banned) return json({ ok: false, reason: "banned", message: "This account has been suspended." }, { status: 403, origin });

        // Bind device if unbound; reject mismatch.
        if (!keyRow.device_fingerprint) {
          const { error: bindError } = await admin.from("api_keys").update({ device_fingerprint: device, bound_at: new Date().toISOString() }).eq("id", keyRow.id);
          if (bindError) return json({ ok: false, reason: "service_error", message: "Could not bind this device. Please try again." }, { status: 503, origin });
        } else if (keyRow.device_fingerprint !== device) {
          return json({ ok: false, reason: "device_mismatch", message: "This API key is locked to another device. Reset device binding from your dashboard." }, { status: 403, origin });
        }

        // Revoke any prior active sessions for this key + device (one active session per device).
        await admin.from("extension_sessions").update({ revoked_at: new Date().toISOString() }).eq("api_key_id", keyRow.id).is("revoked_at", null);

        const sessionToken = "qls_" + randomToken(32);
        const refreshToken = "qlr_" + randomToken(32);
        const now = new Date();
        const sessionExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);
        const refreshExpiresAt = new Date(now.getTime() + REFRESH_TTL_MS);

        const { error: insertError } = await admin.from("extension_sessions").insert({
          user_id: keyRow.user_id,
          api_key_id: keyRow.id,
          device_fingerprint: device,
          session_token_hash: await sha256Hex(sessionToken),
          refresh_token_hash: await sha256Hex(refreshToken),
          session_expires_at: sessionExpiresAt.toISOString(),
          refresh_expires_at: refreshExpiresAt.toISOString(),
          user_agent: user_agent ?? null,
        });
        if (insertError) return json({ ok: false, reason: "service_error", message: "Could not start session. Please try again." }, { status: 503, origin });

        return json({
          ok: true,
          session_token: sessionToken,
          refresh_token: refreshToken,
          session_expires_at: sessionExpiresAt.toISOString(),
          refresh_expires_at: refreshExpiresAt.toISOString(),
        }, { origin });
      },
    },
  },
});
