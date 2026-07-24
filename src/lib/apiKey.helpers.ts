// Shared helpers for API key format + hashing. Browser-safe (uses Web Crypto).
export const API_KEY_PREFIX = 'qlk_';

export function generateApiKeyPlaintext(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return API_KEY_PREFIX + hex;
}

export async function hashApiKey(plaintext: string): Promise<string> {
  const data = new TextEncoder().encode(plaintext);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function maskApiKey(plaintext: string): string {
  if (!plaintext) return '';
  return plaintext.slice(0, 4) + '••••••••••••••••' + plaintext.slice(-4);
}
