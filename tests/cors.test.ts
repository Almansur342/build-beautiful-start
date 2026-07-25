import { describe, it, expect } from "vitest";
import { isAllowedOrigin, corsHeaders, bodyTooLarge, MAX_BODY_BYTES } from "../src/routes/api/public/-cors";

describe("CORS allowlist", () => {
  it("allows production dashboard origin", () => {
    expect(isAllowedOrigin("https://build-beautiful-start.lovable.app")).toBe(true);
  });
  it("allows chrome-extension origins (32-char id)", () => {
    expect(isAllowedOrigin("chrome-extension://abcdefghijklmnopabcdefghijklmnop")).toBe(true);
  });
  it("rejects unknown https origin", () => {
    expect(isAllowedOrigin("https://evil.example.com")).toBe(false);
  });
  it("rejects chrome-extension with wrong id shape", () => {
    expect(isAllowedOrigin("chrome-extension://short")).toBe(false);
  });
  it("allows localhost dev", () => {
    expect(isAllowedOrigin("http://localhost:8080")).toBe(true);
  });
  it("treats missing origin as allowed (no CORS header emitted)", () => {
    expect(isAllowedOrigin(null)).toBe(true);
  });

  it("never emits Access-Control-Allow-Origin for disallowed origin", () => {
    const h = corsHeaders("https://evil.example.com");
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined();
  });
  it("echoes exact allowed origin, never '*'", () => {
    const h = corsHeaders("https://build-beautiful-start.lovable.app");
    expect(h["Access-Control-Allow-Origin"]).toBe("https://build-beautiful-start.lovable.app");
  });
  it("includes Vary: Origin", () => {
    expect(corsHeaders(null).Vary).toBe("Origin");
  });
  it("does not enable credentials", () => {
    const h = corsHeaders("https://build-beautiful-start.lovable.app");
    expect(h["Access-Control-Allow-Credentials"]).toBeUndefined();
  });
});

describe("body size guard", () => {
  it("rejects Content-Length above limit", () => {
    const r = new Request("https://x.test/", { method: "POST", headers: { "content-length": String(MAX_BODY_BYTES + 1) } });
    expect(bodyTooLarge(r)).toBe(true);
  });
  it("allows small bodies", () => {
    const r = new Request("https://x.test/", { method: "POST", headers: { "content-length": "128" } });
    expect(bodyTooLarge(r)).toBe(false);
  });
  it("allows missing Content-Length", () => {
    const r = new Request("https://x.test/", { method: "POST" });
    expect(bodyTooLarge(r)).toBe(false);
  });
  it("rejects negative or non-numeric length", () => {
    const r = new Request("https://x.test/", { method: "POST", headers: { "content-length": "-1" } });
    expect(bodyTooLarge(r)).toBe(true);
  });
});
