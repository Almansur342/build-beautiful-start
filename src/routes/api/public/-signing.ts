// Ed25519 signing for public/remote responses (Phase F).
// The extension pins the public key and rejects unsigned or invalid payloads.

let cachedKey: CryptoKey | null = null;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function importPrivateKey(): Promise<CryptoKey | null> {
  if (cachedKey) return cachedKey;
  const b64 = process.env.CONFIG_SIGNING_PRIVATE_KEY_PKCS8_B64;
  if (!b64) return null;
  try {
    const pkcs8 = b64ToBytes(b64);
    cachedKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8.buffer.slice(pkcs8.byteOffset, pkcs8.byteOffset + pkcs8.byteLength) as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["sign"],
    );
    return cachedKey;
  } catch {
    return null;
  }
}

/**
 * Canonical JSON stringify with sorted keys — deterministic bytes so the
 * extension can reproduce the exact input the server signed.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

export interface SignedEnvelope<T> {
  payload: T;
  sig: string | null;
  kid: string | null;
  alg: "Ed25519";
}

export async function signPayload<T>(payload: T): Promise<SignedEnvelope<T>> {
  const kid = process.env.CONFIG_SIGNING_KEY_ID || null;
  const key = await importPrivateKey();
  if (!key) return { payload, sig: null, kid, alg: "Ed25519" };
  const bytes = new TextEncoder().encode(canonicalize(payload));
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, key, bytes);
  return { payload, sig: bytesToB64(new Uint8Array(sig)), kid, alg: "Ed25519" };
}
