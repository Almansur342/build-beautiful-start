'use strict'
/* globals self */
// Phase F — Ed25519 signature verification for remote config.
// Pin the server's Ed25519 public key. If verification fails the payload is rejected.

const LEADLENS_CONFIG_PUBLIC_KEY_B64 = 'hD8nsQVVHTfeJYA2OVzs3KvB+WHjSKjOGM2Oje+AV6w='
const LEADLENS_CONFIG_KEY_ID = 'v1'

function _b64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function _canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(_canonicalize).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + _canonicalize(value[k])).join(',') + '}'
}

let _pubKey = null
async function _getPubKey() {
  if (_pubKey) return _pubKey
  if (!self.crypto || !self.crypto.subtle) return null
  try {
    _pubKey = await self.crypto.subtle.importKey(
      'raw',
      _b64ToBytes(LEADLENS_CONFIG_PUBLIC_KEY_B64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    return _pubKey
  } catch (_) {
    return null
  }
}

const LeadLensSignedConfig = {
  keyId: LEADLENS_CONFIG_KEY_ID,

  async verify(envelope) {
    if (!envelope || typeof envelope !== 'object') return { valid: false, reason: 'no_envelope' }
    if (envelope.alg !== 'Ed25519') return { valid: false, reason: 'bad_alg' }
    if (envelope.kid !== LEADLENS_CONFIG_KEY_ID) return { valid: false, reason: 'bad_kid' }
    if (typeof envelope.sig !== 'string' || envelope.sig.length < 16) {
      return { valid: false, reason: 'no_sig' }
    }
    const key = await _getPubKey()
    if (!key) return { valid: false, reason: 'no_crypto' }
    // Rebuild the exact payload the server signed. Strip envelope-only fields.
    const payload = Object.assign({}, envelope)
    delete payload.sig
    delete payload.kid
    delete payload.alg
    const bytes = new TextEncoder().encode(_canonicalize(payload))
    let sigBytes
    try { sigBytes = _b64ToBytes(envelope.sig) } catch (_) { return { valid: false, reason: 'bad_sig_b64' } }
    let ok = false
    try {
      ok = await self.crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes, bytes)
    } catch (_) {
      return { valid: false, reason: 'verify_error' }
    }
    return ok ? { valid: true, payload } : { valid: false, reason: 'bad_signature' }
  },
}

self.LeadLensSignedConfig = LeadLensSignedConfig
