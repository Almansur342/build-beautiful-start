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
// event_id/scan_id, so the backend deduplicates retries even if
// the same event is retried after a worker restart.

const QUEUE_STORE_KEY = 'qrinuxScanQueue'
const QUEUE_ALARM = 'qrinuxScanQueueFlush'
const DEFAULT_FLUSH_MINUTES = 1               // chrome.alarms minimum in prod is 1 min

const LeadLensScanQueue = {
  _flushing: false,
  _serverCap: null,
  // Every queue read-modify-write in this service-worker instance is serialized.
  _storeChain: Promise.resolve(),

  _withStoreLock(task) {
    const run = this._storeChain.then(task, task)
    this._storeChain = run.catch(() => undefined)
    return run
  },

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
    await this._withStoreLock(async () => {
      const items = await this._load()
      if (items.some((it) => it.event_id === ctx.event_id)) return
      items.push({
        scan_id: ctx.scan_id,
        event_id: ctx.event_id,
        website_url: ctx.url,
        queued_at: Date.now(),
        attempts: 0,
        next_attempt_at: 0,
      })
      // Never discard an unacknowledged event. unlimitedStorage is declared
      // specifically so offline scan history can survive until the server acks it.
      await this._save(items)
    })
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

  async flush() {
    if (this._flushing) return { ok: false, reason: 'busy' }
    this._flushing = true
    try {
      return await this._withStoreLock(async () => {
      const items = await this._load()
      const now = Date.now()
      const ready = items.filter((it) => Number(it.next_attempt_at || 0) <= now)

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
      if (Number(this._serverCap) > 0) cap = Math.min(cap, Number(this._serverCap))

      if (ready.length === 0) { await this._save(items); return { ok: true, drained: 0, remaining: items.length } }
      const inFlight = ready.slice(0, cap)
      const inFlightIds = new Set(inFlight.map((it) => it.event_id))
      const rest = items.filter((it) => !inFlightIds.has(it.event_id))

      const result = await self.LeadLensGate.authorizeBatch(inFlight.map((it) => ({
        website_url: it.website_url,
        eventId: it.event_id,
        scanId: it.scan_id,
      })))

      // Delete only events individually acknowledged as stored/duplicate by
      // the authoritative backend. Every other event remains durable locally.
      if (result && result.ok) {
        if (Number(result.batch_cap) > 0) this._serverCap = Number(result.batch_cap)
        const rows = Array.isArray(result.results) ? result.results : []
        const byId = new Map(rows.map((row) => [row.event_id, row]))
        const retry = []
        let drained = 0
        for (const item of inFlight) {
          const row = byId.get(item.event_id)
          // A positive per-event acknowledgement means consume_scan_quota has
          // durably stored this event_id (or confirmed the same id already
          // exists). Only then is the local copy removed.
          if (row && row.ok) { drained += 1; continue }
          const reason = row?.reason || 'missing_ack'
          const attempts = Number(item.attempts || 0) + 1
          const delay = Math.min(60 * 60 * 1000, (2 ** attempts) * 30_000) + Math.floor(Math.random() * 15_000)
          retry.push({ ...item, attempts, next_attempt_at: Date.now() + delay, last_error: reason })
        }
        const next = [...retry, ...rest].sort((a, b) => Number(a.queued_at) - Number(b.queued_at))
        await this._save(next)
        return { ok: true, drained, remaining: next.length }
      }

      const reason = result && result.reason
      const retry = inFlight.map((item) => {
        const attempts = Number(item.attempts || 0) + 1
        const retryAfterMs = Math.max(0, Number(result?.retry_after || 0) * 1000)
        const delay = retryAfterMs || (Math.min(60 * 60 * 1000, (2 ** attempts) * 30_000) + Math.floor(Math.random() * 15_000))
        return { ...item, attempts, next_attempt_at: Date.now() + delay, last_error: reason || 'network_error' }
      })
      const next = [...retry, ...rest].sort((a, b) => Number(a.queued_at) - Number(b.queued_at))
      await this._save(next)
      return { ok: false, reason: reason || 'network_error', remaining: next.length }
      })
    } finally {
      this._flushing = false
    }
  },

  async clear() {
    await this._withStoreLock(() => this._save([]))
  },
}

self.LeadLensScanQueue = LeadLensScanQueue
self.LEADLENS_QUEUE_ALARM = QUEUE_ALARM
