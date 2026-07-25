// Fire-and-forget security event logger. Never throws.
// Uses SHA-256 hashes for IP/device so raw values never sit in the log.

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type SecuritySeverity = "info" | "warn" | "critical";

export interface AuditEvent {
  eventType: string;
  severity?: SecuritySeverity;
  reason?: string | null;
  userId?: string | null;
  apiKeyId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  device?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export function logSecurityEvent(evt: AuditEvent): void {
  // Never block or fail the caller.
  void (async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [ipHash, deviceHash] = await Promise.all([
        evt.ip ? sha256Hex(evt.ip) : Promise.resolve(null),
        evt.device ? sha256Hex(evt.device) : Promise.resolve(null),
      ]);
      await supabaseAdmin.from("security_events").insert({
        event_type: evt.eventType,
        severity: evt.severity ?? "info",
        reason: evt.reason ?? null,
        user_id: evt.userId ?? null,
        api_key_id: evt.apiKeyId ?? null,
        session_id: evt.sessionId ?? null,
        ip_hash: ipHash,
        device_hash: deviceHash,
        user_agent: (evt.userAgent ?? "").slice(0, 300) || null,
        metadata: evt.metadata ?? {},
      });
    } catch {
      // swallow — audit logging must never break the request path
    }
  })();
}
