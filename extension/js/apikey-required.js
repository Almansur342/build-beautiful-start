'use strict'
/* globals chrome */
// Qrinux LeadLens — mandatory API key gate for ALL extension pages.
// Validates the pasted key against the SaaS backend before unlocking.

;(function () {
  const API_BASE = 'https://build-beautiful-start.lovable.app'
  const DASHBOARD_URL = API_BASE + '/dashboard'

  function getKey() {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(['qrinuxApiKey'], (i) => resolve((i && i.qrinuxApiKey) || '')) }
      catch (e) { resolve('') }
    })
  }
  function setKey(v) {
    return new Promise((resolve) => {
      try { chrome.storage.local.set({ qrinuxApiKey: (v || '').trim() }, () => resolve()) }
      catch (e) { resolve() }
    })
  }
  function getOrMakeFp() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['qrinuxDeviceFp'], (i) => {
          let fp = i && i.qrinuxDeviceFp
          if (!fp) {
            fp = (self.crypto && self.crypto.randomUUID)
              ? self.crypto.randomUUID()
              : ('dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36))
            chrome.storage.local.set({ qrinuxDeviceFp: fp }, () => resolve(fp))
          } else {
            resolve(fp)
          }
        })
      } catch (e) {
        resolve('dev_' + Math.random().toString(36).slice(2))
      }
    })
  }

  function buildOverlay() {
    const wrap = document.createElement('div')
    wrap.id = 'qrinux-key-gate'
    wrap.setAttribute('style', [
      'position:fixed','inset:0','z-index:2147483647',
      'background:rgba(15,15,17,0.96)','color:#fff',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'display:flex','align-items:center','justify-content:center',
      'padding:24px','overflow:auto',
    ].join(';'))

    wrap.innerHTML = `
      <div style="max-width:420px;width:100%;background:#0b0b0c;border:1px solid #262629;padding:28px;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <div style="width:32px;height:32px;background:#fff;color:#000;display:grid;place-items:center;font-weight:800">Q</div>
          <div style="font-weight:600;font-size:15px;letter-spacing:0.2px">Qrinux LeadLens</div>
        </div>
        <div style="font-size:20px;font-weight:600;line-height:1.3;margin-bottom:8px">Activate your extension</div>
        <div style="font-size:13px;color:#a1a1aa;line-height:1.55;margin-bottom:18px">
          Paste your personal API key from your Qrinux dashboard to unlock scanning on this device.
        </div>

        <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;margin-bottom:6px">API key</label>
        <input id="qrinux-key-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="qlk_..."
          style="width:100%;box-sizing:border-box;padding:11px 12px;background:#141416;color:#fff;border:1px solid #2a2a2d;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;outline:none" />

        <div id="qrinux-key-msg" style="font-size:12px;min-height:16px;margin-top:8px;line-height:1.45"></div>

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
    wrap.addEventListener('click', (e) => e.stopPropagation(), true)
    wrap.addEventListener('keydown', (e) => e.stopPropagation(), true)
    return wrap
  }

  function setMsg(el, text, kind) {
    el.textContent = text || ''
    el.style.color = kind === 'success' ? '#4ade80' : kind === 'info' ? '#a1a1aa' : '#f87171'
  }

  async function validateKey(key) {
    const fp = await getOrMakeFp()
    try {
      const res = await fetch(API_BASE + '/api/public/scan/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, device_fingerprint: fp, website_url: '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) return { ok: true, data }
      return { ok: false, reason: data.reason || 'denied', message: data.message || `Server returned ${res.status}.` }
    } catch (e) {
      return { ok: false, reason: 'network_error', message: 'Could not reach Qrinux server. Check your internet connection.' }
    }
  }

  function showGate() {
    if (document.getElementById('qrinux-key-gate')) return
    const overlay = buildOverlay()
    document.documentElement.appendChild(overlay)
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
      if (v.length < 8) { setMsg(msg, 'Please paste a valid API key.', 'error'); return }
      btn.disabled = true
      const originalLabel = btn.textContent
      btn.textContent = 'Verifying…'
      setMsg(msg, 'Checking your key with Qrinux…', 'info')

      const result = await validateKey(v)
      if (result.ok) {
        await setKey(v)
        const plan = (result.data && result.data.plan) || 'Free'
        const remaining = result.data && result.data.remaining
        setMsg(
          msg,
          `✓ Activated on ${plan} plan${remaining != null ? ` — ${remaining} scans left today` : ''}. Reloading…`,
          'success'
        )
        setTimeout(() => location.reload(), 900)
      } else {
        btn.disabled = false
        btn.textContent = originalLabel
        setMsg(msg, result.message || 'Activation failed.', 'error')
      }
    }

    btn.addEventListener('click', submit)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } })
    input.addEventListener('input', () => setMsg(msg, '', 'info'))
  }

  function hideGate() {
    const el = document.getElementById('qrinux-key-gate')
    if (el) el.remove()
    try { document.documentElement.style.overflow = '' } catch (e) {}
  }

  async function run() {
    const key = await getKey()
    if (!key) {
      if (document.documentElement) showGate()
      else document.addEventListener('DOMContentLoaded', showGate, { once: true })
    } else {
      hideGate()
    }
  }

  run()

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.qrinuxApiKey) return
      if (changes.qrinuxApiKey.newValue) location.reload()
      else showGate()
    })
  } catch (e) {}
})()
