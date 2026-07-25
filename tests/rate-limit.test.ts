import { describe, it, expect } from "vitest";
import { clientIp } from "../src/routes/api/public/-rate-limit";

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/public/config", { headers });
}

describe("clientIp", () => {
  it("prefers cf-connecting-ip", () => {
    expect(clientIp(reqWith({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip", () => {
    expect(clientIp(reqWith({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  });
  it("uses first x-forwarded-for entry", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
  });
  it("returns 'unknown' when nothing is available", () => {
    expect(clientIp(reqWith({}))).toBe("unknown");
  });
  it("truncates absurdly long values", () => {
    const long = "9".repeat(300);
    expect(clientIp(reqWith({ "cf-connecting-ip": long })).length).toBeLessThanOrEqual(64);
  });
});
