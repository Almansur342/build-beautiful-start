'use strict'
/* globals chrome */
// Qrinux LeadLens — Immutable scan context (Phase C)
//
// Every scan gets a single, frozen context object at the moment it starts.
// The context binds: scan_id, event_id (idempotency bucket), url, host,
// started_at, device_fingerprint. Downstream steps (related-page fetch,
// enrichment, batching) must reuse this exact context — they cannot mutate
// url or scan_id mid-flight, which is what let earlier versions log the
// wrong URL when a tab navigated during a slow scan.

const LeadLensScanContext = {
  async createFromUrl(url) {
    const clean = String(url || '').slice(0, 500)
    if (!clean) return null

    let host = ''
    try { host = new URL(clean).host.toLowerCase() } catch (_) { host = '' }

    const bucket = Math.floor(Date.now() / 60000)
    let urlHash = ''
    try {
      const buf = await self.crypto.subtle.digest('SHA-1', new TextEncoder().encode(clean))
      urlHash = Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch (_) {
      urlHash = Math.random().toString(36).slice(2, 18)
    }

    const scanId = (self.crypto && self.crypto.randomUUID)
      ? self.crypto.randomUUID()
      : ('scan_' + bucket + '_' + Math.random().toString(36).slice(2, 10))

    const device = (self.LeadLensGate && await self.LeadLensGate.getDeviceFingerprint()) || ''

    return Object.freeze({
      scan_id: scanId,
      event_id: 'evt_' + bucket + '_' + urlHash,
      url: clean,
      host,
      device_fingerprint: device,
      started_at: Date.now(),
    })
  },
}

self.LeadLensScanContext = LeadLensScanContext
