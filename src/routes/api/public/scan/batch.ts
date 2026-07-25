import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Batch authorization endpoint — up to N scans in one round-trip.
// Session-token only (no raw API key). Each event is quota-consumed atomically
// via the same consume_scan_quota RPC used by the single-scan authorize path.

const eventSchema = z.object({
  website_url: z.string().trim().min(1).max(500),
  event_id: z.string().trim().min(8).max(80).optional(),
  scan_id: z.string().trim().min(8).max(80).optional(),
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

export const Route = createFileRoute("/api/public/scan/batch")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const { checkRateLimit, clientIp, rateLimitResponse, RATE_LIMIT_PRESETS } = await import("../_rate-limit");
        const ip = clientIp(request);
        const rl = await checkRateLimit(`batch:${ip}`, RATE_LIMIT_PRESETS.batch.max, RATE_LIMIT_PRESETS.batch.windowSeconds);
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter, origin, corsHeaders);
        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return json({ ok: false, reason: "bad_request", message: "Invalid request body." }, { status: 400, origin });
        }
        const parsed = batchSchema.safeParse(rawBody);
        if (!parsed.success) {
          return json({ ok: false, reason: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid batch." }, { status: 400, origin });
        }
        const { session_token: sessionToken, device_fingerprint: device, events } = parsed.data;

        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

        // Remote-config kill-switch and effective batch cap.
        const { data: settings } = await admin.from("app_settings").select("key, value");
        const map: Record<string, any> = {};
        for (const s of settings ?? []) map[s.key] = s.value;
        if (map.scan_disabled === true) {
          return json({ ok: false, reason: "scan_disabled", message: "Scanning is temporarily paused. Please try again shortly." }, { status: 503, origin });
        }
        const batchCap = Math.max(1, Number(map.batch_max_events ?? 25));
        const capped = events.slice(0, batchCap);

        // Verify session
        const sessionHash = await sha256Hex(sessionToken);
        const { data: sessionRow, error: sessionError } = await admin
          .from("extension_sessions")
          .select("id, api_key_id, user_id, device_fingerprint, session_expires_at, revoked_at")
          .eq("session_token_hash", sessionHash)
          .maybeSingle();
        if (sessionError) return json({ ok: false, reason: "service_error", message: "Session verification is temporarily unavailable." }, { status: 503, origin });
        if (!sessionRow) return json({ ok: false, reason: "session_invalid", message: "Session invalid. Refresh your session." }, { status: 401, origin });
        if (sessionRow.revoked_at) return json({ ok: false, reason: "session_revoked", message: "Session revoked. Please re-activate." }, { status: 401, origin });
        if (new Date(sessionRow.session_expires_at) <= new Date()) return json({ ok: false, reason: "session_expired", message: "Session expired. Refresh your session." }, { status: 401, origin });
        if (sessionRow.device_fingerprint !== device) return json({ ok: false, reason: "device_mismatch", message: "Session is bound to a different device." }, { status: 403, origin });

        const { data: kRow, error: kErr } = await admin.from("api_keys").select("id, user_id, device_fingerprint, revoked_at").eq("id", sessionRow.api_key_id).maybeSingle();
        if (kErr) return json({ ok: false, reason: "service_error", message: "Key verification is temporarily unavailable." }, { status: 503, origin });
        if (!kRow || kRow.revoked_at) return json({ ok: false, reason: "revoked", message: "This API key has been revoked." }, { status: 401, origin });

        const { data: profile } = await admin.from("profiles").select("banned").eq("id", kRow.user_id).maybeSingle();
        if (profile?.banned) return json({ ok: false, reason: "banned", message: "This account has been suspended." }, { status: 403, origin });

        // Resolve plan + effective limit (single lookup for the whole batch)
        const { data: sub } = await admin
          .from("subscriptions")
          .select("status, current_period_end, plans(slug, name, daily_scan_limit)")
          .eq("user_id", kRow.user_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const active = sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
        const plan = active ? (sub.plans as any) : null;
        const freeEnabled = map.free_tier_enabled !== false;
        const freeLimit = Number(map.free_daily_limit ?? 100);

        let limit: number | null;
        let planLabel: string;
        if (plan) {
          limit = plan.daily_scan_limit;
          planLabel = plan.name;
        } else {
          if (!freeEnabled) return json({ ok: false, reason: "no_plan", message: "Free tier is disabled. Please upgrade in your dashboard." }, { status: 402, origin });
          limit = freeLimit;
          planLabel = "Free";
        }

        // Process each event through the atomic RPC
        const results: Array<{ event_id?: string; ok: boolean; reason?: string; message?: string; remaining?: number | null; duplicate?: boolean }> = [];
        let lastRemaining: number | null = null;
        for (const ev of capped) {
          const rpcArgs: any = { _user_id: kRow.user_id, _limit: limit ?? 2147483647, _website_url: ev.website_url };
          if (ev.event_id) rpcArgs._event_id = ev.event_id;
          if (ev.scan_id) rpcArgs._scan_id = ev.scan_id;
          const { data: rpcRows, error: rpcError } = await admin.rpc("consume_scan_quota", rpcArgs);
          if (rpcError) {
            results.push({ event_id: ev.event_id, ok: false, reason: "service_error", message: "Could not authorize scan." });
            continue;
          }
          const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
          if (!row?.allowed) {
            const used = row?.used ?? 0;
            results.push({ event_id: ev.event_id, ok: false, reason: "quota_exceeded", message: `Daily limit reached (${used}/${limit}).`, remaining: 0 });
            continue;
          }
          lastRemaining = row.remaining ?? lastRemaining;
          // Historical scan_logs (dedup 60s window). Idempotent duplicates skipped.
          if (!row.duplicate) {
            const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
            const { data: recent } = await admin
              .from("scan_logs")
              .select("id")
              .eq("user_id", kRow.user_id)
              .eq("website_url", ev.website_url)
              .gte("scanned_at", sixtySecondsAgo)
              .limit(1)
              .maybeSingle();
            if (!recent) {
              await admin.from("scan_logs").insert({ user_id: kRow.user_id, api_key_id: kRow.id, website_url: ev.website_url });
            }
          }
          results.push({ event_id: ev.event_id, ok: true, remaining: row.remaining, duplicate: !!row.duplicate });
        }

        await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", kRow.id);
        await admin.from("extension_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", sessionRow.id);

        return json({ ok: true, plan: planLabel, limit, remaining: lastRemaining, results, dropped: Math.max(0, events.length - capped.length) }, { origin });
      },
    },
  },
});
