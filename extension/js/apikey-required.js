'use strict'
/* globals chrome */
// Qrinux LeadLens — mandatory API key gate for ALL extension pages.
// Renders a full-screen overlay that blocks every feature until the user
// pastes the API key from their Qrinux LeadLens dashboard.

;(function () {
  const DASHBOARD_URL = 'https://build-beautiful-start.lovable.app/dashboard'

  function getKey() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['qrinuxApiKey'], (i) => resolve((i && i.qrinuxApiKey) || ''))
      } catch (e) { resolve('') }
    })
  }

  function setKey(v) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ qrinuxApiKey: (v || '').trim() }, () => resolve())
      } catch (e) { resolve() }
    })
  }

  function buildOverlay() {
    const wrap = document.createElement('div')
    wrap.id = 'qrinux-key-gate'
    wrap.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(15,15,17,0.96)', 'color:#fff',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:24px', 'overflow:auto',
    ].join(';'))

    wrap.innerHTML = `
      <div style="max-width:420px;width:100%;background:#0b0b0c;border:1px solid #262629;padding:28px;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <div style="width:32px;height:32px;background:#fff;color:#000;display:grid;place-items:center;font-weight:800">Q</div>
          <div style="font-weight:600;font-size:15px;letter-spacing:0.2px">Qrinux LeadLens</div>
        </div>
        <div style="font-size:20px;font-weight:600;line-height:1.3;margin-bottom:8px">Activate your extension</div>
        <div style="font-size:13px;color:#a1a1aa;line-height:1.55;margin-bottom:18px">
          Every user — free or paid — needs an API key to use LeadLens. Paste your personal key from your Qrinux dashboard to unlock scanning, contacts, and all features on this device.
        </div>

        <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;margin-bottom:6px">API key</label>
        <input id="qrinux-key-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="qlk_..."
          style="width:100%;box-sizing:border-box;padding:11px 12px;background:#141416;color:#fff;border:1px solid #2a2a2d;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;outline:none" />

        <div id="qrinux-key-msg" style="font-size:12px;color:#f87171;min-height:16px;margin-top:8px"></div>

        <button id="qrinux-key-save"
          style="width:100%;margin-top:6px;padding:11px 14px;background:#fff;color:#000;border:0;font-weight:600;font-size:13px;cursor:pointer">
          Activate LeadLens
        </button>

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1f1f22;font-size:12px;color:#a1a1aa;line-height:1.6">
          Don't have a key yet?<br>
          <a id="qrinux-open-dashboard" href="${DASHBOARD_URL}" target="_blank"
            style="color:#fff;text-decoration:underline">Open your Qrinux dashboard →</a>
        </div>

        <div style="margin-top:14px;font-size:11px;color:#71717a;line-height:1.55">
          One API key locks to one device on first use. Free plan includes 100 scans / 24h.
        </div>
      </div>
    `

    // Prevent any interaction with the page beneath.
    wrap.addEventListener('click', (e) => e.stopPropagation(), true)
    wrap.addEventListener('keydown', (e) => e.stopPropagation(), true)
    return wrap
  }

  function showGate() {
    if (document.getElementById('qrinux-key-gate')) return
    const overlay = buildOverlay()
    document.documentElement.appendChild(overlay)
    // Lock scroll on host
    try { document.documentElement.style.overflow = 'hidden' } catch (e) {}

    const input = overlay.querySelector('#qrinux-key-input')
    const msg = overlay.querySelector('#qrinux-key-msg')
    const btn = overlay.querySelector('#qrinux-key-save')
    const dashLink = overlay.querySelector('#qrinux-open-dashboard')

    dashLink.addEventListener('click', (e) => {
      e.preventDefault()
      try { chrome.tabs.create({ url: DASHBOARD_URL }) } catch (_) { window.open(DASHBOARD_URL, '_blank') }
    })

    setTimeout(() => { try { input.focus() } catch (_) {} }, 60)

    async function submit() {
      const v = (input.value || '').trim()
      if (v.length < 8) { msg.textContent = 'Please paste a valid API key.'; return }
      btn.disabled = true
      btn.textContent = 'Activating…'
      msg.textContent = ''
      await setKey(v)
      // Reload so the page's own scripts see the key from the start.
      setTimeout(() => location.reload(), 200)
    }

    btn.addEventListener('click', submit)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } })
  }

  function hideGate() {
    const el = document.getElementById('qrinux-key-gate')
    if (el) el.remove()
    try { document.documentElement.style.overflow = '' } catch (e) {}
  }

  async function run() {
    const key = await getKey()
    if (!key) {
      // Show as early as possible; if body isn't ready yet, retry.
      if (document.documentElement) showGate()
      else document.addEventListener('DOMContentLoaded', showGate, { once: true })
    } else {
      hideGate()
    }
  }

  // Kick off immediately.
  run()

  // React to key changes from other tabs (e.g. options page saved it).
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.qrinuxApiKey) return
      if (changes.qrinuxApiKey.newValue) location.reload()
      else showGate()
    })
  } catch (e) {}
})()
