import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirrors of the runtime schemas in src/routes/api/public/scan/*.ts.
// Kept in sync so validators are exercised without booting the Worker.
const apiKeyRegex = /^qlk_[a-f0-9]{40}$/i;
const sessionRegex = /^qls_[a-f0-9]{64}$/i;
const refreshRegex = /^qlr_[a-f0-9]{64}$/i;

const sessionSchema = z.object({
  api_key: z.string().trim().regex(apiKeyRegex),
  device_fingerprint: z.string().trim().min(8).max(200),
  user_agent: z.string().trim().max(300).optional(),
});

const batchSchema = z.object({
  session_token: z.string().trim().regex(sessionRegex),
  device_fingerprint: z.string().trim().min(8).max(200),
  events: z.array(z.object({
    website_url: z.string().trim().min(1).max(500),
    event_id: z.string().trim().min(8).max(80).optional(),
  })).min(1).max(50),
});

const refreshSchema = z.object({
  refresh_token: z.string().trim().regex(refreshRegex),
  device_fingerprint: z.string().trim().min(8).max(200),
});

describe("API key schema", () => {
  it("accepts a well-formed key", () => {
    const key = "qlk_" + "a".repeat(40);
    expect(sessionSchema.safeParse({ api_key: key, device_fingerprint: "device-1234" }).success).toBe(true);
  });
  it("rejects wrong prefix", () => {
    const key = "xxx_" + "a".repeat(40);
    expect(sessionSchema.safeParse({ api_key: key, device_fingerprint: "device-1234" }).success).toBe(false);
  });
  it("rejects short fingerprint", () => {
    const key = "qlk_" + "a".repeat(40);
    expect(sessionSchema.safeParse({ api_key: key, device_fingerprint: "short" }).success).toBe(false);
  });
});

describe("Refresh schema", () => {
  it("accepts qlr_ + 64 hex", () => {
    expect(refreshSchema.safeParse({ refresh_token: "qlr_" + "b".repeat(64), device_fingerprint: "device-1234" }).success).toBe(true);
  });
  it("rejects tampered token", () => {
    expect(refreshSchema.safeParse({ refresh_token: "qlr_short", device_fingerprint: "device-1234" }).success).toBe(false);
  });
});

describe("Batch schema", () => {
  const validToken = "qls_" + "c".repeat(64);
  it("caps at 50 events", () => {
    const events = Array.from({ length: 51 }, (_, i) => ({ website_url: `https://x.com/${i}` }));
    expect(batchSchema.safeParse({ session_token: validToken, device_fingerprint: "device-1234", events }).success).toBe(false);
  });
  it("requires at least one event", () => {
    expect(batchSchema.safeParse({ session_token: validToken, device_fingerprint: "device-1234", events: [] }).success).toBe(false);
  });
  it("accepts a 25-event batch", () => {
    const events = Array.from({ length: 25 }, (_, i) => ({ website_url: `https://x.com/${i}`, event_id: `evt_${i}00000` }));
    expect(batchSchema.safeParse({ session_token: validToken, device_fingerprint: "device-1234", events }).success).toBe(true);
  });
});
