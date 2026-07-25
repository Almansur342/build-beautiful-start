// Distributed rate-limit helper for public API endpoints.
// Backed by Postgres (see check_and_increment_rate_limit RPC) so counters are
// shared across every Worker instance — a single hot node cannot burst past
// the limit while other nodes stay idle.
//
// Server-only: imported from src/routes/api/public/* handlers which run on the
// server. Uses the admin client (service_role) because the rate_limits table
// is intentionally locked down.

export type RateLimitResult =
  | { allowed: true; hits: number }
  | { allowed: false; hits: number; retryAfter: number };

const DEFAULTS = {
  // Public endpoint defaults. Overridable per call site.
  session: { max: 20, windowSeconds: 60 },
  refresh: { max: 30, windowSeconds: 60 },
  authorize: { max: 120, windowSeconds: 60 },
  batch: { max: 30, windowSeconds: 60 },
  config: { max: 60, windowSeconds: 60 },
} as const;

export const RATE_LIMIT_PRESETS = DEFAULTS;

export function clientIp(request: Request): string {
  const h = request.headers;
  const raw =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  // Truncate to keep bucket keys bounded.
  return raw.slice(0, 64);
}

export async function checkRateLimit(
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_and_increment_rate_limit", {
      _bucket: bucket.slice(0, 200),
      _max_hits: max,
      _window_seconds: windowSeconds,
    });
    if (error) {
      // Fail-open on infra failure — we do not want a downed rate-limit table
      // to lock every user out. Errors are logged for observability.
      console.error("[rate-limit] rpc error", error);
      return { allowed: true, hits: 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    const allowed = !!row?.allowed;
    const hits = Number(row?.hits ?? 0);
    if (allowed) return { allowed: true, hits };
    return { allowed: false, hits, retryAfter: Number(row?.retry_after ?? windowSeconds) };
  } catch (err) {
    console.error("[rate-limit] unexpected error", err);
    return { allowed: true, hits: 0 };
  }
}

export function rateLimitResponse(
  retryAfter: number,
  origin: string | null,
  corsHeaders: (o: string | null) => Record<string, string>,
): Response {
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
        ...corsHeaders(origin),
      },
    },
  );
}
