'use strict'
/* globals chrome */
// Qrinux LeadLens — API key gate (v1.5.0-gate)
// Enforces API key + device binding + daily limits by calling the
// Qrinux LeadLens SaaS backend before every scan.

const LEADLENS_API_BASE = 'https://build-beautiful-start.lovable.app'

const LeadLensGate = {
  API_BASE: LEADLENS_API_BASE,

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

  async authorize(url) {
    const apiKey = await this.getApiKey()
    if (!apiKey) return { ok: false, reason: 'no_api_key', message: 'API key required. Open the extension options and paste your API key from your Qrinux LeadLens dashboard.' }
    const deviceFp = await this.getDeviceFingerprint()
    try {
      const res = await fetch(this.API_BASE + '/api/public/scan/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, device_fingerprint: deviceFp, website_url: url || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        return { ok: false, reason: data.reason || 'denied', message: data.message || 'Scan denied.', remaining: data.remaining }
      }
      return { ok: true, remaining: data.remaining, limit: data.limit, plan: data.plan }
    } catch (e) {
      return { ok: false, reason: 'network_error', message: 'Could not reach Qrinux server. Check your internet connection.' }
    }
  },
}

// Expose globally for driver.js
self.LeadLensGate = LeadLensGate
