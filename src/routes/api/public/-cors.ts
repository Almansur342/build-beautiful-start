// Shared CORS allowlist for /api/public/* endpoints.
//
// Track 8: no automatic origin reflection. Unknown origins receive no
// permissive CORS headers, which causes the browser to block the response.
// Chrome-extension origins (chrome-extension://<id>) are allowed as a class
// because the extension ID differs per user in unpacked/self-hosted mode; the
// endpoints still require a valid API key or session token, so origin is not
// the trust root.
//
// Never enables Access-Control-Allow-Credentials — every endpoint uses
// bearer-style tokens in the JSON body, not cookies.

const PROD_ORIGINS = new Set<string>([
  "https://build-beautiful-start.lovable.app",
  "https://project--57326e63-a9d3-4e6d-affb-f073213686f0.lovable.app",
  "https://id-preview--57326e63-a9d3-4e6d-affb-f073213686f0.lovable.app",
]);

// Dev origins are only honored when the request itself comes from a dev host,
// so a production deployment cannot be tricked into echoing a localhost origin.
const DEV_ORIGIN_PATTERNS: RegExp[] = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
];

const EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
const MOZ_EXTENSION_ORIGIN = /^moz-extension:\/\/[0-9a-f-]{36}$/i;

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // no-origin requests (server-to-server, some extension fetches)
  if (PROD_ORIGINS.has(origin)) return true;
  if (EXTENSION_ORIGIN.test(origin)) return true;
  if (MOZ_EXTENSION_ORIGIN.test(origin)) return true;
  for (const re of DEV_ORIGIN_PATTERNS) if (re.test(origin)) return true;
  return false;
}

export type CorsMethods = "GET, OPTIONS" | "POST, OPTIONS" | "GET, POST, OPTIONS";

export function corsHeaders(origin: string | null, methods: CorsMethods = "POST, OPTIONS"): Record<string, string> {
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  if (isAllowedOrigin(origin)) {
    // Echo the specific origin (never "*") when it matches the allowlist so
    // browsers accept the response. Absent origin ⇒ no Allow-Origin needed.
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// Helper matching the (origin) => headers signature expected by rate-limit.
export function corsFactory(methods: CorsMethods = "POST, OPTIONS") {
  return (o: string | null) => corsHeaders(o, methods);
}

export function preflight(origin: string | null, methods: CorsMethods = "POST, OPTIONS"): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin, methods) });
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit & { origin?: string | null; methods?: CorsMethods } = {},
): Response {
  const { origin = null, methods = "POST, OPTIONS", ...rest } = init;
  return new Response(JSON.stringify(body), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin, methods),
      ...(rest.headers || {}),
    },
  });
}

// Max request body size (bytes). Guards Zod parsers from unbounded payloads
// even if a caller lies about Content-Length. 64 KB is generous for our
// JSON schemas (session/refresh/authorize/batch/config).
export const MAX_BODY_BYTES = 64 * 1024;

export function bodyTooLarge(request: Request): boolean {
  const cl = request.headers.get("content-length");
  if (!cl) return false;
  const n = Number(cl);
  if (!Number.isFinite(n) || n < 0) return true;
  return n > MAX_BODY_BYTES;
}
