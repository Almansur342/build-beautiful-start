// Distributed rate-limit helper for /api/public/* endpoints.
//
// Track 7: multi-dimensional limits. Each endpoint composes bucket keys from
// (endpoint, ip) plus, once a caller is authenticated, (endpoint, userId) and
// (endpoint, deviceFingerprintHash). Sensitive mutation endpoints treat an
// RPC failure as fail-closed; public read-only endpoints (config) can fail
// open for availability.
//
// Backed by Postgres RPC check_and_increment_rate_limit(bucket, max, window).
// The counter is shared across every Worker instance so a single hot node
// cannot burst past the limit.

import { corsHeaders as sharedCorsHeaders, type CorsMethods } from "./-cors";

export type RateLimitResult =
  | { allowed: true; hits: number }
  | { allowed: false; hits: number; retryAfter: number };

const DEFAULTS = {
  session: { max: 20, windowSeconds: 60 },
  refresh: { max: 30, windowSeconds: 60 },
  authorize: { max: 120, windowSeconds: 60 },
  batch: { max: 30, windowSeconds: 60 },
  config: { max: 60, windowSeconds: 60 },
} as const;

export const RATE_LIMIT_PRESETS = DEFAULTS;

// Never trust arbitrary x-forwarded-for. We accept cf-connecting-ip (set by
// Cloudflare Workers, the deployment target) as the trusted signal and fall
// back to x-real-ip / the first x-forwarded-for hop only for local dev.
export function clientIp(request: Request): string {
  const h = request.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.slice(0, 64);
  const real = h.get("x-real-ip");
  if (real) return real.slice(0, 64);
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim().slice(0, 64) || "unknown";
  return "unknown";
}

async function sha256Short(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const arr = Array.from(new Uint8Array(buf)).slice(0, 12);
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deviceBucketId(deviceFingerprint: string): Promise<string> {
  return sha256Short(deviceFingerprint);
}

export async function checkRateLimit(
  bucket: string,
  max: number,
  windowSeconds: number,
  opts: { failClosed?: boolean } = {},
): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_and_increment_rate_limit", {
      _bucket: bucket.slice(0, 200),
      _max_hits: max,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] rpc error", error);
      if (opts.failClosed) {
        return { allowed: false, hits: max, retryAfter: Math.min(windowSeconds, 30) };
      }
      return { allowed: true, hits: 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    const allowed = !!row?.allowed;
    const hits = Number(row?.hits ?? 0);
    if (allowed) return { allowed: true, hits };
    return { allowed: false, hits, retryAfter: Number(row?.retry_after ?? windowSeconds) };
  } catch (err) {
    console.error("[rate-limit] unexpected error", err);
    if (opts.failClosed) {
      return { allowed: false, hits: max, retryAfter: Math.min(windowSeconds, 30) };
    }
    return { allowed: true, hits: 0 };
  }
}

// Compose multiple dimensions. The first denial short-circuits and returns
// the largest retry-after so the client backs off appropriately.
export async function checkComposite(
  buckets: Array<{ key: string; max: number; windowSeconds: number }>,
  opts: { failClosed?: boolean } = {},
): Promise<RateLimitResult> {
  let maxRetry = 0;
  let denied = false;
  let hits = 0;
  for (const b of buckets) {
    const r = await checkRateLimit(b.key, b.max, b.windowSeconds, opts);
    hits = Math.max(hits, r.hits);
    if (!r.allowed) {
      denied = true;
      maxRetry = Math.max(maxRetry, r.retryAfter);
    }
  }
  if (denied) return { allowed: false, hits, retryAfter: maxRetry };
  return { allowed: true, hits };
}

export function rateLimitResponse(
  retryAfter: number,
  origin: string | null,
  corsHeadersFn?: (o: string | null) => Record<string, string>,
  methods: CorsMethods = "POST, OPTIONS",
): Response {
  const cors = corsHeadersFn ? corsHeadersFn(origin) : sharedCorsHeaders(origin, methods);
  return new Response(
    JSON.stringify({
      ok: false,
      reason: "rate_limited",
      message: "Too many requests. Please slow down and try again shortly.",
      retry_after: retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        ...cors,
      },
    },
  );
}
