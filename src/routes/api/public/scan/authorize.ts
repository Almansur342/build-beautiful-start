import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsFactory, jsonResponse, preflight, bodyTooLarge } from "../-cors";
import { checkComposite, clientIp, deviceBucketId, rateLimitResponse, RATE_LIMIT_PRESETS } from "../-rate-limit";
import { logSecurityEvent } from "../-audit";

const authorizationSchema = z.object({
  api_key: z.string().trim().regex(/^qlk_[a-f0-9]{40}$/i, "Invalid API key format").optional(),
  session_token: z.string().trim().regex(/^qls_[a-f0-9]{64}$/i, "Invalid session token").optional(),
  device_fingerprint: z.string().trim().min(8).max(200),
  website_url: z.string().trim().max(500).default(""),
  event_id: z.string().trim().min(8).max(80).optional(),
  scan_id: z.string().trim().min(8).max(80).optional(),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const METHODS = "POST, OPTIONS" as const;
const QUOTA_MESSAGE = "You've reached today's scan limit. Your limit resets at UTC midnight, or you can upgrade to continue scanning.";

function nextUtcMidnight(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

export const Route = createFileRoute("/api/public/scan/authorize")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request.headers.get("origin"), METHODS),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (bodyTooLarge(request)) return jsonResponse({ ok: false, reason: "payload_too_large", message: "Request too large." }, { status: 413, origin });
        const ip = clientIp(request);

        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return jsonResponse({ ok: false, reason: "bad_request", message: "Invalid request body." }, { status: 400, origin });
        }
        const parsed = authorizationSchema.safeParse(rawBody);
        if (!parsed.success) {
          return jsonResponse({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid activation request." }, { status: 400, origin });
        }
        const { api_key: apiKey, session_token: sessionToken, device_fingerprint: device, website_url: websiteUrl, event_id: eventId, scan_id: scanId } = parsed.data;
        if (!apiKey && !sessionToken) return jsonResponse({ ok: false, reason: "bad_request", message: "Missing session_token or api_key." }, { status: 400, origin });

        const deviceKey = await deviceBucketId(device);
        const rlPre = await checkComposite([
          { key: `authorize:ip:${ip}`, max: RATE_LIMIT_PRESETS.authorize.max, windowSeconds: RATE_LIMIT_PRESETS.authorize.windowSeconds },
          { key: `authorize:dev:${deviceKey}`, max: 60, windowSeconds: 60 },
        ], { failClosed: true });
        if (!rlPre.allowed) return rateLimitResponse(rlPre.retryAfter, origin, corsFactory(METHODS), METHODS);

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

        let keyRow: { id: string; user_id: string; device_fingerprint: string | null; revoked_at: string | null } | null = null;

        if (sessionToken) {
          const sessionHash = await sha256Hex(sessionToken);
          const { data: sessionRow, error: sessionError } = await admin
            .from("extension_sessions")
            .select("id, api_key_id, user_id, device_fingerprint, session_expires_at, revoked_at")
            .eq("session_token_hash", sessionHash)
            .maybeSingle();
          if (sessionError) return jsonResponse({ ok: false, reason: "service_error", message: "Session verification is temporarily unavailable." }, { status: 503, origin });
          if (!sessionRow) return jsonResponse({ ok: false, reason: "session_invalid", message: "Session invalid. Refresh your session." }, { status: 401, origin });
          if (sessionRow.revoked_at) return jsonResponse({ ok: false, reason: "session_revoked", message: "Session revoked. Please re-activate." }, { status: 401, origin });
          if (new Date(sessionRow.session_expires_at) <= new Date()) return jsonResponse({ ok: false, reason: "session_expired", message: "Session expired. Refresh your session." }, { status: 401, origin });
          if (sessionRow.device_fingerprint !== device) return jsonResponse({ ok: false, reason: "device_mismatch", message: "Session is bound to a different device." }, { status: 403, origin });

          const { data: kRow, error: kErr } = await admin.from("api_keys").select("id, user_id, device_fingerprint, revoked_at").eq("id", sessionRow.api_key_id).maybeSingle();
          if (kErr) return jsonResponse({ ok: false, reason: "service_error", message: "Key verification is temporarily unavailable." }, { status: 503, origin });
          if (!kRow || kRow.revoked_at) return jsonResponse({ ok: false, reason: "revoked", message: "This API key has been revoked." }, { status: 401, origin });
          keyRow = kRow;

          await admin.from("extension_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", sessionRow.id);
        } else {
          const keyHash = await sha256Hex(apiKey!);
          const { data: kRow, error: keyError } = await admin.from("api_keys").select("id, user_id, device_fingerprint, revoked_at").eq("key_hash", keyHash).maybeSingle();
          if (keyError) return jsonResponse({ ok: false, reason: "service_error", message: "Key verification is temporarily unavailable. Please try again." }, { status: 503, origin });
          if (!kRow) return jsonResponse({ ok: false, reason: "invalid_key", message: "Invalid API key. Regenerate one from your dashboard." }, { status: 401, origin });
          if (kRow.revoked_at) return jsonResponse({ ok: false, reason: "revoked", message: "This API key has been revoked. Generate a new one." }, { status: 401, origin });
          keyRow = kRow;
        }

        const rlUser = await checkComposite([
          { key: `authorize:user:${keyRow.user_id}`, max: 200, windowSeconds: 60 },
        ], { failClosed: true });
        if (!rlUser.allowed) return rateLimitResponse(rlUser.retryAfter, origin, corsFactory(METHODS), METHODS);

        const { data: profile } = await admin.from("profiles").select("banned").eq("id", keyRow.user_id).maybeSingle();
        if (profile?.banned) return jsonResponse({ ok: false, reason: "banned", message: "This account has been suspended." }, { status: 403, origin });

        if (!keyRow.device_fingerprint) {
          const { error: bindError } = await admin.from("api_keys").update({ device_fingerprint: device, bound_at: new Date().toISOString() }).eq("id", keyRow.id);
          if (bindError) return jsonResponse({ ok: false, reason: "service_error", message: "Could not bind this device. Please try again." }, { status: 503, origin });
        } else if (keyRow.device_fingerprint !== device) {
          logSecurityEvent({ eventType: "authorize.device_mismatch", severity: "critical", userId: keyRow.user_id, apiKeyId: keyRow.id, ip, device, userAgent: request.headers.get("user-agent") ?? undefined });
          return jsonResponse({ ok: false, reason: "device_mismatch", message: "This API key is locked to another device. Reset device binding from your dashboard." }, { status: 403, origin });
        }

        const { data: settings } = await admin.from("app_settings").select("key, value");
        const map: Record<string, any> = {};
        for (const s of settings ?? []) map[s.key] = s.value;
        if (map.scan_disabled === true) {
          return jsonResponse({ ok: false, reason: "scan_disabled", message: "Scanning is temporarily paused. Please try again shortly." }, { status: 503, origin });
        }

        const { data: planRows } = await admin.rpc("get_effective_scan_limits", { _user_id: keyRow.user_id });
        const planRow = Array.isArray(planRows) ? planRows[0] : planRows;
        const planLabel = String(planRow?.plan_name ?? "Free");
        const rawLimit = planRow?.daily_limit;
        const limit = rawLimit == null ? null : Number(rawLimit);

        if (!websiteUrl) {
          const today = new Date().toISOString().slice(0, 10);
          const { data: usage } = await admin
            .from("user_usage_daily")
            .select("used_count")
            .eq("user_id", keyRow.user_id)
            .eq("usage_date", today)
            .maybeSingle();
          const used = usage?.used_count ?? 0;
          const resetAt = nextUtcMidnight();
          await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
          if (limit != null && used >= limit) {
            return jsonResponse({ ok: false, reason: "quota_exceeded", message: QUOTA_MESSAGE, used, limit, remaining: 0, reset_at: resetAt, plan: planLabel }, { status: 429, origin });
          }
          return jsonResponse({ ok: true, plan: planLabel, used, limit, remaining: limit == null ? null : Math.max(0, limit - used), reset_at: resetAt }, { origin });
        }

        const rpcArgs: { _user_id: string; _limit?: number | null; _event_id?: string; _scan_id?: string; _website_url?: string; _status?: string } = {
          _user_id: keyRow.user_id,
          _limit: null,
          _website_url: websiteUrl,
          _status: "counted",
        };
        if (eventId) rpcArgs._event_id = eventId;
        if (scanId) rpcArgs._scan_id = scanId;
        const { data: rpcRows, error: rpcError } = await admin.rpc("consume_scan_quota", rpcArgs);
        if (rpcError) return jsonResponse({ ok: false, reason: "service_error", message: "Could not authorize this scan. Please try again." }, { status: 503, origin });
        const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
        if (!row?.ok && !row?.allowed) {
          const used = row?.used ?? 0;
          logSecurityEvent({ eventType: "authorize.quota_exceeded", severity: "warn", userId: keyRow.user_id, apiKeyId: keyRow.id, ip, device, userAgent: request.headers.get("user-agent") ?? undefined, metadata: { used, limit: row?.limit ?? limit, plan: planLabel } });
          return jsonResponse({ ok: false, reason: row?.reason || "quota_exceeded", message: QUOTA_MESSAGE, used, limit: row?.limit ?? limit, remaining: 0, reset_at: row?.reset_at, plan: planLabel }, { status: 429, origin });
        }

        await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

        return jsonResponse({ ok: true, counted: !!row.counted, used: row.used, plan: planLabel, limit: row.limit ?? limit, remaining: row.remaining, reset_at: row.reset_at, duplicate: row.duplicate }, { origin });
      },
    },
  },
});

