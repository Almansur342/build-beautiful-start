/* globals chrome, importScripts */

// MV3 service workers should use relative paths for importScripts.
// Using chrome.runtime.getURL() returns a full chrome-extension:// URL
// which some Chromium versions reject. Relative paths are universally supported.
// importScripts in an MV3 service worker resolves relative to the worker
// script URL (js/background.js), so sibling files must be referenced as
// './name.js' — using 'js/...' would resolve to js/js/... and 404.
try {
  importScripts(
    './message-guard.js',
    './signed-config.js',
    './apikey-gate.js',
    './scan-context.js',
    './scan-queue.js',
    '../vendor/public-suffix-data.js',
    './quality-runtime.js',
    './intelligence-runtime.js',
    './wappalyzer.js',
    './utils.js',
    './default-blacklist.js',
    './driver.js'
  )
} catch (e) {
  // Surface load failures so we can spot them in the SW console.
  console.error('[LeadLens] importScripts failed:', e)
}

// Phase C: chrome.alarms drives the persistent scan-event queue flush. The
// alarm survives service-worker eviction, so buffered events reach the
// backend even after Chrome puts the worker to sleep between scans.
try {
  chrome.alarms && chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm || alarm.name !== self.LEADLENS_QUEUE_ALARM) return
    if (self.LeadLensScanQueue) {
      self.LeadLensScanQueue.flush().catch(() => {})
    }
  })
  // Re-arm on worker startup so a fresh SW can drain a queue left behind.
  if (self.LeadLensScanQueue) self.LeadLensScanQueue.ensureAlarm()
} catch (e) {
  console.error('[LeadLens] alarms wiring failed:', e)
}

// Extension pages send activation checks through the service worker. This is
// more reliable than a direct cross-origin request from an extension document
// and uses the host permissions declared in manifest.json.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !message.type) return false
  if (message.type !== 'qrinuxValidateKey' && message.type !== 'qrinuxStartSession') return false

  // Phase E: envelope + sender + nonce + top-level type allowlist enforcement.
  const guard = self.LeadLensMessageGuard
  const verdict = guard ? guard.validateTopLevel(message, sender) : { ok: !!(sender && sender.id === chrome.runtime.id && !sender.tab) }
  if (!verdict.ok) {
    sendResponse({ ok: false, status: 0, data: { reason: 'unauthorized_sender', message: 'This request cannot be verified.' } })
    return false
  }
  if (sender && sender.tab) {
    sendResponse({ ok: false, status: 0, data: { reason: 'unauthorized_sender', message: 'This request cannot be verified.' } })
    return false
  }

  if (!self.LeadLensGate) {
    sendResponse({ ok: false, status: 0, data: { reason: 'extension_error', message: 'The extension service is not ready. Reload the extension and try again.' } })
    return false
  }

  // Phase 3: activation now saves the key + starts a session in one call.
  const runValidation = async () => {
    const payload = message.payload || {}
    const key = typeof payload.api_key === 'string' ? payload.api_key.trim() : ''
    if (!key || key.length > 512) return { ok: false, status: 0, data: { reason: 'bad_request', message: 'API key is required.' } }
    await self.LeadLensGate.setApiKey(key)
    const result = await self.LeadLensGate.verifyKey()
    if (!result.ok) {
      await self.LeadLensGate.clearApiKey()
    }
    return result
  }

  runValidation()
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, status: 0, data: { reason: 'extension_error', message: 'The extension could not complete verification. Reload it and try again.' } }))

  return true
})


chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('html/onboarding.html'),
    })
  }
})
