import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { bodyTooLarge, corsFactory, jsonResponse, preflight } from "../-cors";
import { checkComposite, clientIp, deviceBucketId, rateLimitResponse, RATE_LIMIT_PRESETS } from "../-rate-limit";

const METHODS = "POST, OPTIONS" as const;
const TTL_SECONDS = 120;
const MAX_PREFLIGHT_REQUESTS = 500;
const QUOTA_MESSAGE = "You've reached today's scan limit. Your limit resets at UTC midnight, or you can upgrade to continue scanning.";
const sensitivePath = /(^|\/)(login|signup|account|dashboard|billing|checkout|cart|admin|settings|profile|payment|bank|insurance|health|government|auth|oauth|password|wp-admin|wp-login)(\/|$)/i;
const itemSchema = z.object({ website_url: z.string().trim().min(1).max(500), event_id: z.string().trim().min(8).max(80), scan_id: z.string().trim().min(8).max(80) });
const schema = z.object({ session_token: z.string().trim().regex(/^qls_[a-f0-9]{64}$/i), device_fingerprint: z.string().trim().min(8).max(200), requests: z.array(itemSchema).min(1).max(MAX_PREFLIGHT_REQUESTS) });

async function sha256(input: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)); return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
function resetAt() { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)).toISOString(); }
function normalizeUrl(raw: string): string | null { try { const u = new URL(raw); if (!["http:", "https:"].includes(u.protocol) || sensitivePath.test(u.pathname)) return null; u.hash = ""; return u.toString(); } catch { return null; } }
function token() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return "qlp_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); }

