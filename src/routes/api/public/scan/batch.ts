import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsFactory, jsonResponse, preflight, bodyTooLarge } from "../-cors";
import { checkComposite, clientIp, deviceBucketId, rateLimitResponse, RATE_LIMIT_PRESETS } from "../-rate-limit";
import { generateBackendBusinessIntelligence } from "@/lib/server-intelligence";

const countableStatuses = new Set(["full", "usable_partial"]);
const nonCountableStatuses = new Set(["failed", "error", "blocked", "challenge", "skipped", "retry_required", "quota_blocked", "timeout", "pending_backend"]);

const eventSchema = z.object({
  website_url: z.string().trim().min(1).max(500),
  event_id: z.string().trim().min(8).max(80).optional(),
  scan_id: z.string().trim().min(8).max(80).optional(),
  status: z.string().trim().max(40).optional(),
  scan_token: z.string().trim().regex(/^qlp_[a-f0-9]{64}$/i, "Invalid scan token"),
  evidence: z.record(z.any()).optional(),
});

const batchSchema = z.object({
  session_token: z.string().trim().regex(/^qls_[a-f0-9]{64}$/i, "Invalid session token"),
  device_fingerprint: z.string().trim().min(8).max(200),
  events: z.array(eventSchema).min(1).max(50),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const METHODS = "POST, OPTIONS" as const;
const QUOTA_MESSAGE = "You've reached today's scan limit. Your limit resets at UTC midnight, or you can upgrade to continue scanning.";

export const Route = createFileRoute("/api/public/scan/batch")({
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
        const parsed = batchSchema.safeParse(rawBody);
        if (!parsed.success) {
          return jsonResponse({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid batch." }, { status: 400, origin });
        }
        const { session_token: sessionToken, device_fingerprint: device, events } = parsed.data;

        const deviceKey = await deviceBucketId(device);
        const rlPre = await checkComposite([
          { key: `batch:ip:${ip}`, max: RATE_LIMIT_PRESETS.batch.max, windowSeconds: RATE_LIMIT_PRESETS.batch.windowSeconds },
          { key: `batch:dev:${deviceKey}`, max: 20, windowSeconds: 60 },
        ], { failClosed: true });
        if (!rlPre.allowed) return rateLimitResponse(rlPre.retryAfter, origin, corsFactory(METHODS), METHODS);

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

        const { data: settings } = await admin.from("app_settings").select("key, value");
        const map: Record<string, any> = {};
        for (const s of settings ?? []) map[s.key] = s.value;
        if (map.scan_disabled === true) {
          return jsonResponse({ ok: false, reason: "scan_disabled", message: "Scanning is temporarily paused. Please try again shortly." }, { status: 503, origin });
        }
        const batchCap = Math.max(1, Number(map.batch_max_events ?? 25));
        const capped = events.slice(0, batchCap);

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

        const rlUser = await checkComposite([
          { key: `batch:user:${kRow.user_id}`, max: 60, windowSeconds: 60 },
        ], { failClosed: true });
        if (!rlUser.allowed) return rateLimitResponse(rlUser.retryAfter, origin, corsFactory(METHODS), METHODS);

        const { data: profile } = await admin.from("profiles").select("banned").eq("id", kRow.user_id).maybeSingle();
        if (profile?.banned) return jsonResponse({ ok: false, reason: "banned", message: "This account has been suspended." }, { status: 403, origin });

        const { data: planRows } = await admin.rpc("get_effective_scan_limits", { _user_id: kRow.user_id });
        const planRow = Array.isArray(planRows) ? planRows[0] : planRows;
        const planLabel = String(planRow?.plan_name ?? "Free");
        const rawLimit = planRow?.daily_limit;
        const limit = rawLimit == null ? null : Number(rawLimit);

        const results: Array<{ event_id?: string; website_url?: string; ok: boolean; reason?: string; message?: string; counted?: boolean; used?: number; limit?: number | null; remaining?: number | null; reset_at?: string; duplicate?: boolean; intelligence_status?: "backend_generated" | "pending_backend"; intelligence?: any }> = [];
        let lastRemaining: number | null = null;
        let quotaBlocked = false;
        let quotaBlockPayload: any = null;

        for (const ev of capped) {
          const status = String(ev.status || "counted").toLowerCase();
          if (nonCountableStatuses.has(status)) {
            results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: true, counted: false, reason: status, message: "Scan result was not countable.", intelligence_status: "pending_backend" });
            continue;
          }

          const tokenHash = await sha256Hex(ev.scan_token);
          const { data: preflightToken } = await admin.from("scan_preflight_tokens").select("id, user_id, api_key_id, device_fingerprint, website_url, event_id, scan_id, expires_at, consumed_at").eq("token_hash", tokenHash).maybeSingle();
          if (!preflightToken || preflightToken.user_id !== kRow.user_id || preflightToken.api_key_id !== kRow.id || preflightToken.device_fingerprint !== device || preflightToken.event_id !== ev.event_id || preflightToken.scan_id !== ev.scan_id || preflightToken.website_url !== ev.website_url || new Date(preflightToken.expires_at) <= new Date()) { results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: false, counted: false, reason: "invalid_scan_token", message: "Scan authorization has expired. Start the scan again.", intelligence_status: "pending_backend" }); continue; }
          if (preflightToken.consumed_at) { results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: true, counted: false, duplicate: true, reason: "token_already_consumed", intelligence_status: "pending_backend" }); continue; }

          if (quotaBlocked) {
            results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: false, counted: false, reason: quotaBlockPayload?.reason || "quota_exceeded", message: QUOTA_MESSAGE, used: quotaBlockPayload?.used, limit: quotaBlockPayload?.limit ?? limit, remaining: 0, reset_at: quotaBlockPayload?.reset_at, intelligence_status: "pending_backend" });
            continue;
          }

          const rpcArgs: any = { _user_id: kRow.user_id, _limit: null, _website_url: ev.website_url, _status: status, _scan_mode: "batch" };
          if (ev.event_id) rpcArgs._event_id = ev.event_id;
          if (ev.scan_id) rpcArgs._scan_id = ev.scan_id;
          const { data: rpcRows, error: rpcError } = await admin.rpc("consume_scan_quota", rpcArgs);
          if (rpcError) {
            results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: false, counted: false, reason: "service_error", message: "Could not authorize scan.", intelligence_status: "pending_backend" });
            continue;
          }
          const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
          if (!row?.ok && !row?.allowed) {
            quotaBlocked = true;
            quotaBlockPayload = row || { reason: "quota_exceeded", limit };
            results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: false, counted: false, reason: row?.reason || "quota_exceeded", message: QUOTA_MESSAGE, used: row?.used, limit: row?.limit ?? limit, remaining: 0, reset_at: row?.reset_at, intelligence_status: "pending_backend" });
            continue;
          }
          await admin.from("scan_preflight_tokens").update({ consumed_at: new Date().toISOString() }).eq("id", preflightToken.id).is("consumed_at", null);
          lastRemaining = row.remaining ?? lastRemaining;
          let intelligence: any = null;
          let intelligenceStatus: "backend_generated" | "pending_backend" = "pending_backend";
          try {
            if (ev.evidence && typeof ev.evidence === "object") {
              intelligence = generateBackendBusinessIntelligence(ev.evidence, { websiteUrl: ev.website_url, eventId: ev.event_id, scanId: ev.scan_id });
              intelligenceStatus = "backend_generated";
            }
          } catch {
            intelligence = null;
            intelligenceStatus = "pending_backend";
          }
          results.push({ event_id: ev.event_id, website_url: ev.website_url, ok: true, counted: !!row.counted, used: row.used, limit: row.limit ?? limit, remaining: row.remaining, reset_at: row.reset_at, duplicate: !!row.duplicate, intelligence_status: intelligenceStatus, intelligence });
        }

        await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", kRow.id);
        await admin.from("extension_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", sessionRow.id);

        const counted = results.filter((row) => row.ok && row.counted).length;
        const quotaBlockedCount = results.filter((row) => row.reason === "quota_exceeded" || row.reason === "monthly_quota_exceeded").length;
        return jsonResponse({ ok: true, plan: planLabel, limit, remaining: lastRemaining, results, summary: { counted, quota_blocked: quotaBlockedCount, failed: results.filter((row) => row.reason === "failed" || row.reason === "error").length, blocked: results.filter((row) => row.reason === "blocked" || row.reason === "challenge").length, skipped: results.filter((row) => row.reason === "skipped").length }, batch_cap: batchCap, dropped: Math.max(0, events.length - capped.length) }, { origin });
      },
    },
  },
});

