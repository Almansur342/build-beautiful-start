/* globals chrome, importScripts */

// MV3 service workers should use relative paths for importScripts.
// Using chrome.runtime.getURL() returns a full chrome-extension:// URL
// which some Chromium versions reject. Relative paths are universally supported.
// importScripts in an MV3 service worker resolves relative to the worker
// script URL (js/background.js), so sibling files must be referenced as
// './name.js' — using 'js/...' would resolve to js/js/... and 404.
try {
  importScripts(
  './apikey-gate.js',
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

// Extension pages send activation checks through the service worker. This is
// more reliable than a direct cross-origin request from an extension document
// and uses the host permissions declared in manifest.json.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || (message.type !== 'qrinuxValidateKey' && message.type !== 'qrinuxStartSession')) return false

  // Phase 2 security: only accept requests from this extension.
  if (!sender || sender.id !== chrome.runtime.id || sender.tab) {
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
    const key = (payload.api_key || '').trim()
    if (!key) return { ok: false, status: 0, data: { reason: 'bad_request', message: 'API key is required.' } }
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