export const Route = createFileRoute("/api/public/scan/preflight")({
  server: { handlers: {
    OPTIONS: async ({ request }) => preflight(request.headers.get("origin"), METHODS),
    POST: async ({ request }) => {
      const origin = request.headers.get("origin");
      if (bodyTooLarge(request)) return jsonResponse({ ok: false, allowed: false, reason: "payload_too_large", message: "Request too large." }, { status: 413, origin });
      let body: unknown; try { body = await request.json(); } catch { return jsonResponse({ ok: false, allowed: false, reason: "bad_request", message: "Invalid request body." }, { status: 400, origin }); }
      const parsed = schema.safeParse(body); if (!parsed.success) return jsonResponse({ ok: false, allowed: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid preflight request." }, { status: 400, origin });
      const { session_token, device_fingerprint, requests } = parsed.data;
      const deviceId = await deviceBucketId(device_fingerprint); const ip = clientIp(request);
      const rl = await checkComposite([{ key: `preflight:ip:${ip}`, max: RATE_LIMIT_PRESETS.preflight.max, windowSeconds: RATE_LIMIT_PRESETS.preflight.windowSeconds }, { key: `preflight:device:${deviceId}`, max: 30, windowSeconds: 60 }], { failClosed: true });
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsFactory(METHODS), METHODS);
      const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
      const sessionHash = await sha256(session_token);
      const { data: session } = await admin.from("extension_sessions").select("id, api_key_id, user_id, device_fingerprint, session_expires_at, revoked_at").eq("session_token_hash", sessionHash).maybeSingle();
      if (!session) return jsonResponse({ ok: false, allowed: false, reason: "invalid_session", message: "Session invalid. Refresh your session." }, { status: 401, origin });
      if (session.revoked_at || new Date(session.session_expires_at) <= new Date()) return jsonResponse({ ok: false, allowed: false, reason: "invalid_session", message: "Session expired or revoked. Refresh your session." }, { status: 401, origin });
      if (session.device_fingerprint !== device_fingerprint) return jsonResponse({ ok: false, allowed: false, reason: "device_mismatch", message: "Session is bound to a different device." }, { status: 403, origin });
      const { data: key } = await admin.from("api_keys").select("id, revoked_at, device_fingerprint").eq("id", session.api_key_id).maybeSingle();
      if (!key || key.revoked_at || key.device_fingerprint !== device_fingerprint) return jsonResponse({ ok: false, allowed: false, reason: "device_mismatch", message: "API key is not valid for this device." }, { status: 403, origin });
      const userRate = await checkComposite([{ key: `preflight:user:${session.user_id}`, max: 60, windowSeconds: 60 }], { failClosed: true });
      if (!userRate.allowed) return rateLimitResponse(userRate.retryAfter, origin, corsFactory(METHODS), METHODS);
      const [{ data: profile }, { data: settings }, { data: limits }, { data: usage }] = await Promise.all([admin.from("profiles").select("banned").eq("id", session.user_id).maybeSingle(), admin.from("app_settings").select("key,value"), admin.rpc("get_effective_scan_limits", { _user_id: session.user_id }), admin.from("user_usage_daily").select("used_count").eq("user_id", session.user_id).eq("usage_date", new Date().toISOString().slice(0, 10)).maybeSingle()]);
      if (profile?.banned) return jsonResponse({ ok: false, allowed: false, reason: "account_inactive", message: "This account has been suspended." }, { status: 403, origin });
      const config = Object.fromEntries((settings ?? []).map((x: any) => [x.key, x.value])); if (config.scan_disabled === true) return jsonResponse({ ok: false, allowed: false, reason: "scan_disabled", message: "Scanning is temporarily paused. Please try again shortly." }, { status: 503, origin });
      const limitRow: any = Array.isArray(limits) ? limits[0] : limits; const limit = limitRow?.daily_limit == null ? null : Number(limitRow.daily_limit); const used = Number(usage?.used_count ?? 0); const remaining = limit == null ? null : Math.max(0, limit - used); const reset_at = resetAt();
      if (limit != null && remaining === 0) return jsonResponse({ ok: true, allowed: false, reason: "quota_exceeded", message: QUOTA_MESSAGE, plan: String(limitRow?.plan_name ?? "Free"), limit, used, remaining: 0, reset_at, allowed_count: 0, results: requests.map((item) => ({ website_url: item.website_url, event_id: item.event_id, scan_id: item.scan_id, allowed: false, reason: "quota_blocked", message: QUOTA_MESSAGE })) }, { origin });
      const allowedCount = limit == null ? requests.length : Math.min(requests.length, remaining ?? 0); const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
      const results: any[] = [];
      for (let i = 0; i < requests.length; i += 1) { const item = requests[i]; const normalized = normalizeUrl(item.website_url); if (!normalized) { results.push({ website_url: item.website_url, event_id: item.event_id, scan_id: item.scan_id, allowed: false, reason: "sensitive_url", message: "This URL cannot be scanned for safety reasons." }); continue; } if (results.filter((x) => x.allowed).length >= allowedCount) { results.push({ website_url: normalized, event_id: item.event_id, scan_id: item.scan_id, allowed: false, reason: "quota_blocked", message: QUOTA_MESSAGE }); continue; } const scan_token = token(); const { error } = await admin.from("scan_preflight_tokens").insert({ token_hash: await sha256(scan_token), user_id: session.user_id, api_key_id: session.api_key_id, device_fingerprint, website_url: normalized, event_id: item.event_id, scan_id: item.scan_id, expires_at: expiresAt }); if (error) return jsonResponse({ ok: false, allowed: false, reason: "service_error", message: "Authorization could not be verified. Please try again." }, { status: 503, origin }); results.push({ website_url: normalized, event_id: item.event_id, scan_id: item.scan_id, allowed: true, scan_token, expires_in: TTL_SECONDS }); }
      await admin.from("extension_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", session.id);
      return jsonResponse({ ok: true, allowed: results.some((x) => x.allowed), plan: String(limitRow?.plan_name ?? "Free"), limit, used, remaining, reset_at, allowed_count: results.filter((x) => x.allowed).length, results }, { origin });
    },
  } },
});
