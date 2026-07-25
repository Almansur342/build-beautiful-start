import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { canonicalize, signPayload } from "@/routes/api/public/-signing";

// Ensure globalThis.crypto is the WebCrypto impl in the Node test runner.
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

describe("canonicalize", () => {
  it("sorts object keys deterministically", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
  it("handles nested arrays and objects", () => {
    expect(canonicalize({ x: [3, { b: 2, a: 1 }] })).toBe('{"x":[3,{"a":1,"b":2}]}');
  });
});

describe("signPayload", () => {
  it("verifies with the pinned public key", async () => {
    process.env.CONFIG_SIGNING_PRIVATE_KEY_PKCS8_B64 =
      "MC4CAQAwBQYDK2VwBCIEIJrEpCoTvD4a73b0OkCx0/0Ha7J1QZ1kaqLC/paoLR7Y";
    process.env.CONFIG_SIGNING_KEY_ID = "v1";
    const payload = { ok: true, config: { free_daily_limit: 100 }, ttl_seconds: 900 };
    const signed = await signPayload(payload);
    expect(signed.sig).toBeTruthy();
    expect(signed.kid).toBe("v1");

    const pubRawB64 = "hD8nsQVVHTfeJYA2OVzs3KvB+WHjSKjOGM2Oje+AV6w=";
    const raw = Uint8Array.from(atob(pubRawB64), (c) => c.charCodeAt(0));
    const key = await (webcrypto.subtle as SubtleCrypto).importKey(
      "raw",
      raw,
      { name: "Ed25519" } as any,
      false,
      ["verify"],
    );
    const sig = Uint8Array.from(atob(signed.sig!), (c) => c.charCodeAt(0));
    const bytes = new TextEncoder().encode(canonicalize(payload));
    const ok = await (webcrypto.subtle as SubtleCrypto).verify(
      { name: "Ed25519" } as any,
      key,
      sig,
      bytes,
    );
    expect(ok).toBe(true);

    // Tampering breaks the signature.
    const tampered = new TextEncoder().encode(
      canonicalize({ ...payload, config: { free_daily_limit: 9999 } }),
    );
    const ok2 = await (webcrypto.subtle as SubtleCrypto).verify(
      { name: "Ed25519" } as any,
      key,
      sig,
      tampered,
    );
    expect(ok2).toBe(false);
  });
});
