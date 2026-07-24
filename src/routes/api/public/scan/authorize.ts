import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export const Route = createFileRoute("/api/public/scan/authorize")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        let body: any;
        try { body = await request.json(); } catch { return json({ ok: false, reason: "bad_request", message: "Invalid JSON" }, { status: 400, origin }); }
        const apiKey = String(body.api_key ?? "").trim();
        const device = String(body.device_fingerprint ?? "").trim();
        const websiteUrl = String(body.website_url ?? "").slice(0, 500);
        if (!apiKey || !device) return json({ ok: false, reason: "missing_fields", message: "api_key and device_fingerprint required" }, { status: 400, origin });

        const admin = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
        const keyHash = await sha256Hex(apiKey);

        const { data: keyRow } = await admin.from("api_keys").select("id, user_id, device_fingerprint, revoked_at").eq("key_hash", keyHash).maybeSingle();
        if (!keyRow) return json({ ok: false, reason: "invalid_key", message: "Invalid API key. Regenerate one from your dashboard." }, { status: 401, origin });
        if (keyRow.revoked_at) return json({ ok: false, reason: "revoked", message: "This API key has been revoked. Generate a new one." }, { status: 401, origin });

        // Check ban status
        const { data: profile } = await admin.from("profiles").select("banned").eq("id", keyRow.user_id).maybeSingle();
        if (profile?.banned) return json({ ok: false, reason: "banned", message: "This account has been suspended." }, { status: 403, origin });

        // Device binding
        if (!keyRow.device_fingerprint) {
          await admin.from("api_keys").update({ device_fingerprint: device, bound_at: new Date().toISOString() }).eq("id", keyRow.id);
        } else if (keyRow.device_fingerprint !== device) {
          return json({ ok: false, reason: "device_mismatch", message: "This API key is locked to another device. Reset device binding from your dashboard." }, { status: 403, origin });
        }

        // Determine current plan + limit
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
          limit = plan.daily_scan_limit; // null = unlimited
          planLabel = plan.name;
        } else {
          if (!freeEnabled) return json({ ok: false, reason: "no_plan", message: "Free tier is disabled. Please upgrade in your dashboard." }, { status: 402, origin });
          limit = freeLimit;
          planLabel = "Free";
        }

        // Count today's scans
        const { count } = await admin
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", keyRow.user_id)
          .gte("scanned_at", new Date(new Date().toISOString().slice(0, 10)).toISOString());
        const used = count ?? 0;

        if (limit != null && used >= limit) {
          return json({ ok: false, reason: "quota_exceeded", message: `Daily limit reached (${used}/${limit}). Upgrade for more scans.`, remaining: 0, limit, plan: planLabel }, { status: 429, origin });
        }

        // Log the scan
        await admin.from("scan_logs").insert({ user_id: keyRow.user_id, api_key_id: keyRow.id, website_url: websiteUrl });
        await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

        return json({ ok: true, plan: planLabel, limit, remaining: limit == null ? null : Math.max(0, limit - used - 1) }, { origin });
      },
    },
  },
});
