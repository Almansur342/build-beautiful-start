'use strict'
/* globals chrome */
// Qrinux LeadLens — Immutable scan context (Phase C)
//
// Every scan gets a single, frozen context object at the moment it starts.
// The context binds: scan_id, event_id (cryptographically random idempotency key), url, host,
// started_at, device_fingerprint. Downstream steps (related-page fetch,
// enrichment, batching) must reuse this exact context — they cannot mutate
// url or scan_id mid-flight, which is what let earlier versions log the
// wrong URL when a tab navigated during a slow scan.

const LeadLensScanContext = {
  async createFromUrl(url, authorization) {
    const clean = String(url || '').slice(0, 500)
    if (!clean) return null

    let host = ''
    try { host = new URL(clean).host.toLowerCase() } catch (_) { host = '' }

    const makeUuid = (prefix) => {
      if (self.crypto && self.crypto.randomUUID) return prefix + self.crypto.randomUUID()
      const bytes = new Uint8Array(16)
      try { self.crypto.getRandomValues(bytes) } catch (_) {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
      }
      return prefix + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    }

    const scanId = authorization?.scan_id || authorization?.scanId || makeUuid('scan_')
    const eventId = authorization?.event_id || authorization?.eventId || makeUuid('evt_')
    const authorizedUrl = authorization?.website_url || authorization?.url || clean

    const device = (self.LeadLensGate && await self.LeadLensGate.getDeviceFingerprint()) || ''

    return Object.freeze({
      scan_id: scanId,
      event_id: eventId,
      url: String(authorizedUrl || clean).slice(0, 500),
      page_url: clean,
      host,
      device_fingerprint: device,
      started_at: Date.now(),
      tab_id: null,
      scan_mode: 'manual',
      completed_steps: Object.freeze([]),
      cookie_action_taken: false,
      cancelled: false,
      scan_token: authorization && authorization.scan_token ? authorization.scan_token : null,
    })
  },
}

self.LeadLensScanContext = LeadLensScanContext
