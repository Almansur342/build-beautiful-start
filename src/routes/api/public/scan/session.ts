import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsFactory, jsonResponse, preflight, bodyTooLarge } from "../-cors";
import { checkComposite, clientIp, deviceBucketId, rateLimitResponse, RATE_LIMIT_PRESETS } from "../-rate-limit";

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

const METHODS = "POST, OPTIONS" as const;

export const Route = createFileRoute("/api/public/scan/session")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request.headers.get("origin"), METHODS),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (bodyTooLarge(request)) return jsonResponse({ ok: false, reason: "payload_too_large", message: "Request too large." }, { status: 413, origin });
        const ip = clientIp(request);

        let raw: unknown;
        try { raw = await request.json(); } catch { return jsonResponse({ ok: false, reason: "bad_request", message: "Invalid request body." }, { status: 400, origin }); }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return jsonResponse({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid session request." }, { status: 400, origin });
        const { api_key: apiKey, device_fingerprint: device, user_agent } = parsed.data;

        // Multi-dimensional rate-limit: IP + device + api-key-prefix.
        // Fail-closed on infra failure — session creation is a sensitive mutation.
        const keyPrefix = apiKey.slice(0, 12).toLowerCase();
        const deviceKey = await deviceBucketId(device);
        const rl = await checkComposite([
          { key: `session:ip:${ip}`, max: RATE_LIMIT_PRESETS.session.max, windowSeconds: RATE_LIMIT_PRESETS.session.windowSeconds },
          { key: `session:dev:${deviceKey}`, max: 10, windowSeconds: 60 },
          { key: `session:key:${keyPrefix}`, max: 20, windowSeconds: 60 },
        ], { failClosed: true });
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsFactory(METHODS), METHODS);

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const keyHash = await sha256Hex(apiKey);

        const { data: keyRow, error: keyError } = await admin.from("api_keys").select("id, user_id, device_fingerprint, revoked_at").eq("key_hash", keyHash).maybeSingle();
        if (keyError) return jsonResponse({ ok: false, reason: "service_error", message: "Session service is temporarily unavailable." }, { status: 503, origin });
        if (!keyRow) return jsonResponse({ ok: false, reason: "invalid_key", message: "Invalid API key. Regenerate one from your dashboard." }, { status: 401, origin });
        if (keyRow.revoked_at) return jsonResponse({ ok: false, reason: "revoked", message: "This API key has been revoked. Generate a new one." }, { status: 401, origin });

        const { data: profile } = await admin.from("profiles").select("banned").eq("id", keyRow.user_id).maybeSingle();
        if (profile?.banned) return jsonResponse({ ok: false, reason: "banned", message: "This account has been suspended." }, { status: 403, origin });

        if (!keyRow.device_fingerprint) {
          const { error: bindError } = await admin.from("api_keys").update({ device_fingerprint: device, bound_at: new Date().toISOString() }).eq("id", keyRow.id);
          if (bindError) return jsonResponse({ ok: false, reason: "service_error", message: "Could not bind this device. Please try again." }, { status: 503, origin });
        } else if (keyRow.device_fingerprint !== device) {
          return jsonResponse({ ok: false, reason: "device_mismatch", message: "This API key is locked to another device. Reset device binding from your dashboard." }, { status: 403, origin });
        }

        // Revoke prior active sessions for this key + device.
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
        if (insertError) return jsonResponse({ ok: false, reason: "service_error", message: "Could not start session. Please try again." }, { status: 503, origin });

        return jsonResponse({
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
