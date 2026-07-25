'use strict'
/* globals chrome */
// Qrinux LeadLens — Persistent scan-event queue (Phase C)
//
// Buffers scan events in chrome.storage.local and flushes them via the
// /api/public/scan/batch endpoint on a chrome.alarms tick. Using alarms —
// not setTimeout — because MV3 service workers can be evicted at any time;
// alarms survive the eviction and wake the worker to drain the queue.
//
// The queue is idempotent: each event carries the immutable scan context's
// event_id/scan_id, so the backend deduplicates within a 60s bucket even if
// the same event is retried after a worker restart.

const QUEUE_STORE_KEY = 'qrinuxScanQueue'
const QUEUE_ALARM = 'qrinuxScanQueueFlush'
const QUEUE_MAX_AGE_MS = 10 * 60 * 1000       // drop events older than 10 min
const QUEUE_HARD_CAP = 500                    // guardrail against runaway growth
const DEFAULT_FLUSH_MINUTES = 1               // chrome.alarms minimum in prod is 1 min

const LeadLensScanQueue = {
  _flushing: false,

  async _storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (i) => resolve(i || {})))
  },
  async _storageSet(obj) {
    return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()))
  },

  async _load() {
    const s = await this._storageGet([QUEUE_STORE_KEY])
    const raw = s[QUEUE_STORE_KEY]
    return Array.isArray(raw) ? raw : []
  },
  async _save(items) {
    await this._storageSet({ [QUEUE_STORE_KEY]: items })
  },

  // ctx is a frozen LeadLensScanContext object.
  async enqueue(ctx) {
    if (!ctx || !ctx.url || !ctx.event_id) return
    const items = await this._load()

    // De-dupe on event_id — if the same bucketed event is already pending we
    // don't queue a second copy.
    if (items.some((it) => it.event_id === ctx.event_id)) return

    items.push({
      scan_id: ctx.scan_id,
      event_id: ctx.event_id,
      website_url: ctx.url,
      queued_at: Date.now(),
    })

    // Cap size — drop oldest first.
    while (items.length > QUEUE_HARD_CAP) items.shift()
    await this._save(items)
    await this.ensureAlarm()
  },

  async ensureAlarm() {
    try {
      if (!chrome.alarms) return
      chrome.alarms.get(QUEUE_ALARM, (existing) => {
        if (!existing) {
          chrome.alarms.create(QUEUE_ALARM, {
            delayInMinutes: DEFAULT_FLUSH_MINUTES,
            periodInMinutes: DEFAULT_FLUSH_MINUTES,
          })
        }
      })
    } catch (_) { /* alarms not available */ }
  },

  async _pruneStale(items) {
    const now = Date.now()
    return items.filter((it) => (now - Number(it.queued_at || 0)) < QUEUE_MAX_AGE_MS)
  },

  async flush() {
    if (this._flushing) return { ok: false, reason: 'busy' }
    this._flushing = true
    try {
      let items = await this._load()
      items = await this._pruneStale(items)

      if (items.length === 0) {
        await this._save([])
        // No work — let the alarm stay so we wake up next tick.
        return { ok: true, drained: 0, remaining: 0 }
      }

      if (!self.LeadLensGate || typeof self.LeadLensGate.authorizeBatch !== 'function') {
        await this._save(items)
        return { ok: false, reason: 'gate_unavailable', remaining: items.length }
      }

      // Read the batch cap from remote config, fall back to 25.
      let cap = 25
      try {
        const cfg = await self.LeadLensGate.getRemoteConfig(false)
        if (cfg && Number(cfg.batch_max_events) > 0) cap = Math.min(50, Number(cfg.batch_max_events))
      } catch (_) {}

      const inFlight = items.slice(0, cap)
      const rest = items.slice(cap)

      const result = await self.LeadLensGate.authorizeBatch(inFlight.map((it) => ({
        website_url: it.website_url,
        eventId: it.event_id,
        scanId: it.scan_id,
      })))

      // On success, drop the in-flight slice. On network / server error, keep
      // them and retry on the next alarm tick.
      if (result && result.ok) {
        await this._save(rest)
        return { ok: true, drained: inFlight.length, remaining: rest.length }
      }

      const reason = result && result.reason
      // Auth/plan denials won't recover on retry — drop the slice so the
      // queue can't wedge forever.
      const permanent = ['no_api_key', 'session_invalid', 'plan_denied', 'quota_exceeded', 'scan_disabled', 'bad_request']
      if (permanent.includes(reason)) {
        await this._save(rest)
        return { ok: false, reason, drained: inFlight.length, remaining: rest.length }
      }

      // Transient — put items back at the front.
      await this._save(items)
      return { ok: false, reason: reason || 'network_error', remaining: items.length }
    } finally {
      this._flushing = false
    }
  },

  async clear() {
    await this._save([])
  },
}

self.LeadLensScanQueue = LeadLensScanQueue
self.LEADLENS_QUEUE_ALARM = QUEUE_ALARM
