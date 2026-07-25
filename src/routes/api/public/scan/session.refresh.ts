import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsFactory, jsonResponse, preflight, bodyTooLarge } from "../-cors";
import { checkComposite, clientIp, deviceBucketId, rateLimitResponse, RATE_LIMIT_PRESETS } from "../-rate-limit";
import { logSecurityEvent } from "../-audit";

const schema = z.object({
  refresh_token: z.string().trim().regex(/^qlr_[a-f0-9]{64}$/i, "Invalid refresh token"),
  device_fingerprint: z.string().trim().min(8).max(200),
});

// Track 3: short access-token TTL (15 min) forces frequent refresh, minimizing
// the window a leaked session token remains valid.
const SESSION_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export const Route = createFileRoute("/api/public/scan/session/refresh")({
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
        if (!parsed.success) return jsonResponse({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid refresh request." }, { status: 400, origin });
        const { refresh_token, device_fingerprint } = parsed.data;

        const deviceKey = await deviceBucketId(device_fingerprint);
        const rl = await checkComposite([
          { key: `refresh:ip:${ip}`, max: RATE_LIMIT_PRESETS.refresh.max, windowSeconds: RATE_LIMIT_PRESETS.refresh.windowSeconds },
          { key: `refresh:dev:${deviceKey}`, max: 15, windowSeconds: 60 },
        ], { failClosed: true });
        if (!rl.allowed) {
          logSecurityEvent({ eventType: "refresh.rate_limited", severity: "warn", ip, device: device_fingerprint, userAgent: request.headers.get("user-agent") ?? undefined });
          return rateLimitResponse(rl.retryAfter, origin, corsFactory(METHODS), METHODS);
        }

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const refreshHash = await sha256Hex(refresh_token);

        // Track 3: refresh-token reuse detection.
        // Look up the session using EITHER the current refresh token hash OR a
        // previously-rotated hash. A match on `previous_refresh_token_hash`
        // means someone replayed an already-rotated token — treat as theft.
        const { data: sessionRow, error } = await admin
          .from("extension_sessions")
          .select("id, api_key_id, user_id, device_fingerprint, refresh_expires_at, revoked_at, refresh_token_hash, previous_refresh_token_hash, rotation_count")
          .or(`refresh_token_hash.eq.${refreshHash},previous_refresh_token_hash.eq.${refreshHash}`)
          .maybeSingle();
        if (error) return jsonResponse({ ok: false, reason: "service_error", message: "Session service is temporarily unavailable." }, { status: 503, origin });
        if (!sessionRow) {
          logSecurityEvent({ eventType: "refresh.unknown_token", severity: "warn", ip, device: device_fingerprint, userAgent: request.headers.get("user-agent") ?? undefined });
          return jsonResponse({ ok: false, reason: "invalid_refresh", message: "Session expired. Please re-activate the extension with your API key." }, { status: 401, origin });
        }

        // REUSE DETECTED: presented hash matches the previous (already-rotated)
        // token. Revoke ALL live sessions bound to this api_key so both the
        // legitimate client and the attacker are forced to re-activate.
        if (sessionRow.previous_refresh_token_hash === refreshHash && sessionRow.refresh_token_hash !== refreshHash) {
          const nowIso = new Date().toISOString();
          await admin
            .from("extension_sessions")
            .update({ revoked_at: nowIso, reuse_detected_at: nowIso })
            .eq("api_key_id", sessionRow.api_key_id)
            .is("revoked_at", null);
          logSecurityEvent({
            eventType: "refresh.reuse_detected",
            severity: "critical",
            userId: sessionRow.user_id,
            apiKeyId: sessionRow.api_key_id,
            sessionId: sessionRow.id,
            ip,
            device: device_fingerprint,
            userAgent: request.headers.get("user-agent") ?? undefined,
            reason: "Rotated refresh token replayed",
          });
          return jsonResponse({ ok: false, reason: "reuse_detected", message: "Security alert: this session was replayed. All sessions revoked — please re-activate." }, { status: 401, origin });
        }

        if (sessionRow.revoked_at) return jsonResponse({ ok: false, reason: "revoked", message: "Session revoked. Please re-activate." }, { status: 401, origin });
        if (new Date(sessionRow.refresh_expires_at) <= new Date()) return jsonResponse({ ok: false, reason: "expired", message: "Session expired. Please re-activate." }, { status: 401, origin });
        if (sessionRow.device_fingerprint !== device_fingerprint) {
          await admin.from("extension_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionRow.id);
          logSecurityEvent({
            eventType: "refresh.device_mismatch",
            severity: "critical",
            userId: sessionRow.user_id,
            apiKeyId: sessionRow.api_key_id,
            sessionId: sessionRow.id,
            ip,
            device: device_fingerprint,
            userAgent: request.headers.get("user-agent") ?? undefined,
          });
          return jsonResponse({ ok: false, reason: "device_mismatch", message: "Device mismatch. Please re-activate." }, { status: 403, origin });
        }

        // Rotate BOTH tokens. Save the current hash into
        // `previous_refresh_token_hash` so any replay of the old value trips
        // the reuse detector above.
        const sessionToken = "qls_" + randomToken(32);
        const refreshToken = "qlr_" + randomToken(32);
        const nowIso = new Date().toISOString();
        const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
        const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

        const { data: updated, error: updateError } = await admin
          .from("extension_sessions")
          .update({
            session_token_hash: await sha256Hex(sessionToken),
            refresh_token_hash: await sha256Hex(refreshToken),
            previous_refresh_token_hash: refreshHash,
            rotation_count: (sessionRow.rotation_count ?? 0) + 1,
            session_expires_at: sessionExpiresAt.toISOString(),
            refresh_expires_at: refreshExpiresAt.toISOString(),
            last_used_at: nowIso,
          })
          .eq("id", sessionRow.id)
          .eq("refresh_token_hash", refreshHash)
          .select("id")
          .maybeSingle();
        if (updateError) return jsonResponse({ ok: false, reason: "service_error", message: "Could not refresh session." }, { status: 503, origin });
        if (!updated) {
          // Race: another concurrent refresh already rotated. Caller should retry with newest tokens.
          return jsonResponse({ ok: false, reason: "invalid_refresh", message: "Session already refreshed. Retry with the newest tokens." }, { status: 409, origin });
        }

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
