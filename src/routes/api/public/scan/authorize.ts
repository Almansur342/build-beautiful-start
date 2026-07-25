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

        // Multi-dimensional rate-limit: IP + device. User dimension is added
        // once the caller is authenticated below (before quota consumption).
        // Fail-closed: authorize is a sensitive mutation.
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

        // Per-user rate-limit dimension (now that we know who the caller is).
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

        const { data: sub } = await admin
          .from("subscriptions")
          .select("status, current_period_end, plans(slug, name, daily_scan_limit)")
          .eq("user_id", keyRow.user_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const active = sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
        const plan = active ? (sub.plans as any) : null;

        const { data: settings } = await admin.from("app_settings").select("key, value");
        const map: Record<string, any> = {};
        for (const s of settings ?? []) map[s.key] = s.value;
        const freeEnabled = map.free_tier_enabled !== false;
        const freeLimit = Number(map.free_daily_limit ?? 100);

        let limit: number | null;
        let planLabel: string;
        if (plan) {
          limit = plan.daily_scan_limit;
          planLabel = plan.name;
        } else {
          if (!freeEnabled) return jsonResponse({ ok: false, reason: "no_plan", message: "Free tier is disabled. Please upgrade in your dashboard." }, { status: 402, origin });
          limit = freeLimit;
          planLabel = "Free";
        }

        if (!websiteUrl) {
          const today = new Date(new Date().toISOString().slice(0, 10)).toISOString();
          const { count } = await admin
            .from("scan_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", keyRow.user_id)
            .gte("scanned_at", today);
          const used = count ?? 0;
          await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
          return jsonResponse({ ok: true, plan: planLabel, limit, remaining: limit == null ? null : Math.max(0, limit - used) }, { origin });
        }

        const rpcArgs: { _user_id: string; _limit: number; _event_id?: string; _scan_id?: string; _website_url?: string } = {
          _user_id: keyRow.user_id,
          _limit: limit ?? 2147483647,
          _website_url: websiteUrl,
        };
        if (eventId) rpcArgs._event_id = eventId;
        if (scanId) rpcArgs._scan_id = scanId;
        const { data: rpcRows, error: rpcError } = await admin.rpc("consume_scan_quota", rpcArgs);
        if (rpcError) return jsonResponse({ ok: false, reason: "service_error", message: "Could not authorize this scan. Please try again." }, { status: 503, origin });
        const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
        if (!row?.allowed) {
          const used = row?.used ?? 0;
          logSecurityEvent({ eventType: "authorize.quota_exceeded", severity: "warn", userId: keyRow.user_id, apiKeyId: keyRow.id, ip, device, userAgent: request.headers.get("user-agent") ?? undefined, metadata: { used, limit, plan: planLabel } });
          return jsonResponse({ ok: false, reason: "quota_exceeded", message: `Daily limit reached (${used}/${limit}). Upgrade for more scans.`, remaining: 0, limit, plan: planLabel }, { status: 429, origin });
        }

        if (!row.duplicate) {
          const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
          const { data: recent } = await admin
            .from("scan_logs")
            .select("id")
            .eq("user_id", keyRow.user_id)
            .eq("website_url", websiteUrl)
            .gte("scanned_at", sixtySecondsAgo)
            .limit(1)
            .maybeSingle();
          if (!recent) {
            await admin.from("scan_logs").insert({ user_id: keyRow.user_id, api_key_id: keyRow.id, website_url: websiteUrl });
          }
        }
        await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

        return jsonResponse({ ok: true, plan: planLabel, limit, remaining: row.remaining, duplicate: row.duplicate }, { origin });
      },
    },
  },
});
