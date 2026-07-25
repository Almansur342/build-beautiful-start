'use strict'
/* globals chrome */
// Qrinux LeadLens — API key + session gate (v1.8.0)
// Phase 4: adds a lightweight local batch queue, remote-config fetcher,
// and a scan_disabled kill-switch — while keeping single-scan authorize
// as the default path used by driver.js.

const LEADLENS_API_BASES = [
  'https://project--57326e63-a9d3-4e6d-affb-f073213686f0.lovable.app',
  'https://build-beautiful-start.lovable.app',
]

const SESSION_STORE_KEY = 'qrinuxSession'
const CONFIG_STORE_KEY = 'qrinuxRemoteConfig'
const CONFIG_DEFAULTS = {
  free_tier_enabled: true,
  free_daily_limit: 100,
  scan_disabled: false,
  remote_config_ttl_minutes: 15,
  batch_max_events: 25,
  session_ttl_hint_minutes: 30,
  notice: '',
}

const LeadLensGate = {
  _refreshPromise: null,
  API_BASES: LEADLENS_API_BASES,

  _storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (i) => resolve(i || {})))
  },
  _storageSet(obj) {
    return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()))
  },
  _storageRemove(keys) {
    return new Promise((resolve) => chrome.storage.local.remove(keys, () => resolve()))
  },

  async getApiKey() {
    const { qrinuxApiKey } = await this._storageGet(['qrinuxApiKey'])
    return qrinuxApiKey || null
  },
  async setApiKey(key) {
    await this._storageSet({ qrinuxApiKey: (key || '').trim() })
    await this._storageRemove([SESSION_STORE_KEY])
  },
  async clearApiKey() {
    await this._storageRemove(['qrinuxApiKey', SESSION_STORE_KEY])
  },

  async getDeviceFingerprint() {
    let { qrinuxDeviceFp } = await this._storageGet(['qrinuxDeviceFp'])
    if (!qrinuxDeviceFp) {
      qrinuxDeviceFp = (self.crypto && self.crypto.randomUUID)
        ? self.crypto.randomUUID()
        : ('dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36))
      await this._storageSet({ qrinuxDeviceFp })
    }
    return qrinuxDeviceFp
  },

  async _fetchJson(path, body, method) {
    let lastError = null
    for (const apiBase of this.API_BASES) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const opts = {
          method: method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        }
        if (body !== undefined && body !== null) opts.body = JSON.stringify(body)
        const res = await fetch(apiBase + path, opts)
        const text = await res.text()
        let data = {}
        try { data = text ? JSON.parse(text) : {} } catch (_) {}
        if (res.status < 500) return { ok: res.ok && data.ok === true, status: res.status, data }
        lastError = new Error(data.message || `Server response ${res.status}`)
      } catch (error) {
        lastError = error
      } finally {
        clearTimeout(timeout)
      }
    }
    const timedOut = lastError && lastError.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      data: {
        reason: timedOut ? 'timeout' : 'network_error',
        message: timedOut
          ? 'The Qrinux server took too long to respond. Please try again.'
          : 'The Qrinux verification service could not be reached. Reload the extension and try again.',
      },
    }
  },

  // ---------- Remote config ----------
  async _getCachedConfig() {
    const s = await this._storageGet([CONFIG_STORE_KEY])
    return s[CONFIG_STORE_KEY] || null
  },
  async getRemoteConfig(force) {
    const cached = await this._getCachedConfig()
    const now = Date.now()
    if (!force && cached && cached.expires_at && cached.expires_at > now && cached.config) {
      return cached.config
    }
    const result = await this._fetchJson('/api/public/config', null, 'GET')
    if (result.ok && result.data && result.data.config) {
      // Phase F: enforce Ed25519 signature. Reject unsigned/tampered payloads.
      const verifier = self.LeadLensSignedConfig
      if (!verifier) {
        if (cached && cached.config) return cached.config
        return Object.assign({}, CONFIG_DEFAULTS)
      }
      const v = await verifier.verify(result.data)
      if (!v.valid) {
        try { console.warn('[LeadLens] Remote config signature invalid:', v.reason) } catch (_) {}
        if (cached && cached.config) return cached.config
        return Object.assign({}, CONFIG_DEFAULTS)
      }
      const merged = Object.assign({}, CONFIG_DEFAULTS, result.data.config)
      const ttlSec = Number(result.data.ttl_seconds || 900)
      await this._storageSet({
        [CONFIG_STORE_KEY]: { config: merged, expires_at: now + ttlSec * 1000, fetched_at: now, signed: true },
      })
      return merged
    }
    if (cached && cached.config) return cached.config
    return Object.assign({}, CONFIG_DEFAULTS)
  },

  async _getSession() {
    const s = await this._storageGet([SESSION_STORE_KEY])
    return s[SESSION_STORE_KEY] || null
  },
  async _saveSession(session) {
    await this._storageSet({ [SESSION_STORE_KEY]: session })
  },
  async _clearSession() {
    await this._storageRemove([SESSION_STORE_KEY])
  },

  async _startSession() {
    const apiKey = await this.getApiKey()
    if (!apiKey) return { ok: false, data: { reason: 'no_api_key', message: 'API key required.' } }
    const device = await this.getDeviceFingerprint()
    const ua = (self.navigator && self.navigator.userAgent) ? self.navigator.userAgent.slice(0, 300) : ''
    const result = await this._fetchJson('/api/public/scan/session', {
      api_key: apiKey,
      device_fingerprint: device,
      user_agent: ua,
    })
    if (result.ok) {
      await this._saveSession({
        session_token: result.data.session_token,
        refresh_token: result.data.refresh_token,
        session_expires_at: result.data.session_expires_at,
        refresh_expires_at: result.data.refresh_expires_at,
      })
    }
    return result
  },

  async _refreshSession() {
    if (this._refreshPromise) return this._refreshPromise
    this._refreshPromise = (async () => {
      const session = await this._getSession()
      if (!session || !session.refresh_token) return { ok: false, data: { reason: 'no_session' } }
      const device = await this.getDeviceFingerprint()
      const result = await this._fetchJson('/api/public/scan/session/refresh', {
        refresh_token: session.refresh_token,
        device_fingerprint: device,
      })
      if (result.ok) {
        await this._saveSession({
          ...session,
          session_token: result.data.session_token,
          refresh_token: result.data.refresh_token || session.refresh_token,
          session_expires_at: result.data.session_expires_at,
          refresh_expires_at: result.data.refresh_expires_at || session.refresh_expires_at,
        })
      } else if (['reuse_detected', 'invalid_refresh', 'revoked', 'expired'].includes(result.data?.reason)) {
        await this._clearSession()
      }
      return result
    })()
    try { return await this._refreshPromise } finally { this._refreshPromise = null }
  },

  async _ensureSession() {
    let session = await this._getSession()
    const now = Date.now()
    if (session && session.session_expires_at && new Date(session.session_expires_at).getTime() - now > 60_000) {
      return session
    }
    if (session && session.refresh_token && session.refresh_expires_at && new Date(session.refresh_expires_at).getTime() > now) {
      const r = await this._refreshSession()
      if (r.ok) return await this._getSession()
    }
    const s = await this._startSession()
    if (!s.ok) return null
    return await this._getSession()
  },

  async verifyKey() {
    // Refresh remote config on activation (best effort).
    try { await this.getRemoteConfig(true) } catch (_) {}
    return this._startSession()
  },

  async authorize(url, opts) {
    const apiKey = await this.getApiKey()
    if (!apiKey) return { ok: false, reason: 'no_api_key', message: 'API key required. Open the extension options and paste your API key from your Qrinux LeadLens dashboard.' }

    // Kill-switch from remote config — checked opportunistically, non-fatal on fetch failure.
    try {
      const cfg = await this.getRemoteConfig(false)
      if (cfg && cfg.scan_disabled === true) {
        return { ok: false, reason: 'scan_disabled', message: 'Scanning is temporarily paused by the Qrinux team. Please try again shortly.' }
      }
    } catch (_) {}

    const device = await this.getDeviceFingerprint()
    let session = await this._ensureSession()

    for (let attempt = 0; attempt < 2; attempt++) {
      const payload = { device_fingerprint: device, website_url: url || '' }
      if (session && session.session_token) payload.session_token = session.session_token
      else payload.api_key = apiKey
      if (opts && opts.eventId) payload.event_id = String(opts.eventId).slice(0, 80)
      if (opts && opts.scanId) payload.scan_id = String(opts.scanId).slice(0, 80)

      const result = await this._fetchJson('/api/public/scan/authorize', payload)
      const data = result.data || {}
      if (result.ok) {
        return { ok: true, remaining: data.remaining, limit: data.limit, plan: data.plan, duplicate: !!data.duplicate }
      }
      if (session && ['session_invalid', 'session_expired', 'session_revoked'].includes(data.reason) && attempt === 0) {
        await this._clearSession()
        session = await this._ensureSession()
        if (session) continue
      }
      return { ok: false, reason: data.reason || 'denied', message: data.message || 'Scan denied.', remaining: data.remaining }
    }
    return { ok: false, reason: 'denied', message: 'Scan denied.' }
  },

  // ---------- Batch authorize (opt-in) ----------
  // events: [{ website_url, eventId?, scanId? }]
  async authorizeBatch(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return { ok: false, reason: 'bad_request', message: 'No events provided.' }
    }
    const apiKey = await this.getApiKey()
    if (!apiKey) return { ok: false, reason: 'no_api_key', message: 'API key required.' }
    const device = await this.getDeviceFingerprint()
    const session = await this._ensureSession()
    if (!session || !session.session_token) {
      return { ok: false, reason: 'session_invalid', message: 'Could not start session.' }
    }
    const cfg = await this.getRemoteConfig(false).catch(() => CONFIG_DEFAULTS)
    const cap = Math.max(1, Number(cfg.batch_max_events || 25))
    const trimmed = events.slice(0, cap).map((e) => {
      const out = { website_url: String(e.website_url || '').slice(0, 500) }
      if (e.eventId) out.event_id = String(e.eventId).slice(0, 80)
      if (e.scanId) out.scan_id = String(e.scanId).slice(0, 80)
      return out
    }).filter((e) => e.website_url)
    if (trimmed.length === 0) return { ok: false, reason: 'bad_request', message: 'No valid URLs in batch.' }

    const result = await this._fetchJson('/api/public/scan/batch', {
      session_token: session.session_token,
      device_fingerprint: device,
      events: trimmed,
    })
    if (!result.ok) {
      const data = result.data || {}
      return { ok: false, reason: data.reason || 'denied', message: data.message || 'Batch denied.' }
    }
    return {
      ok: true,
      plan: result.data.plan,
      limit: result.data.limit,
      remaining: result.data.remaining,
      results: result.data.results || [],
      batch_cap: Number(result.data.batch_cap || cap),
      dropped: result.data.dropped || 0,
    }
  },
}

self.LeadLensGate = LeadLensGate
