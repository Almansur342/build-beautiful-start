/* globals self, globalThis */
/**
 * Phase E — Message security.
 *
 * All chrome.runtime / chrome.tabs messages inside LeadLens now flow through
 * this guard. It enforces:
 *   - sender.id === chrome.runtime.id (rejects any external ExternallyConnectable
 *     probe even though the manifest does not declare one).
 *   - Envelope shape { source, func, args, nonce, ts } with strict types.
 *   - `source` allowlist (fixed set of internal script names).
 *   - `func` method allowlist (caller supplies).
 *   - `args` is an array of ≤ 16 entries, and the serialized envelope is
 *     capped at 64 KiB to keep buggy or hostile callers from wedging the SW.
 *   - Anti-replay: `nonce` must be a fresh 12-64 char token and `ts` must be
 *     within ±5 minutes of the SW clock. Seen nonces are cached (FIFO 512).
 *
 * Nonces are cheap replay protection for internal messaging. Sender identity
 * is the real trust boundary; nonces plus schemas prevent an accidentally-
 * replayed cached envelope (extension reload, retried postMessage, buggy
 * caller) from being executed twice.
 */
;(function initMessageGuard(root) {
  if (root.LeadLensMessageGuard) return

  const NONCE_CACHE_MAX = 512
  const nonceOrder = []
  const nonceSet = new Set()
  const TS_SKEW_MS = 5 * 60 * 1000
  const MAX_ARGS = 16
  const MAX_ENVELOPE_BYTES = 64 * 1024
  const NONCE_RE = /^[A-Za-z0-9_-]{12,64}$/

  const ALLOWED_SOURCES = new Set([
    'background.js',
    'driver.js',
    'content.js',
    'contacts.js',
    'popup.js',
    'options.js',
    'apikey-gate.js',
    'apikey-required.js',
    'onboarding.js',
    'utils.js',
  ])

  const ALLOWED_TOP_TYPES = new Set([
    'qrinuxValidateKey',
    'qrinuxStartSession',
    'leadLensSystemReset',
  ])

  function rememberNonce(n) {
    if (nonceSet.has(n)) return false
    nonceSet.add(n)
    nonceOrder.push(n)
    if (nonceOrder.length > NONCE_CACHE_MAX) {
      const evicted = nonceOrder.shift()
      if (evicted !== undefined) nonceSet.delete(evicted)
    }
    return true
  }

  function randomNonce() {
    try {
      const bytes = new Uint8Array(18)
      ;(root.crypto || root).getRandomValues(bytes)
      let s = ''
      for (let i = 0; i < bytes.length; i++) {
        s += bytes[i].toString(36).padStart(2, '0')
      }
      return s.slice(0, 32)
    } catch (e) {
      return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
    }
  }

  function envelope(source, func, args) {
    return {
      source,
      func,
      args: args ? (Array.isArray(args) ? args : [args]) : [],
      nonce: randomNonce(),
      ts: Date.now(),
    }
  }

  function reject(reason) {
    return { ok: false, reason }
  }

  function envelopeSize(message) {
    try {
      return JSON.stringify(message).length
    } catch (e) {
      return Infinity
    }
  }

  function validSender(sender) {
    try {
      return !!(sender && sender.id && root.chrome && root.chrome.runtime && sender.id === root.chrome.runtime.id)
    } catch (e) {
      return false
    }
  }

  /**
   * Validate a standard { source, func, args, nonce, ts } envelope.
   * `opts.allowedMethods` is a Set of permitted `func` names.
   * `opts.allowTabSender` (default false) lets messages from tab-hosted
   * content scripts through — required for Driver, which receives from
   * content.js.
   */
  function validate(message, sender, opts) {
    if (!validSender(sender)) return reject('unauthorized-sender')
    if (!opts || !opts.allowTabSender) {
      if (sender && sender.tab) return reject('unauthorized-sender')
    }
    if (!message || typeof message !== 'object') return reject('bad-envelope')
    if (envelopeSize(message) > MAX_ENVELOPE_BYTES) return reject('envelope-too-large')

    const { source, func, args, nonce, ts } = message
    if (typeof source !== 'string' || !ALLOWED_SOURCES.has(source)) return reject('bad-source')
    if (typeof func !== 'string' || !func) return reject('bad-func')
    if (opts && opts.allowedMethods && !opts.allowedMethods.has(func)) return reject('method-not-allowed')
    if (args !== undefined && !Array.isArray(args)) return reject('bad-args')
    if (Array.isArray(args) && args.length > MAX_ARGS) return reject('too-many-args')
    if (nonce !== undefined) {
      if (typeof nonce !== 'string' || !NONCE_RE.test(nonce)) return reject('bad-nonce')
      if (typeof ts !== 'number' || !isFinite(ts)) return reject('bad-ts')
      if (Math.abs(Date.now() - ts) > TS_SKEW_MS) return reject('stale-ts')
      if (!rememberNonce(nonce)) return reject('replayed-nonce')
    }
    return { ok: true, source, func, args: Array.isArray(args) ? args : [], nonce: nonce || null }
  }

  /**
   * Validate a top-level typed message (currently the two SW-only entry
   * points from extension pages + driver reset broadcast).
   */
  function validateTopLevel(message, sender) {
    if (!validSender(sender)) return reject('unauthorized-sender')
    if (!message || typeof message !== 'object') return reject('bad-envelope')
    if (envelopeSize(message) > MAX_ENVELOPE_BYTES) return reject('envelope-too-large')
    const { type, nonce, ts } = message
    if (typeof type !== 'string' || !ALLOWED_TOP_TYPES.has(type)) return reject('type-not-allowed')
    if (nonce !== undefined) {
      if (typeof nonce !== 'string' || !NONCE_RE.test(nonce)) return reject('bad-nonce')
      if (typeof ts !== 'number' || !isFinite(ts)) return reject('bad-ts')
      if (Math.abs(Date.now() - ts) > TS_SKEW_MS) return reject('stale-ts')
      if (!rememberNonce(nonce)) return reject('replayed-nonce')
    }
    return { ok: true, type }
  }

  root.LeadLensMessageGuard = {
    validate,
    validateTopLevel,
    envelope,
    randomNonce,
    ALLOWED_SOURCES,
    ALLOWED_TOP_TYPES,
    MAX_ENVELOPE_BYTES,
  }
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this)
