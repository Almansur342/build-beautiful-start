import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root = process.cwd();
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const manifest = JSON.parse(read('extension/manifest.json'));
assert(manifest.version === '1.13.0', 'manifest version mismatch');
assert(manifest.permissions.includes('alarms'), 'alarms permission missing');

const allText = ['extension/js/scan-context.js','extension/js/scan-queue.js','extension/js/apikey-gate.js','extension/js/content.js','extension/js/driver.js','extension/js/contacts.js'].map(read).join('\n');
assert(!allText.includes('document.cookie.split'), 'cookie values are still read');
assert(!allText.includes('project-server-rnx5.onrender.com'), 'third-party proxy remains');
assert(!/credentials\s*:\s*['"]include['"]/.test(allText), 'credentialed crawl remains');
assert(!/evt_' \+ bucket/.test(allText), 'bucketed event id remains');
assert(allText.includes('refresh_token: result.data.refresh_token || session.refresh_token'), 'rotated refresh token not persisted');
assert(allText.includes('const byId = new Map'), 'partial acknowledgements missing');
assert(allText.includes('next_attempt_at'), 'queue backoff metadata missing');

// Exercise scan context with real WebCrypto.
const scanCtxCode = read('extension/js/scan-context.js');
const ctxSandbox = { self: { crypto: crypto.webcrypto, LeadLensGate: { getDeviceFingerprint: async () => 'device-1234' } }, URL, TextEncoder, Uint8Array, Object, Date, Math };
vm.createContext(ctxSandbox);
vm.runInContext(scanCtxCode, ctxSandbox);
const a = await ctxSandbox.self.LeadLensScanContext.createFromUrl('https://example.com/?utm_source=x');
const b = await ctxSandbox.self.LeadLensScanContext.createFromUrl('https://example.com/?utm_source=x');
assert(a.event_id !== b.event_id, 'separate scans share event id');
assert(Object.isFrozen(a), 'scan context is not frozen');

// Exercise queue partial acknowledgements.
const store = {};
const alarms = { get: (_n, cb) => cb({ name: 'qrinuxScanQueueFlush' }), create: () => {} };
const qSandbox = {
  self: {
    LeadLensGate: {
      getRemoteConfig: async () => ({ batch_max_events: 25 }),
      authorizeBatch: async (events) => ({ ok: true, results: events.map((e, i) => ({ event_id: e.eventId, ok: i === 0 })) }),
    },
  },
  chrome: { storage: { local: { get: (keys, cb) => cb(store), set: (obj, cb) => { Object.assign(store, obj); cb?.(); } } }, alarms },
  Date, Math, Set, Map, Promise, Array, Number,
};
vm.createContext(qSandbox);
vm.runInContext(read('extension/js/scan-queue.js'), qSandbox);
await qSandbox.self.LeadLensScanQueue.enqueue({ scan_id: 's1', event_id: 'event-0001', url: 'https://a.test' });
await qSandbox.self.LeadLensScanQueue.enqueue({ scan_id: 's2', event_id: 'event-0002', url: 'https://b.test' });
const qr = await qSandbox.self.LeadLensScanQueue.flush();
assert(qr.drained === 1, 'partial ack drained wrong count');
assert(store.qrinuxScanQueue.length === 1, 'failed event was lost');

const dashboard = read('src/lib/dashboard.functions.ts');
assert(dashboard.includes("from('user_usage_daily')"), 'dashboard today count still legacy');
assert(dashboard.includes("from('scan_events')"), 'dashboard history still legacy');
assert(!fs.existsSync(path.join(root, '.env')), '.env included');
assert(!fs.existsSync(path.join(root, '.env.development')), '.env.development included');

console.log('release verification: PASS');
