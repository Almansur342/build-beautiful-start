'use strict'
/* globals chrome */
// Qrinux LeadLens — mandatory API key gate for ALL extension pages.
// Validates the pasted key against the SaaS backend before unlocking.

;(function () {
  const DASHBOARD_URL = 'https://build-beautiful-start.lovable.app/dashboard'

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
      'display:block','overflow:auto',
      '-webkit-overflow-scrolling:touch',
      'padding:16px','box-sizing:border-box',
    ].join(';'))

    wrap.innerHTML = `
      <div style="max-width:420px;width:100%;margin:0 auto;background:#0b0b0c;border:1px solid #262629;padding:20px;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div style="width:28px;height:28px;background:#fff;color:#000;display:grid;place-items:center;font-weight:800;font-size:13px">Q</div>
          <div style="font-weight:600;font-size:14px;letter-spacing:0.2px">Qrinux LeadLens</div>
        </div>
        <div style="font-size:17px;font-weight:600;line-height:1.3;margin-bottom:6px">Activate your extension</div>
        <div style="font-size:12px;color:#a1a1aa;line-height:1.5;margin-bottom:14px">
          Paste your personal API key from your Qrinux dashboard to unlock scanning on this device.
        </div>

        <label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;margin-bottom:6px">API key</label>
        <input id="qrinux-key-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="qlk_..."
          style="width:100%;box-sizing:border-box;padding:10px 11px;background:#141416;color:#fff;border:1px solid #2a2a2d;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;outline:none" />

        <div id="qrinux-key-msg" role="status" aria-live="polite"
          style="font-size:12px;min-height:16px;margin-top:8px;line-height:1.45"></div>

        <button id="qrinux-key-save"
          style="width:100%;margin-top:4px;padding:10px 14px;background:#fff;color:#000;border:0;font-weight:600;font-size:13px;cursor:pointer">
          Activate LeadLens
        </button>

        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #1f1f22;font-size:11px;color:#a1a1aa;line-height:1.55">
          Don't have a key yet?<br>
          <a id="qrinux-open-dashboard" href="${DASHBOARD_URL}" target="_blank"
            style="color:#fff;text-decoration:underline">Open your Qrinux dashboard →</a>
        </div>

        <div style="margin-top:10px;font-size:10px;color:#71717a;line-height:1.5">
          One API key locks to one device on first use. Free plan includes 100 scans / 24h.
        </div>
      </div>
    `
    return wrap
  }

  function setMsg(el, text, kind) {
    el.textContent = text || ''
    el.style.color = kind === 'success' ? '#4ade80' : kind === 'info' ? '#a1a1aa' : '#f87171'
  }

  async function validateKey(key) {
    const fp = await getOrMakeFp()
    try {
      const result = await new Promise((resolve) => {
        let settled = false
        const timer = setTimeout(() => {
          if (settled) return
          settled = true
          resolve({
            ok: false,
            status: 0,
            data: { reason: 'timeout', message: 'The Qrinux server took too long to respond. Please try again.' },
          })
        }, 32000)

        const guard = (typeof self !== 'undefined' && self.LeadLensMessageGuard) || null
        const validateMsg = {
          type: 'qrinuxValidateKey',
          payload: { api_key: key, device_fingerprint: fp, website_url: '' },
        }
        if (guard) {
          validateMsg.nonce = guard.randomNonce()
          validateMsg.ts = Date.now()
        }
        chrome.runtime.sendMessage(validateMsg, (response) => {
          if (settled) return
          settled = true
          clearTimeout(timer)

          if (chrome.runtime.lastError) {
            resolve({
              ok: false,
              status: 0,
              data: { reason: 'extension_error', message: 'The extension service stopped responding. Reload the extension and try again.' },
            })
            return
          }
          resolve(response || {
            ok: false,
            status: 0,
            data: { reason: 'empty_response', message: 'No response was received. Reload the extension and try again.' },
          })
        })
      })

      const data = result.data || {}
      if (result.ok && data.ok) return { ok: true, data }
      return {
        ok: false,
        reason: data.reason || 'denied',
        message: data.message || `Activation failed${result.status ? ` (server response ${result.status})` : ''}. Please try again.`,
      }
    } catch (_) {
      return {
        ok: false,
        reason: 'extension_error',
        message: 'The extension could not start verification. Reload the extension and try again.',
      }
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
      if (btn.disabled) return
      if (!/^qlk_[a-f0-9]{40}$/i.test(v)) {
        setMsg(msg, 'Invalid key format. Paste the complete key beginning with qlk_.', 'error')
        return
      }
      btn.disabled = true
      btn.style.cursor = 'wait'
      btn.style.opacity = '0.72'
      const originalLabel = btn.textContent
      btn.textContent = 'Verifying…'
      setMsg(msg, 'Checking your key with Qrinux…', 'info')

      try {
        const result = await validateKey(v)
        if (result.ok) {
          await setKey(v)
          const plan = (result.data && result.data.plan) || 'Free'
          const remaining = result.data && result.data.remaining
          setMsg(
            msg,
            `✓ Activation successful. ${plan} plan${remaining != null ? ` — ${remaining} scans remaining today` : ''}.`,
            'success'
          )
          btn.textContent = 'Activated successfully ✓'
          btn.style.cursor = 'default'
          btn.style.opacity = '1'
          setTimeout(() => location.reload(), 1400)
          return
        }
        setMsg(msg, `✕ ${result.message || 'Activation failed. Please try again.'}`, 'error')
      } catch (_) {
        setMsg(msg, '✕ An unexpected error occurred. Please try again.', 'error')
      } finally {
        btn.disabled = false
        if (btn.textContent !== 'Activated successfully ✓') {
          btn.textContent = originalLabel
          btn.style.cursor = 'pointer'
          btn.style.opacity = '1'
        }
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
