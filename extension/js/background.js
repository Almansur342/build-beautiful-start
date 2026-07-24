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

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('html/onboarding.html'),
    })
  }
})
