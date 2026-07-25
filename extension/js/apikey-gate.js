'use strict'
/* globals chrome */
// Qrinux LeadLens — API key + session gate (v1.7.0)
// Exchanges the raw API key for a short-lived session token once, then
// authorizes every scan with the session token. Refreshes silently on expiry.

const LEADLENS_API_BASES = [
  'https://project--57326e63-a9d3-4e6d-affb-f073213686f0.lovable.app',
  'https://build-beautiful-start.lovable.app',
]

const SESSION_STORE_KEY = 'qrinuxSession'

const LeadLensGate = {
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
    // Any key change invalidates existing session.
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

  async _fetchJson(path, body) {
    let lastError = null
    for (const apiBase of this.API_BASES) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const res = await fetch(apiBase + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
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
        session_expires_at: result.data.session_expires_at,
      })
    }
    return result
  },

  async _ensureSession() {
    let session = await this._getSession()
    const now = Date.now()
    // Preemptively refresh 60s before expiry.
    if (session && session.session_expires_at && new Date(session.session_expires_at).getTime() - now > 60_000) {
      return session
    }
    // Try refresh first if we have a refresh token that hasn't expired.
    if (session && session.refresh_token && session.refresh_expires_at && new Date(session.refresh_expires_at).getTime() > now) {
      const r = await this._refreshSession()
      if (r.ok) return await this._getSession()
    }
    // Fall back to starting a fresh session with the API key.
    const s = await this._startSession()
    if (!s.ok) return null
    return await this._getSession()
  },

  // Verifies the API key against the SaaS backend and starts a session.
  // Used by the activation modal (apikey-required.js).
  async verifyKey() {
    return this._startSession()
  },

  async authorize(url, opts) {
    const apiKey = await this.getApiKey()
    if (!apiKey) return { ok: false, reason: 'no_api_key', message: 'API key required. Open the extension options and paste your API key from your Qrinux LeadLens dashboard.' }
    const device = await this.getDeviceFingerprint()

    let session = await this._ensureSession()
    // authorize the request (retry once on session invalidation)
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
      // Session-related failures: refresh once and retry.
      if (session && ['session_invalid', 'session_expired', 'session_revoked'].includes(data.reason) && attempt === 0) {
        await this._clearSession()
        session = await this._ensureSession()
        if (session) continue
      }
      return { ok: false, reason: data.reason || 'denied', message: data.message || 'Scan denied.', remaining: data.remaining }
    }
    return { ok: false, reason: 'denied', message: 'Scan denied.' }
  },
}

self.LeadLensGate = LeadLensGate
