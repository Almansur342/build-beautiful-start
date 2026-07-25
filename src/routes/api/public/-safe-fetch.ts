// SSRF-safe first-party fetch service.
//
// Phase B: Any server-side fetch of user-supplied URLs must be routed through
// safeFetch(). This module enforces:
//   - Scheme allowlist (http/https only)
//   - Hostname/IP blocklist (private, loopback, link-local, metadata endpoints)
//   - Manual redirect handling (re-validates every hop)
//   - Response size cap + read timeout
//   - Method/header allowlist
//
// Notes on runtime: this runs inside the Cloudflare Worker (workerd). We do NOT
// do DNS resolution here; instead we reject hostnames that literal-match
// private IPv4/IPv6 ranges or well-known metadata hosts. For hostname-based
// SSRF, we rely on the fact that the Worker cannot reach RFC1918 space from
// the edge — but we still block the obvious literal cases in case the Worker
// is ever run in a different environment.

export type SafeFetchOptions = {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  maxBytes?: number;      // default 512 KiB
  timeoutMs?: number;     // default 8000
  maxRedirects?: number;  // default 3
  userAgent?: string;
};

export type SafeFetchResult =
  | { ok: true; status: number; url: string; headers: Record<string, string>; body: Uint8Array }
  | { ok: false; reason: SafeFetchError; message: string };

export type SafeFetchError =
  | "invalid_url"
  | "blocked_scheme"
  | "blocked_host"
  | "too_many_redirects"
  | "response_too_large"
  | "timeout"
  | "network_error"
  | "method_not_allowed";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
]);

// Literal IPv4 in dotted-quad form.
function ipv4Parts(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (parts.some((p) => p < 0 || p > 255)) return null;
  return parts;
}

function isBlockedIPv4(host: string): boolean {
  const p = ipv4Parts(host);
  if (!p) return false;
  const [a, b] = p;
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 127) return true;                         // loopback
  if (a === 0) return true;                           // 0.0.0.0/8
  if (a === 169 && b === 254) return true;            // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;            // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT
  if (a >= 224) return true;                          // multicast + reserved
  return false;
}

function isBlockedIPv6(host: string): boolean {
  // Bracketed form: [::1]
  const raw = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (!raw.includes(":")) return false;
  const lower = raw.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — reject if the mapped IPv4 is private.
    const v4 = lower.slice(7);
    if (isBlockedIPv4(v4)) return true;
  }
  return false;
}

export function validateUrl(input: string): { ok: true; url: URL } | { ok: false; reason: SafeFetchError; message: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid_url", message: "URL could not be parsed." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "blocked_scheme", message: `Scheme ${url.protocol} is not allowed.` };
  }
  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "invalid_url", message: "Empty hostname." };
  if (BLOCKED_HOSTS.has(host)) {
    return { ok: false, reason: "blocked_host", message: `Host ${host} is blocked.` };
  }
  if (host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, reason: "blocked_host", message: `Host ${host} is blocked.` };
  }
  if (isBlockedIPv4(host) || isBlockedIPv6(host)) {
    return { ok: false, reason: "blocked_host", message: `IP ${host} is in a blocked range.` };
  }
  return { ok: true, url };
}

const STRIP_REQUEST_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "cf-ipcountry",
  "host",
]);

function sanitizeHeaders(input?: Record<string, string>): Headers {
  const h = new Headers();
  h.set("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
  h.set("Accept-Language", "en");
  if (input) {
    for (const [k, v] of Object.entries(input)) {
      if (STRIP_REQUEST_HEADERS.has(k.toLowerCase())) continue;
      if (k.toLowerCase().startsWith("sec-") || k.toLowerCase().startsWith("proxy-")) continue;
      h.set(k, v);
    }
  }
  return h;
}

const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_REDIRECTS = 3;

export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const method = opts.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    return { ok: false, reason: "method_not_allowed", message: `Method ${method} is not allowed.` };
  }
  const maxBytes = Math.min(Math.max(opts.maxBytes ?? DEFAULT_MAX_BYTES, 1), 2 * 1024 * 1024);
  const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, 500), 15000);
  const maxRedirects = Math.min(Math.max(opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS, 0), 5);
  const userAgent = opts.userAgent ?? "QrinuxLeadLens/1.0 (+safe-fetch)";

  let currentUrl = rawUrl;
  let redirects = 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    while (true) {
      const v = validateUrl(currentUrl);
      if (!v.ok) return v;

      const headers = sanitizeHeaders(opts.headers);
      headers.set("User-Agent", userAgent);

      let res: Response;
      try {
        res = await fetch(v.url.toString(), {
          method,
          headers,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          return { ok: false, reason: "timeout", message: "Upstream request timed out." };
        }
        return { ok: false, reason: "network_error", message: "Upstream request failed." };
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) {
          // Redirect status without a Location — surface as final response.
          return finalize(res, v.url.toString(), maxBytes);
        }
        redirects += 1;
        if (redirects > maxRedirects) {
          return { ok: false, reason: "too_many_redirects", message: "Redirect limit exceeded." };
        }
        // Resolve relative Location against the current URL, then re-validate.
        try {
          currentUrl = new URL(loc, v.url).toString();
        } catch {
          return { ok: false, reason: "invalid_url", message: "Redirect target could not be parsed." };
        }
        continue;
      }

      return finalize(res, v.url.toString(), maxBytes);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function finalize(res: Response, url: string, maxBytes: number): Promise<SafeFetchResult> {
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > maxBytes) {
    return { ok: false, reason: "response_too_large", message: `Response ${contentLength} bytes exceeds cap ${maxBytes}.` };
  }
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* noop */ }
        return { ok: false, reason: "response_too_large", message: `Response exceeded cap ${maxBytes}.` };
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.byteLength;
  }
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  return { ok: true, status: res.status, url, headers, body };
}
