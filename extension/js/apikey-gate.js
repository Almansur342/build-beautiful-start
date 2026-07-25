'use strict'
/* globals chrome */
// Qrinux LeadLens — API key gate (v1.5.0-gate)
// Enforces API key + device binding + daily limits by calling the
// Qrinux LeadLens SaaS backend before every scan.

const LEADLENS_API_BASES = [
  'https://project--57326e63-a9d3-4e6d-affb-f073213686f0.lovable.app',
  'https://build-beautiful-start.lovable.app',
]

const LeadLensGate = {
  API_BASES: LEADLENS_API_BASES,

  async _storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (i) => resolve(i || {})))
  },
  async _storageSet(obj) {
    return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()))
  },

  async getApiKey() {
    const { qrinuxApiKey } = await this._storageGet(['qrinuxApiKey'])
    return qrinuxApiKey || null
  },
  async setApiKey(key) {
    await this._storageSet({ qrinuxApiKey: (key || '').trim() })
  },
  async clearApiKey() {
    await new Promise((resolve) => chrome.storage.local.remove(['qrinuxApiKey'], () => resolve()))
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

  async requestAuthorization(payload) {
    let lastError = null

    for (const apiBase of this.API_BASES) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      try {
        const res = await fetch(apiBase + '/api/public/scan/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        const responseText = await res.text()
        let data = {}
        try { data = responseText ? JSON.parse(responseText) : {} } catch (_) {}

        if (res.status < 500) {
          return {
            ok: res.ok && data.ok === true,
            status: res.status,
            data,
          }
        }

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

  async authorize(url) {
    const apiKey = await this.getApiKey()
    if (!apiKey) return { ok: false, reason: 'no_api_key', message: 'API key required. Open the extension options and paste your API key from your Qrinux LeadLens dashboard.' }
    const deviceFp = await this.getDeviceFingerprint()
    const result = await this.requestAuthorization({
      api_key: apiKey,
      device_fingerprint: deviceFp,
      website_url: url || '',
    })
    const data = result.data || {}
    if (!result.ok) {
      return { ok: false, reason: data.reason || 'denied', message: data.message || 'Scan denied.', remaining: data.remaining }
    }
    return { ok: true, remaining: data.remaining, limit: data.limit, plan: data.plan }
  },
}

// Expose globally for driver.js
self.LeadLensGate = LeadLensGate
