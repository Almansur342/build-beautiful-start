// First-party fetch proxy for extension-driven related-page enrichment.
//
// The extension MUST NOT hit arbitrary third-party URLs from the user's
// browser with their credentials attached. Instead it calls this endpoint
// with a scan session's access token; the server performs an SSRF-safe
// fetch and returns only sanitized, size-capped bytes.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsHeaders, preflight, bodyTooLarge, jsonResponse } from "../-cors";
import {
  checkComposite,
  clientIp,
  deviceBucketId,
  rateLimitResponse,
} from "../-rate-limit";
import { safeFetch } from "../-safe-fetch";

const BodySchema = z.object({
  url: z.string().url().max(2048),
  method: z.enum(["GET", "HEAD"]).optional(),
  maxBytes: z.number().int().positive().max(2 * 1024 * 1024).optional(),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/scan/fetch")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request.headers.get("origin"), "POST, OPTIONS"),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const cors = (o: string | null) => corsHeaders(o, "POST, OPTIONS");

        if (bodyTooLarge(request)) {
          return jsonResponse({ ok: false, reason: "body_too_large" }, { status: 413, origin });
        }

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token) {
          return jsonResponse({ ok: false, reason: "missing_token" }, { status: 401, origin });
        }

        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return jsonResponse({ ok: false, reason: "invalid_body" }, { status: 400, origin });
        }

        // Verify session token → resolves user + device.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tokenHash = await sha256Hex(token);
        const { data: session, error: sessionErr } = await supabaseAdmin
          .from("extension_sessions")
          .select("id, user_id, device_fingerprint, revoked_at, session_expires_at")
          .eq("session_token_hash", tokenHash)
          .maybeSingle();
        if (
          sessionErr ||
          !session ||
          session.revoked_at ||
          new Date(session.session_expires_at) < new Date()
        ) {
          return jsonResponse({ ok: false, reason: "invalid_session" }, { status: 401, origin });
        }

        const ip = clientIp(request);
        const deviceKey = await deviceBucketId(session.device_fingerprint);
        const rl = await checkComposite(
          [
            { key: `fetch:ip:${ip}`, max: 60, windowSeconds: 60 },
            { key: `fetch:user:${session.user_id}`, max: 120, windowSeconds: 60 },
            { key: `fetch:device:${deviceKey}`, max: 90, windowSeconds: 60 },
          ],
          { failClosed: true },
        );
        if (!rl.allowed) {
          return rateLimitResponse(rl.retryAfter, origin, cors);
        }

        const result = await safeFetch(body.url, {
          method: body.method ?? "GET",
          maxBytes: body.maxBytes ?? 256 * 1024,
        });

        if (!result.ok) {
          const status = result.reason === "blocked_host" || result.reason === "blocked_scheme" ? 400 : 502;
          return jsonResponse(
            { ok: false, reason: result.reason, message: result.message },
            { status, origin },
          );
        }

        // Only surface a small subset of upstream headers.
        const safeHeaders: Record<string, string> = {};
        for (const k of ["content-type", "content-language", "last-modified", "etag"]) {
          const v = result.headers[k];
          if (v) safeHeaders[k] = v;
        }

        // Base64-encode body to keep JSON transport binary-safe.
        let b64 = "";
        const CHUNK = 0x8000;
        for (let i = 0; i < result.body.length; i += CHUNK) {
          b64 += String.fromCharCode(...result.body.subarray(i, i + CHUNK));
        }
        const bodyB64 = btoa(b64);

        return jsonResponse(
          {
            ok: true,
            status: result.status,
            final_url: result.url,
            headers: safeHeaders,
            body_b64: bodyB64,
            byte_length: result.body.length,
          },
          { status: 200, origin },
        );
      },
    },
  },
});
