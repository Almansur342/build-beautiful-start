'use strict'
/* eslint-env browser */
/* globals chrome */

function inject(src, id, message) {
  return new Promise((resolve) => {
    // Inject a script tag into the page to access methods of the window object
    const script = document.createElement('script')

    let settled = false
    let timeoutId = null
    let onMessageRef = null

    const cleanup = () => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      if (onMessageRef) {
        try { window.removeEventListener('message', onMessageRef) } catch (e) { /* noop */ }
      }
      try { script.remove() } catch (e) { /* noop */ }
    }

    script.onload = () => {
      const onMessage = ({ data }) => {
        if (!data || !data.wappalyzer || !data.wappalyzer[id]) {
          return
        }

        cleanup()
        resolve(data.wappalyzer[id])
      }

      onMessageRef = onMessage
      window.addEventListener('message', onMessage)

      // Hard timeout — prevents content script from hanging forever
      // when the injected script never posts a matching message.
      timeoutId = setTimeout(() => {
        cleanup()
        resolve([])
      }, 5000)

      window.postMessage({
        wappalyzer: message,
      })
    }

    script.onerror = () => {
      cleanup()
      resolve([])
    }

    script.setAttribute('src', chrome.runtime.getURL(src))

    document.body.appendChild(script)
  })
}

function getJs(technologies) {
  return inject('js/js.js', 'js', {
    technologies: technologies
      .filter(({ js }) => Object.keys(js).length)
      .map(({ name, js }) => ({ name, chains: Object.keys(js) })),
  })
}

async function getDom(technologies) {
  const _technologies = technologies
    .filter(({ dom }) => dom && dom.constructor === Object)
    .map(({ name, dom }) => ({ name, dom }))

  return [
    ...(await inject('js/dom.js', 'dom', {
      technologies: _technologies.filter(({ dom }) =>
        Object.values(dom)
          .flat()
          .some(({ properties }) => properties)
      ),
    })),
    ..._technologies.reduce((technologies, { name, dom }) => {
      const toScalar = (value) =>
        typeof value === 'string' || typeof value === 'number' ? value : !!value

      Object.keys(dom).forEach((selector) => {
        let nodes = []

        try {
          nodes = document.querySelectorAll(selector)
        } catch (error) {
          Content.driver('error', error)
        }

        if (!nodes.length) {
          return
        }

        dom[selector].forEach(({ exists, text, properties, attributes }) => {
          nodes.forEach((node) => {
            if (
              technologies.filter(({ name: _name }) => _name === name).length >=
              50
            ) {
              return
            }

            if (
              exists &&
              technologies.findIndex(
                ({ name: _name, selector: _selector, exists }) =>
                  name === _name && selector === _selector && exists === ''
              ) === -1
            ) {
              technologies.push({
                name,
                selector,
                exists: '',
              })
            }

            if (text) {
              // eslint-disable-next-line unicorn/prefer-text-content
              const value = (node.innerText ? node.innerText.trim() : '').slice(
                0,
                1000000
              )

              if (
                value &&
                technologies.findIndex(
                  ({ name: _name, selector: _selector, text }) =>
                    name === _name && selector === _selector && text === value
                ) === -1
              ) {
                technologies.push({
                  name,
                  selector,
                  text: value,
                })
              }
            }

            if (properties) {
              Object.keys(properties).forEach((property) => {
                if (!Object.prototype.hasOwnProperty.call(node, property)) {
                  return
                }

                const value = node[property]
                const scalarValue = toScalar(value)

                if (typeof value === 'undefined') {
                  return
                }

                if (
                  technologies.findIndex(
                    ({
                      name: _name,
                      selector: _selector,
                      property: _property,
                      value: storedValue,
                    }) =>
                      name === _name &&
                      selector === _selector &&
                      property === _property &&
                      storedValue === scalarValue
                  ) !== -1
                ) {
                  return
                }

                technologies.push({
                  name,
                  selector,
                  property,
                  value: scalarValue,
                })
              })
            }

            if (attributes) {
              Object.keys(attributes).forEach((attribute) => {
                if (!node.hasAttribute(attribute)) {
                  return
                }

                const value = node.getAttribute(attribute)
                const scalarValue = toScalar(value)

                if (
                  technologies.findIndex(
                    ({
                      name: _name,
                      selector: _selector,
                      attribute: _atrribute,
                      value: storedValue,
                    }) =>
                      name === _name &&
                      selector === _selector &&
                      attribute === _atrribute &&
                      storedValue === scalarValue
                  ) !== -1
                ) {
                  return
                }

                technologies.push({
                  name,
                  selector,
                  attribute,
                  value: scalarValue,
                })
              })
            }
          })
        })
      })

      return technologies
    }, []),
  ]
}

const Content = {
  cache: {},
  language: '',
  relatedPageEvidence: [],
  relatedPageCache: new Map(),
  seoInfrastructureCache: {
    url: '',
    expiresAt: 0,
    value: null,
  },

  analyzedRequires: [],
  scanCompleteSent: false,

  // Phase 2 security: explicit allowlist for chrome.runtime message dispatch.
  // Any function not listed here cannot be invoked via extension messaging,
  // even if it exists on the Content object.
  ALLOWED_MESSAGE_METHODS: new Set([
    'ping',
    'startLeadLensScan',
    'analyzeRequires',
    'onGetTechnologies',
    'extractContacts',
    'extractEmails',
  ]),



  /**
   * Initialise content script without collecting page data.
   * A scan only starts after the user clicks the floating button or a
   * user-started bulk scan sends an explicit start command.
   */
  async init() {
    if (Content.initialized) {
      return
    }

    Content.initialized = true

    const url = location.href

    if (!/^https?:\/\//i.test(url)) {
      return
    }

    // Render first so users can see why a known platform or excluded domain is
    // not being scanned. Previously disabled domains silently had no control,
    // which looked like a broken content script after long bulk sessions.
    await Content.renderScanButton()
    const disabled = await Content.driver('isDisabledDomain', url)

    if (disabled === true || disabled?.disabled === true) {
      Content.updateScanButton('Research only', true)
      if (Content.scanButton) {
        Content.scanButton.title = 'Known platform, enterprise, or excluded domain. LeadLens keeps this page out of normal redesign outreach scans.'
      }
      return { ok: false, status: 'disabled-domain' }
    }
  },

  storageGet(key, fallback) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (items = {}) => {
          resolve(Object.prototype.hasOwnProperty.call(items, key) ? items[key] : fallback)
        })
      } catch (e) {
        resolve(fallback)
      }
    })
  },

  storageSet(key, value) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, resolve)
      } catch (e) {
        resolve()
      }
    })
  },

  async renderScanButton() {
    if (window.top !== window || document.getElementById('qrinux-leadlens-scan-control')) {
      return
    }

    const host = document.createElement('div')
    host.id = 'qrinux-leadlens-scan-control'
    host.style.position = 'fixed'
    host.style.zIndex = '2147483647'
    host.style.width = 'auto'
    host.style.height = 'auto'

    const shadow = host.attachShadow({ mode: 'closed' })
    const style = document.createElement('style')

    style.textContent = `
      :host { all: initial; }
      .leadlens-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: Arial, sans-serif;
      }
      button {
        border: 0;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
        transition: transform .15s ease, opacity .15s ease;
      }
      button:hover { transform: translateY(-1px); }
      button:disabled { cursor: default; opacity: .72; transform: none; }
      .leadlens-scan {
        min-width: 82px;
        padding: 7px 12px 7px 8px;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .01em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }
      .leadlens-logo {
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: #fff;
        display: block;
        flex: 0 0 auto;
      }
      .leadlens-label {
        line-height: 1;
        white-space: nowrap;
      }
      .leadlens-position {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        background: #fff;
        color: #111827;
        font-size: 14px;
        font-weight: 700;
        border: 1px solid rgba(15, 23, 42, 0.12);
      }
    `

    const wrap = document.createElement('div')
    wrap.className = 'leadlens-wrap'

    const scan = document.createElement('button')
    scan.className = 'leadlens-scan'
    scan.type = 'button'
    scan.title = 'Start LeadLens scan for this website'

    const scanLogo = document.createElement('img')
    scanLogo.className = 'leadlens-logo'
    scanLogo.alt = ''
    scanLogo.src = chrome.runtime.getURL('images/icon_32.png')

    const scanLabel = document.createElement('span')
    scanLabel.className = 'leadlens-label'
    scanLabel.textContent = 'Scan'

    scan.append(scanLogo, scanLabel)

    const position = document.createElement('button')
    position.className = 'leadlens-position'
    position.type = 'button'
    position.textContent = '↕'
    position.title = 'Move LeadLens scan button'

    scan.addEventListener('click', () => Content.startLeadLensScan('button'))
    position.addEventListener('click', () => Content.cycleScanButtonPosition(host))

    wrap.append(scan, position)
    shadow.append(style, wrap)

    document.documentElement.appendChild(host)
    Content.scanButtonHost = host
    Content.scanButton = scan
    Content.scanButtonLabel = scanLabel

    Content.applyScanButtonPosition(
      host,
      await Content.storageGet('leadLensScanButtonPosition', 'bottom-right')
    )
  },

  applyScanButtonPosition(host, position = 'bottom-right') {
    const safePosition = ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(position)
      ? position
      : 'bottom-right'

    host.dataset.position = safePosition
    host.style.top = 'auto'
    host.style.right = 'auto'
    host.style.bottom = 'auto'
    host.style.left = 'auto'

    if (safePosition.includes('top')) host.style.top = '18px'
    if (safePosition.includes('bottom')) host.style.bottom = '18px'
    if (safePosition.includes('right')) host.style.right = '18px'
    if (safePosition.includes('left')) host.style.left = '18px'
  },

  async cycleScanButtonPosition(host) {
    const positions = ['bottom-right', 'bottom-left', 'top-left', 'top-right']
    const current = host.dataset.position || 'bottom-right'
    const next = positions[(positions.indexOf(current) + 1) % positions.length]

    Content.applyScanButtonPosition(host, next)
    await Content.storageSet('leadLensScanButtonPosition', next)
  },

  updateScanButton(text, disabled = false) {
    if (!Content.scanButton) return

    if (Content.scanButtonLabel) {
      Content.scanButtonLabel.textContent = text
    }
    Content.scanButton.disabled = disabled
  },

  ping() {
    return { ok: true, ready: true, url: location.href }
  },

  async startLeadLensScan(source = 'manual') {
    if (Content.scanRunning) {
      return { ok: false, status: 'already-running' }
    }

    Content.scanRunning = true
    Content.updateScanButton('Checking…', true)
    let scanStarted = false

    try {
      const allowed = await Content.driver('canStartPageScan', [location.href])

      if (!allowed?.ok) {
        const message = allowed?.message || allowed?.status || 'Scan blocked'
        Content.updateScanButton(
          allowed?.status === 'storage-critical' ? 'Storage full' : 'Scan blocked',
          false
        )
        setTimeout(() => Content.updateScanButton('Scan', false), 5000)
        return { ok: false, status: allowed?.status || 'blocked', error: message }
      }

      Content.updateScanButton('Scanning…', true)
      await Content.driver('beginPageScan', [location.href, source])
      scanStarted = true
      const result = await Content.scan()

      if (!result?.ok) {
        throw new Error(result?.error || result?.status || 'Scan failed')
      }

      Content.updateScanButton('Scanned ✓', false)
      setTimeout(() => Content.updateScanButton('Scan', false), 4000)
      return { ok: true }
    } catch (error) {
      Content.driver('error', error)
      Content.updateScanButton('Retry scan', false)
      return { ok: false, error: String(error?.message || error) }
    } finally {
      if (scanStarted) {
        await Content.driver('endPageScan', [location.href])
      }
      Content.scanRunning = false
    }
  },

  consentCandidateRoots() {
    const roots = [document]
    const addRoot = (root) => {
      if (!root || roots.includes(root) || roots.length >= 60) return
      roots.push(root)
      try {
        Array.from(root.querySelectorAll('*')).slice(0, 3500).forEach((element) => {
          if (element.shadowRoot && roots.length < 60 && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot)
        })
      } catch (error) { /* Cross-origin/inaccessible root. */ }
    }
    addRoot(document)
    try {
      document.querySelectorAll('iframe').forEach((frame) => {
        try { addRoot(frame.contentDocument) } catch (error) { /* Cross-origin iframe. */ }
      })
    } catch (error) { /* No iframe access. */ }
    return roots
  },

  async tryAcceptCookieConsent() {
    const enabled = await Content.storageGet('leadLensAutoAcceptCookieConsent', true)
    if (!enabled) return { enabled: false, clicked: false, reason: 'disabled' }

    // Phase 2 safety: never auto-click on sensitive flows. Clicking a banner on a
    // login / checkout / payment / admin page can flip account-level tracking
    // toggles or dismiss a real user prompt. Skip on any sensitive path.
    const SENSITIVE_PATH_RE = /(^|\/)(login|signin|sign-in|signup|sign-up|register|logout|account|dashboard|billing|checkout|cart|admin|settings|profile|payment|payments|pay|bank|banking|wallet|onboarding|kyc|verify|two[-_]?factor|2fa|mfa|reset-password|password|wp-admin|wp-login)(\/|$|\?|#)/i
    try {
      if (SENSITIVE_PATH_RE.test(location.pathname)) {
        return { enabled: true, clicked: false, verified: false, reason: 'sensitive-path' }
      }
    } catch (_) { /* fall through */ }


    const explicitSelectors = [
      '#onetrust-accept-btn-handler',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '#usercentrics-root button[data-testid="uc-accept-all-button"]',
      '[data-testid="uc-accept-all-button"]',
      '#didomi-notice-agree-button',
      '.didomi-continue-without-agreeing + button',
      '#truste-consent-button',
      '.qc-cmp2-summary-buttons button[mode="primary"]',
      '[class*="qc-cmp2"] button[mode="primary"]',
      '#cookie_action_close_header',
      '.cky-btn-accept',
      '#iubenda-cs-banner .iubenda-cs-accept-btn',
      '.osano-cm-accept-all',
      '.cmplz-accept',
      '[data-role="all"]',
      '[data-testid="cookie-policy-dialog-accept-button"]',
      '[data-testid*="accept-all" i]',
      '[data-action*="accept" i]',
      '[id*="accept-all" i]',
      '[class*="accept-all" i]',
      '[aria-label*="accept all" i]',
      '[title*="accept all" i]',
    ]
    const acceptPattern = /^(?:ok(?:ay)?|got\s*it|continue|yes(?:,? .*)?|allow(?: all)?(?: cookies?)?|enable(?: cookies| all)?|accept(?: all| everything| cookies?)?(?:\s+(?:cookies?|and continue))?|accept and (?:continue|close)|i accept|i agree|agree(?: all)?(?:\s+and\s+continue)?|consent|i understand|understood|approve|opt[\s\-]?in|that'?s ?ok|accepter tout|tout accepter|j'accepte|accepter|alle akzeptieren|akzeptieren|zustimmen|aceptar todo|aceptar todas|aceptar|accetta tutti|accetta tutto|accetta|aceitar todos|aceitar tudo|aceitar|alles accepteren|accepteer alles|akkoord|godk[aä]nn alla|till[aå]t alla|hyv[aä]ksy kaikki|hyv[aä]ksy|akceptuj wszystko|akceptuj[eę]|zgadzam si[eę]|p[řr]ijmout v[šs]e|souhlas[ií]m|prijať všetko|prihvati sve|sprejmi vse|accepter alle|godta alle|accepter alle|accepter alt|accept[ăa] tot|приемам всички|принять все|прийняти всі|t[üu]m[üu]n[üu] kabul et|hepsini kabul et|όλα αποδοχή|αποδοχή όλων|elfogadom mindet|terima semua|setuju semua|ยอมรับทั้งหมด|chấp nhận tất cả|সব গ্রহণ করুন|সব কুকি গ্রহণ|सभी स्वीकार करें|सब स्वीकार करें|سب قبول کریں|تمام کو قبول کریں|כל הקבצים|אישור|모두 동의|동의|허용|同意全部|接受全部|すべて受け入れる|同意する|أوافق على الكل|قبول الكل)$/i
    const rejectPattern = /reject|decline|deny|refuse|manage|preference|setting|necessary only|essential only|customi[sz]e|learn more|details|read more|opt[\s\-]?out|withdraw|disagree|no thanks|ablehnen|rechazar|rifiuta|recusar|weiger|رفض|拒否|거부/i
    const contextPattern = /cookie|consent|gdpr|privacy|cmp|tracking|datenschutz|cookies?|privacidad|confidentialit[ée]|consenso|соглас|куки|çerez|คุกกี้|কুকি|कुकी/i
    const candidates = new Map()

    const visible = (element) => {
      if (!element || element.disabled || !element.isConnected) return false
      const win = element.ownerDocument?.defaultView || window
      const style = win.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 1 && rect.height > 1
    }
    const label = (element) => String(element.innerText || element.value || element.getAttribute('aria-label') || element.getAttribute('title') || '').replace(/\s+/g, ' ').trim()
    const bannerFor = (element) => element.closest?.('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], [id*="privacy" i], [class*="privacy" i], [aria-label*="cookie" i], [data-testid*="cookie" i], [role="dialog"], [role="alertdialog"]')
    const add = (element, explicit = false) => {
      if (!visible(element)) return
      const value = label(element)
      if (!value || value.length > 100 || rejectPattern.test(value)) return
      const contextNode = bannerFor(element)
      const context = `${contextNode?.id || ''} ${contextNode?.className || ''} ${contextNode?.textContent || ''}`.slice(0, 1000)
      const clearAccept = acceptPattern.test(value)
      const hasContext = contextPattern.test(context)
      if (!explicit && !(clearAccept && hasContext)) return
      const score = (explicit ? 14 : 0) + (clearAccept ? 10 : 0) + (hasContext ? 7 : 0) + (/all|tout|alle|todo|tutti|সব|सभी|全部|모두|الكل/i.test(value) ? 3 : 0)
      if (score < 14) return
      candidates.set(element, { element, banner: contextNode, score, text: value })
    }

    for (const root of Content.consentCandidateRoots()) {
      for (const selector of explicitSelectors) {
        try { root.querySelectorAll(selector).forEach((element) => add(element, true)) } catch (error) { /* Ignore unsupported selector/root. */ }
      }
      try { root.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"], [role="button"]').forEach((element) => add(element, false)) } catch (error) { /* Continue. */ }
    }

    const best = [...candidates.values()].sort((a, b) => b.score - a.score)[0]
    if (!best) return { enabled: true, clicked: false, verified: false, reason: 'not-found' }
    try {
      const banner = best.banner
      best.element.click()
      await new Promise((resolve) => setTimeout(resolve, 450))
      const hidden = !best.element.isConnected || !visible(best.element) || (banner && (!banner.isConnected || !visible(banner)))
      return { enabled: true, clicked: true, verified: Boolean(hidden), label: best.text || 'accept cookies', reason: hidden ? 'banner-dismissed' : 'clicked-unverified' }
    } catch (error) {
      return { enabled: true, clicked: false, verified: false, reason: 'click-failed' }
    }
  },

  async warmUpPageBeforeScan() {
    const enabled = await Content.storageGet('leadLensPreScanWarmup', true)
    if (!enabled) return { ok: true, skipped: 'disabled' }

    try {
      const doc = document.documentElement
      const body = document.body
      const maxScroll = Math.max(0, (doc?.scrollHeight || 0), (body?.scrollHeight || 0)) - window.innerHeight
      if (!Number.isFinite(maxScroll) || maxScroll < 220) return { ok: true, skipped: 'short-page' }

      const originalX = window.scrollX || 0
      const originalY = window.scrollY || 0
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const steps = [0.18, 0.42, 0.68, 0.9, Math.min(0.35, originalY / Math.max(1, maxScroll))]

      for (const ratio of steps) {
        window.scrollTo({ top: Math.max(0, Math.min(maxScroll, Math.round(maxScroll * ratio))), left: originalX, behavior: 'auto' })
        window.dispatchEvent(new Event('scroll'))
        await wait(220)
      }

      window.scrollTo({ top: originalY, left: originalX, behavior: 'auto' })
      window.dispatchEvent(new Event('scroll'))
      await wait(350)
      return { ok: true, warmed: true }
    } catch (error) {
      return { ok: false, error: String(error?.message || error) }
    }
  },

  /**
   * Detect bot-challenge / interstitial pages (Cloudflare, Akamai,
   * PerimeterX, DataDome, AWS WAF, Imperva) so the caller can skip
   * gracefully instead of scraping the challenge HTML.
   */
  detectChallengePage() {
    try {
      const title = String(document.title || '').toLowerCase()
      const bodyText = String(document.body?.innerText || '').slice(0, 2000).toLowerCase()
      const html = String(document.documentElement?.outerHTML || '').slice(0, 4000).toLowerCase()
      const signals = [
        /just a moment/, /checking your browser/, /attention required/,
        /cf-challenge/, /cf-browser-verification/, /cf-error/,
        /access denied/, /pardon our interruption/, /are you a human/,
        /please enable cookies/, /please enable javascript/,
        /press & hold to confirm/, /verify you are human/,
        /akamai|perimeterx|datadome|imperva|incapsula|reblaze/,
        /403 forbidden/, /blocked by/, /security check/,
      ]
      const haystack = `${title}\n${bodyText}\n${html}`
      const hit = signals.find((rx) => rx.test(haystack))
      if (!hit) return { challenge: false }
      // Avoid false positives on legitimate "just a moment" headings on real sites.
      const elCount = document.body?.querySelectorAll('*').length || 0
      const textLen = (document.body?.innerText || '').trim().length
      if (elCount > 220 && textLen > 1200) return { challenge: false }
      return { challenge: true, vendor: String(hit).replace(/[\/\\^$]/g, '') }
    } catch (e) {
      return { challenge: false }
    }
  },

  /**
   * Wait for SPA / lazy-rendered DOM to populate before scanning.
   * Uses MutationObserver + poll + a one-shot scroll nudge to trigger
   * lazy renderers (IntersectionObserver, React Suspense, etc.).
   * Returns once body has meaningful text/elements or maxWaitMs elapses.
   */
  async waitForDomReady(maxWaitMs = 15000) {
    const isReady = () => {
      if (!document.body) return false
      const textLen = (document.body.innerText || '').trim().length
      const elCount = document.body.querySelectorAll('*').length
      return textLen >= 120 || elCount >= 60
    }
    if (isReady()) return { ok: true, waited: 0, reason: 'immediate' }
    const start = Date.now()
    // One-shot scroll nudge to wake lazy renderers (Vue/Nuxt/Next hydration,
    // IntersectionObserver-driven content). Skipped for very short pages.
    let nudgeTimer = null
    const nudge = () => {
      try {
        const y = window.scrollY || 0
        window.scrollTo({ top: Math.max(80, y + 200), behavior: 'auto' })
        window.dispatchEvent(new Event('scroll'))
        setTimeout(() => {
          window.scrollTo({ top: y, behavior: 'auto' })
          window.dispatchEvent(new Event('scroll'))
        }, 250)
      } catch (e) { /* ignore */ }
    }
    return new Promise((resolve) => {
      let done = false
      const finish = (reason) => {
        if (done) return
        done = true
        try { observer.disconnect() } catch (e) { /* ignore */ }
        clearInterval(poll)
        clearTimeout(timeout)
        clearTimeout(nudgeTimer)
        resolve({ ok: true, waited: Date.now() - start, reason })
      }
      const observer = new MutationObserver(() => { if (isReady()) finish('mutation') })
      try {
        observer.observe(document.documentElement || document, { childList: true, subtree: true, characterData: true })
      } catch (e) { /* ignore */ }
      const poll = setInterval(() => { if (isReady()) finish('poll') }, 400)
      const timeout = setTimeout(() => finish('timeout'), maxWaitMs)
      // Nudge after 1.2s if still not ready — gives initial render a chance first.
      nudgeTimer = setTimeout(() => { if (!done) nudge() }, 1200)
    })
  },

  /**
   * Run a user-requested page scan.
   */
  async scan() {
    const url = location.href
    Content.scanCompleteSent = false

    if (await Content.driver('isDisabledDomain', url)) {
      return { ok: false, status: 'disabled-domain' }
    }

    // Wait for SPA / lazy DOM to settle before reading anything.
    await Content.waitForDomReady(15000)

    // Bot-challenge detection: bail early so we don't scrape the challenge page.
    const challenge = Content.detectChallengePage()

    const cookieConsent = await Content.tryAcceptCookieConsent()
    if (cookieConsent.clicked) {
      // After dismissing the wall the page often re-renders heavily —
      // give the DOM a real chance to settle instead of a fixed 900ms.
      await new Promise((resolve) => setTimeout(resolve, 400))
      await Content.waitForDomReady(6000)
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (Content.scanButtonLabel) Content.scanButtonLabel.textContent = 'Preparing…'
    await Content.warmUpPageBeforeScan()
    if (Content.scanButtonLabel) Content.scanButtonLabel.textContent = 'Scanning…'

    try {
      // HTML
      let html = new XMLSerializer().serializeToString(document)

      // Discard the middle portion of HTML to avoid performance degradation on large pages
      const chunks = []
      const maxCols = 2000
      const maxRows = 3000
      const rows = html.length / maxCols

      for (let i = 0; i < rows; i += 1) {
        if (i < maxRows / 2 || i > rows - maxRows / 2) {
          chunks.push(html.slice(i * maxCols, (i + 1) * maxCols))
        }
      }

      html = chunks.join('\n')

      // Determine language based on the HTML lang attribute or content
      Content.language =
        document.documentElement.getAttribute('lang') ||
        document.documentElement.getAttribute('xml:lang') ||
        (await new Promise((resolve) =>
          chrome.i18n.detectLanguage
            ? chrome.i18n.detectLanguage(html, ({ languages }) =>
                resolve(
                  languages
                    .filter(({ percentage }) => percentage >= 75)
                    .map(({ language: lang }) => lang)[0]
                )
              )
            : resolve()
        ))

      const cookies = document.cookie.split('; ').reduce(
        (cookies, cookie) => ({
          ...cookies,
          [cookie.split('=').shift()]: [cookie.split('=').pop()],
        }),
        {}
      )

      // Text
      // eslint-disable-next-line unicorn/prefer-text-content
      const text = document.body.innerText.replace(/\s+/g, ' ').slice(0, 25000)

      // CSS rules
      let css = []

      try {
        for (const sheet of Array.from(document.styleSheets)) {
          for (const rules of Array.from(sheet.cssRules)) {
            css.push(rules.cssText)

            if (css.length >= 3000) {
              break
            }
          }
        }
      } catch (error) {
        // Continue
      }

      css = css.join('\n')

      // Script tags
      const scriptNodes = Array.from(document.scripts)

      const scriptSrc = scriptNodes
        .filter(({ src }) => src && !src.startsWith('data:text/javascript;'))
        .map(({ src }) => src)
        .slice(0, 600)

      const scripts = scriptNodes
        .map((node) => node.textContent)
        .filter((script) => script)
        .slice(0, 260)
        .map((script) => String(script).slice(0, 140000))

      // Meta tags
      const meta = Array.from(document.querySelectorAll('meta')).reduce(
        (metas, meta) => {
          const key = meta.getAttribute('name') || meta.getAttribute('property')

          if (key) {
            metas[key.toLowerCase()] = metas[key.toLowerCase()] || []

            metas[key.toLowerCase()].push(meta.getAttribute('content'))
          }

          return metas
        },
        {}
      )

      // Detect Google Ads
      if (/^(www\.)?google(\.[a-z]{2,3}){1,2}$/.test(location.hostname)) {
        const ads = document.querySelectorAll(
          '#tads [data-text-ad] a[data-pcu]'
        )

        for (const ad of ads) {
          Content.driver('detectTechnology', [ad.href, 'Google Ads'])
        }
      }

      // Detect Microsoft Ads
      if (/^(www\.)?bing\.com$/.test(location.hostname)) {
        const ads = document.querySelectorAll('.b_ad .b_adurl cite')

        for (const ad of ads) {
          const url = ad.textContent.split(' ')[0].trim()

          Content.driver('detectTechnology', [
            url.startsWith('http') ? url : `http://${url}`,
            'Microsoft Advertising',
          ])
        }
      }

      // Detect Facebook Ads
      if (/^(www\.)?facebook\.com$/.test(location.hostname)) {
        const ads = document.querySelectorAll('a[aria-label="Advertiser"]')

        for (const ad of ads) {
          const urls = [
            ...new Set([
              `https://${decodeURIComponent(
                ad.href.split(/^.+\?u=https%3A%2F%2F/).pop()
              )
                .split('/')
                .shift()}`,

              // eslint-disable-next-line unicorn/prefer-text-content
              `https://${ad.innerText.split('\n').pop()}`,
            ]),
          ]

          urls.forEach((url) =>
            Content.driver('detectTechnology', [url, 'Facebook Ads'])
          )
        }
      }

      Content.cache = { html, text, css, scriptSrc, scripts, meta, cookies, cookieConsent, challenge }

      await Content.driver('onContentLoad', [
        url,
        Content.cache,
        Content.language,
      ])

      const technologies = await Content.driver('getTechnologies')

      await Content.onGetTechnologies(technologies)

      // Extract contacts immediately while the DOM is ready.
      try {
        await Content.extractContacts(url)
      } catch (e) {
        // Continue
      }

      try {
        await Content.auditSeo(url)
      } catch (e) {
        // Continue
      }

      // Delayed second pass to capture async JS (SPA / Vue / Nuxt need more time)
      await new Promise((resolve) => setTimeout(resolve, 8000))
      const delayedCookieConsent = await Content.tryAcceptCookieConsent()
      if (delayedCookieConsent.clicked) await new Promise((resolve) => setTimeout(resolve, 1200))

      const js = await getJs(technologies)

      await Content.driver('analyzeJs', [url, js])

      // Run extraction again to catch contacts injected by JavaScript.
      try {
        await Content.extractContacts(url)
      } catch (e) {
        // Continue
      }

      try {
        await Content.auditSeo(url)
      } catch (e) {
        // Continue
      }

      Content.reportScanComplete(url)
      // Fire-and-forget RDAP lookup so domain age is captured at scan time.
      try {
        const hostname = new URL(url).hostname
        Content.driver('lookupDomainAge', [hostname, url, 'ok']).catch(() => {})
      } catch (e) { /* Ignore. */ }
      return { ok: true }
    } catch (error) {
      Content.driver('error', error)
      Content.reportScanComplete(url, error)
      return { ok: false, error: String(error?.message || error) }
    }
  },

  reportScanComplete(url, error) {
    if (Content.scanCompleteSent) return

    Content.scanCompleteSent = true

    try {
      const hostname = new URL(url).hostname

      chrome.runtime.sendMessage({
        type: 'leadLensScanComplete',
        url,
        hostname,
        ok: !error,
        error: error ? String(error.message || error) : '',
        at: new Date().toISOString(),
      })
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Run a local on-page SEO health audit.
   * @param {String} url
   */
  async auditSeo(url) {
    const title = (document.title || '').trim()
    // Description fallback chain: meta[name="description"] → og:description → twitter:description.
    // Some sites use property="description" or mix attributes; check all combinations.
    const readMetaAny = (key) => {
      const lower = String(key || '').toLowerCase()
      const nodes = Array.from(document.querySelectorAll('meta'))
      for (const node of nodes) {
        const prop = (
          node.getAttribute('name') ||
          node.getAttribute('property') ||
          node.getAttribute('itemprop') ||
          ''
        ).toLowerCase()
        if (prop === lower) {
          const value = (node.getAttribute('content') || node.getAttribute('value') || '').trim()
          if (value) return value
        }
      }
      return ''
    }
    const description =
      document.querySelector('meta[name="description" i]')?.content?.trim() ||
      readMetaAny('description') ||
      readMetaAny('og:description') ||
      readMetaAny('twitter:description') ||
      ''
    const viewport =
      document.querySelector('meta[name="viewport" i]')?.content?.trim() || ''
    const lang =
      document.documentElement.getAttribute('lang') ||
      document.documentElement.getAttribute('xml:lang') ||
      ''
    const h1s = Array.from(document.querySelectorAll('h1'))
      .map((node) => (node.textContent || '').trim())
      .filter(Boolean)
    const headings = Array.from(
      document.querySelectorAll('h1,h2,h3,h4,h5,h6')
    ).map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: (node.textContent || '').trim(),
    }))
    const canonical =
      document.querySelector('link[rel~="canonical" i]')?.href || ''
    const robots =
      document.querySelector('meta[name="robots" i]')?.content?.toLowerCase() ||
      ''
    const favicon = !!document.querySelector(
      'link[rel~="icon" i], link[rel="shortcut icon" i], link[rel="apple-touch-icon" i]'
    )
    const images = Array.from(document.images).filter(
      (image) => !image.closest('svg')
    )
    const imagesWithAlt = images.filter((image) =>
      (image.getAttribute('alt') || '').trim()
    )
    const brokenImages = images.filter(
      (image) => image.complete && image.naturalWidth === 0
    ).length
    const lazyImages = images.filter(
      (image) => image.loading === 'lazy' || image.getAttribute('loading') === 'lazy'
    )
    const duplicateAltCount =
      imagesWithAlt.length -
      new Set(imagesWithAlt.map((image) => image.getAttribute('alt').trim()))
        .size
    const jsonLdScripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json" i]')
    )
    const schemaTypes = new Set()
    const compactScalar = (value, max = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
    const addUnique = (target, value, max = 40) => {
      const clean = compactScalar(value)
      if (clean && !target.includes(clean) && target.length < max) target.push(clean)
    }
    const businessIdentity = {
      names: [], legalNames: [], alternateNames: [], descriptions: [], entityTypes: [], urls: [], sameAs: [],
      emails: [], phones: [], addresses: [], geo: [], openingHours: [], priceRanges: [], currenciesAccepted: [],
      paymentAccepted: [], areaServed: [], founders: [], employees: [], brands: [],
    }

    const collectSchema = (value) => {
      if (!value) return
      if (Array.isArray(value)) return value.forEach(collectSchema)
      if (typeof value !== 'object') return
      const typeValue = value['@type']
      const types = Array.isArray(typeValue) ? typeValue : typeValue ? [typeValue] : []
      types.forEach((item) => schemaTypes.add(item))
      const isBusinessEntity = types.some((item) => /(?:Organization|Corporation|LocalBusiness|ProfessionalService|Store|Restaurant|Hotel|LodgingBusiness|Medical|Dental|Dentist|LegalService|FinancialService|RealEstateAgent|AutomotiveBusiness|FoodEstablishment|HealthAndBeautyBusiness|HomeAndConstructionBusiness|SportsActivityLocation|TravelAgency|EducationalOrganization)/i.test(String(item)))
      if (isBusinessEntity) {
        types.forEach((item) => addUnique(businessIdentity.entityTypes, item))
        addUnique(businessIdentity.names, value.name)
        addUnique(businessIdentity.legalNames, value.legalName)
        addUnique(businessIdentity.alternateNames, value.alternateName)
        addUnique(businessIdentity.descriptions, value.description, 12)
        addUnique(businessIdentity.urls, value.url)
        ;(Array.isArray(value.sameAs) ? value.sameAs : value.sameAs ? [value.sameAs] : []).forEach((item) => addUnique(businessIdentity.sameAs, item))
        addUnique(businessIdentity.emails, value.email)
        addUnique(businessIdentity.phones, value.telephone || value.phone)
        addUnique(businessIdentity.priceRanges, value.priceRange)
        ;(Array.isArray(value.currenciesAccepted) ? value.currenciesAccepted : value.currenciesAccepted ? [value.currenciesAccepted] : []).forEach((item) => addUnique(businessIdentity.currenciesAccepted, item))
        ;(Array.isArray(value.paymentAccepted) ? value.paymentAccepted : value.paymentAccepted ? [value.paymentAccepted] : []).forEach((item) => addUnique(businessIdentity.paymentAccepted, item))
        ;(Array.isArray(value.openingHours) ? value.openingHours : value.openingHours ? [value.openingHours] : []).forEach((item) => addUnique(businessIdentity.openingHours, typeof item === 'object' ? JSON.stringify(item) : item))
      }
      const addressValues = Array.isArray(value.address) ? value.address : value.address ? [value.address] : []
      addressValues.forEach((address) => {
        const normalized = typeof address === 'string' ? { text: compactScalar(address) } : {
          streetAddress: compactScalar(address?.streetAddress),
          addressLocality: compactScalar(address?.addressLocality),
          addressRegion: compactScalar(address?.addressRegion),
          postalCode: compactScalar(address?.postalCode),
          addressCountry: compactScalar(typeof address?.addressCountry === 'object' ? (address.addressCountry.name || address.addressCountry['@id']) : address?.addressCountry),
        }
        if (Object.values(normalized).some(Boolean) && businessIdentity.addresses.length < 20) businessIdentity.addresses.push(normalized)
      })
      if (value.geo && typeof value.geo === 'object') {
        const geo = { latitude: value.geo.latitude ?? '', longitude: value.geo.longitude ?? '' }
        if ((geo.latitude !== '' || geo.longitude !== '') && businessIdentity.geo.length < 10) businessIdentity.geo.push(geo)
      }
      const people = (input, target) => {
        ;(Array.isArray(input) ? input : input ? [input] : []).forEach((person) => addUnique(target, typeof person === 'object' ? (person.name || person.url) : person, 30))
      }
      people(value.founder || value.founders, businessIdentity.founders)
      people(value.employee || value.employees, businessIdentity.employees)
      people(value.brand, businessIdentity.brands)
      const areas = Array.isArray(value.areaServed) ? value.areaServed : value.areaServed ? [value.areaServed] : []
      areas.forEach((area) => addUnique(businessIdentity.areaServed, typeof area === 'object' ? (area.name || area.addressCountry || area['@id']) : area))
      Object.values(value).forEach(collectSchema)
    }

    jsonLdScripts.forEach((script) => {
      try {
        const parsed = JSON.parse(script.textContent || '{}')
        collectSchema(parsed)
      } catch (error) {
        // Continue
      }
    })

    // Some sites use `name=` for og:* or `property=` for twitter:*; check both.
    const metaContentAny = (key) => {
      const lower = String(key || '').toLowerCase()
      const nodes = Array.from(document.querySelectorAll('meta'))
      for (const node of nodes) {
        const prop = (node.getAttribute('property') || node.getAttribute('name') || node.getAttribute('itemprop') || '').toLowerCase()
        if (prop === lower) {
          const value = (node.getAttribute('content') || node.getAttribute('value') || '').trim()
          if (value) return value
        }
      }
      return ''
    }
    const og = {
      title: metaContentAny('og:title'),
      description: metaContentAny('og:description'),
      image: metaContentAny('og:image'),
    }
    const twitter = {
      card: metaContentAny('twitter:card'),
      title: metaContentAny('twitter:title'),
      description: metaContentAny('twitter:description'),
      image: metaContentAny('twitter:image'),
    }
    const ogCount = Object.values(og).filter(Boolean).length
    const twitterCount = Object.values(twitter).filter(Boolean).length
    const anchorNodes = Array.from(document.querySelectorAll('a[href]'))
    const emptyLinks = anchorNodes.filter((anchor) =>
      /^(#|javascript:|)$/i.test((anchor.getAttribute('href') || '').trim())
    ).length
    const links = anchorNodes
      .map((anchor) => {
        try {
          return {
            anchor,
            url: new URL(anchor.getAttribute('href'), location.href),
          }
        } catch (error) {
          return null
        }
      })
      .filter((item) => item && /^https?:$/.test(item.url.protocol))
    const internalLinks = links.filter(
      ({ url }) => url.hostname === location.hostname
    ).length
    const externalLinks = links.length - internalLinks
    const mailtoLinks = anchorNodes.filter((anchor) =>
      /^mailto:/i.test((anchor.getAttribute('href') || '').trim())
    ).length
    const phoneLinks = anchorNodes.filter((anchor) =>
      /^tel:/i.test((anchor.getAttribute('href') || '').trim())
    ).length
    const socialProfileLinks = anchorNodes.filter((anchor) =>
      /(?:facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|pinterest\.|telegram\.me|t\.me|wa\.me|api\.whatsapp\.com)/i.test((anchor.getAttribute('href') || '').trim())
    ).length
    const unsafeExternalLinks = links.filter(
      ({ anchor, url }) =>
        url.hostname !== location.hostname &&
        anchor.target === '_blank' &&
        !/\bnoopener\b/i.test(anchor.rel || '')
    ).length
    const insecureForms = Array.from(document.forms).filter((form) => {
      try {
        return (
          form.action &&
          new URL(form.action, location.href).protocol === 'http:' &&
          location.protocol === 'https:'
        )
      } catch (error) {
        return false
      }
    }).length
    const wordCount = document.body
      ? (document.body.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      : 0
    const resources = performance.getEntriesByType
      ? performance.getEntriesByType('resource')
      : []
    const mixedContentResources = resources.filter((resource) => {
      try {
        return (
          location.protocol === 'https:' &&
          new URL(resource.name).protocol === 'http:'
        )
      } catch (error) {
        return false
      }
    }).length
    const navigation = performance.getEntriesByType
      ? performance.getEntriesByType('navigation')[0]
      : null
    const loadTime = navigation
      ? Math.round(navigation.loadEventEnd || navigation.duration || 0)
      : 0
    const domReadyTime = navigation
      ? Math.round(navigation.domContentLoadedEventEnd || 0)
      : 0
    const scriptCount = document.scripts.length
    const stylesheetCount = document.querySelectorAll(
      'link[rel~="stylesheet" i], style'
    ).length
    const tableLayoutCount = document.querySelectorAll(
      'table[width], table[align], table[cellpadding], table[cellspacing]'
    ).length
    const deprecatedNodeCount = document.querySelectorAll(
      'font, center, marquee, blink, frame, frameset'
    ).length
    const generator =
      document.querySelector('meta[name="generator" i]')?.content?.trim() || ''
    const inlineStyleCount = document.querySelectorAll('[style]').length
    const formControls = Array.from(
      document.querySelectorAll('input, select, textarea')
    )
    const unlabeledControls = formControls.filter((control) => {
      if (control.type === 'hidden') return false
      if (control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) {
        return false
      }

      return !control.closest('label') && !control.getAttribute('aria-label')
    }).length
    const ctaCount = Array.from(
      document.querySelectorAll('a, button, input[type="submit"]')
    ).filter((node) =>
      /\b(book|call|contact|get quote|quote|buy|order|reserve|schedule|demo|signup|sign up|start|start a project|request|enquire|inquire|donate|apply|learn more|discover|talk to|work with us|partner|visit|view projects?)\b/i.test(
        `${node.textContent || ''} ${node.value || ''} ${node.getAttribute('aria-label') || ''}`
      )
    ).length
    const navigationCount = document.querySelectorAll(
      'nav, [role="navigation"], header nav'
    ).length
    const footerPresent = !!document.querySelector('footer, [role="contentinfo"]')
    const contactPageLinks = anchorNodes.filter((anchor) =>
      /\b(contact|about|service|pricing|quote|booking|appointment)\b/i.test(
        `${anchor.textContent || ''} ${anchor.getAttribute('href') || ''}`
      )
    ).length
    const trustPageLinks = anchorNodes.filter((anchor) =>
      /\b(privacy|terms|conditions|refund|return|shipping|policy|testimonial|review|case stud|portfolio)\b/i.test(
        `${anchor.textContent || ''} ${anchor.getAttribute('href') || ''}`
      )
    ).length
    const textContent = document.body
      ? (document.body.textContent || '').replace(/\s+/g, ' ').trim()
      : ''
    const pageUrl = location.href.toLowerCase()
    const linkText = anchorNodes
      .map((anchor) => `${anchor.textContent || ''} ${anchor.getAttribute('href') || ''}`)
      .join(' ')
      .toLowerCase()
    const countLinks = (pattern) =>
      anchorNodes.filter((anchor) =>
        pattern.test(`${anchor.textContent || ''} ${anchor.getAttribute('href') || ''}`)
      ).length
    const aboutPageLinks = countLinks(/\b(about|our story|who we are|company)\b/i)
    const servicePageLinks = countLinks(/\b(service|services|solutions|menu|products|treatments|specialties)\b/i)
    const pricingPageLinks = countLinks(/\b(pricing|price|plans|packages|rates|fees)\b/i)
    const bookingPageLinks = countLinks(/\b(book|booking|appointment|reserve|reservation|schedule|order online)\b/i)
    const galleryPageLinks = countLinks(/\b(gallery|portfolio|case stud|work|projects|photos)\b/i)
    const reviewSignals = /\b(review|reviews|testimonial|testimonials|rated|rating|stars?|happy customers?|clients say|client logos?|trusted by|case stud|success story|results?|quote)\b/i.test(
      `${textContent} ${linkText}`
    )
    const clientProofSignals = /\b(client logos?|trusted by|case stud|success story|testimonial|results?|portfolio|featured in|partners?)\b/i.test(
      `${textContent} ${linkText}`
    )
    const teamSignals = /\b(team|staff|doctors?|specialists?|founder|owner|chef|attorneys?|consultants?)\b/i.test(
      `${textContent} ${linkText}`
    )
    const privacyLinks = countLinks(/\b(privacy|privacy policy)\b/i)
    const termsLinks = countLinks(/\b(terms|conditions|refund|return|shipping|policy)\b/i)
    const postalAddressSchema = jsonLdScripts.some((script) =>
      /PostalAddress|streetAddress|addressLocality|postalCode|addressCountry/i.test(
        script.textContent || ''
      )
    )
    const postalPattern =
      /\b\d{1,6}[a-z]?(?:[\/\-,\s]+[a-z0-9'.-]+){1,9}\s+(street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd\.?|way|court|ct\.?|crescent|circle|suite|floor|block|sector|area|uposhohor|danforth)\b/i
    const postcodePattern =
      /\b([a-z]\d[a-z]\s?\d[a-z]\d|[a-z]{1,2}\d[a-z\d]?\s?\d[a-z]{2}|\d{5}(?:-\d{4})?|m4c\s?1m7)\b/i
    const addressSignals =
      postalPattern.test(textContent) ||
      postcodePattern.test(textContent) ||
      postalAddressSchema ||
      /\b(address|location|visit us|find us)\b[^.\n]{0,140}\b(canada|bangladesh|sylhet|london|uk|usa|ontario|dhaka|riyadh|jeddah|dubai)\b/i.test(
        textContent
      )
    const openingHourSignals = /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.\n]{0,80}\b(\d{1,2}(:\d{2})?\s?(am|pm)?|closed|open)\b/i.test(
      textContent
    )
    const mapSignals =
      /google\.com\/maps|maps\.app\.goo\.gl|bing\.com\/maps|openstreetmap/i.test(
        `${document.documentElement.innerHTML} ${linkText}`
      ) || !!document.querySelector('iframe[src*="maps" i]')
    const whatsappLinks = anchorNodes.filter((anchor) =>
      /(?:wa\.me|whatsapp\.com|api\.whatsapp)/i.test(anchor.href || '')
    ).length
    const messengerLinks = anchorNodes.filter((anchor) =>
      /(?:m\.me|messenger\.com)/i.test(anchor.href || '')
    ).length
    const formDetails = Array.from(document.forms).map((form, index) => {
      const controls = Array.from(form.elements || [])
      const evidenceText = [
        form.id || '',
        typeof form.className === 'string' ? form.className : '',
        form.getAttribute('name') || '',
        form.getAttribute('action') || '',
        form.getAttribute('aria-label') || '',
        form.textContent || '',
        ...controls.flatMap((control) => [
          control.getAttribute?.('name') || '',
          control.getAttribute?.('type') || '',
          control.getAttribute?.('placeholder') || '',
          control.getAttribute?.('aria-label') || '',
          control.getAttribute?.('autocomplete') || '',
        ]),
      ].join(' ').replace(/\s+/g, ' ').trim()
      const inputTypes = [...new Set(controls.map((control) => String(control.type || control.tagName || '').toLowerCase()).filter(Boolean))]
      const isContact = /contact|message|name|email|phone|tel|enquiry|inquiry|quote|appointment|booking|support|feedback|request/i.test(evidenceText)
      return {
        index,
        id: form.id || '',
        name: form.getAttribute('name') || '',
        action: form.getAttribute('action') || '',
        method: String(form.method || 'get').toUpperCase(),
        inputTypes,
        controlCount: controls.length,
        hasSubmit: Boolean(form.querySelector('button, input[type="submit"], input[type="image"]')),
        isContact,
      }
    })
    const contactForms = formDetails.filter(({ isContact }) => isContact).length
    const ctaPattern =
      /\b(book|call|contact|get quote|free quote|request quote|buy|order|reserve|schedule|demo|signup|sign up|start|start a project|request|enquire|inquire|appointment|whatsapp|donate|apply|learn more|discover|talk to|work with us|partner|visit|view projects?)\b/i
    const logoImages = images.filter((image) =>
      /logo|brand|site-logo/i.test(
        `${image.getAttribute('alt') || ''} ${image.getAttribute('src') || ''} ${image.className || ''}`
      )
    )
    const brokenLogoImages = logoImages.filter(
      (image) => image.complete && image.naturalWidth === 0
    ).length
    const oversizedElements = Array.from(document.querySelectorAll('body *')).filter(
      (node) => {
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)

        return (
          rect.width > window.innerWidth + 24 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        )
      }
    ).length
    const htmlSnippet = document.documentElement.innerHTML.toLowerCase()
    const missingModernHints = !/srcset|sizes=|loading="lazy"|display:\s*grid|display:\s*flex|@media/.test(
      htmlSnippet
    )
    const localBusinessSchemaTypes = [
      'LocalBusiness',
      'Restaurant',
      'MedicalClinic',
      'Store',
      'Organization',
      'ProfessionalService',
      'Dentist',
      'Hospital',
      'AutoRepair',
    ]
    const hasLocalBusinessSchema = [...schemaTypes].some((type) =>
      localBusinessSchemaTypes.some((expected) =>
        String(type).toLowerCase().includes(expected.toLowerCase())
      )
    )
    const titleTokens = `${title} ${h1s.join(' ')} ${description}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !/^(home|page|official|best|with|from|that|this|your|about|contact|website)$/.test(word))
    const keywordCounts = titleTokens.reduce((items, word) => {
      items[word] = (items[word] || 0) + 1
      return items
    }, {})
    const intentKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([word]) => word)
    const visibleButtons = Array.from(
      document.querySelectorAll('a, button, input[type="button"], input[type="submit"]')
    ).filter((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      )
    })
    const aboveFoldCtaCount = visibleButtons.filter((node) => {
      const rect = node.getBoundingClientRect()

      return (
        rect.top >= 0 &&
        rect.top <= Math.max(720, window.innerHeight) &&
        ctaPattern.test(
          `${node.textContent || ''} ${node.value || ''} ${node.getAttribute('aria-label') || ''}`
        )
      )
    }).length
    const smallTapTargets = visibleButtons.filter((node) => {
      const rect = node.getBoundingClientRect()

      return rect.width < 40 || rect.height < 40
    }).length
    const fixedElements = Array.from(
      document.querySelectorAll('body *')
    ).filter((node) => getComputedStyle(node).position === 'fixed')
    const intrusiveFixedElements = fixedElements.filter((node) => {
      const rect = node.getBoundingClientRect()

      return (
        rect.width >= window.innerWidth * 0.5 ||
        rect.height >= window.innerHeight * 0.25
      )
    }).length
    const formCount = document.forms.length
    const formsWithoutSubmit = Array.from(document.forms).filter(
      (form) => !form.querySelector('button, input[type="submit"]')
    ).length
    const iframeCount = document.querySelectorAll('iframe').length
    const domNodeCount = document.querySelectorAll('body *').length
    const emptyHeadingCount = headings.filter(({ text }) => !text).length
    const longTitle = title.length > 65
    const shortTitle = title.length > 0 && title.length < 10
    const shortDescription =
      description.length > 0 && description.length < 50
    const longDescription = description.length > 170
    const mobileOverflow =
      document.documentElement.scrollWidth > window.innerWidth + 4 ||
      document.body?.scrollWidth > window.innerWidth + 4
    const checks = []
    const addCheck = (
      category,
      id,
      label,
      passed,
      points,
      detail = '',
      severity = 'warning'
    ) => {
      checks.push({
        category,
        id,
        label,
        passed,
        points,
        earned: passed ? points : 0,
        detail,
        severity: passed ? 'pass' : severity,
      })
    }
    const canonicalValid = (() => {
      if (!canonical) return false

      try {
        const current = new URL(location.href)
        const parsed = new URL(canonical)

        current.hash = ''
        parsed.hash = ''

        return parsed.protocol.startsWith('http') && parsed.hostname === current.hostname
      } catch (error) {
        return false
      }
    })()
    const titleWords = new Set(title.toLowerCase().split(/\W+/).filter((word) => word.length > 3))
    const h1Related =
      h1s.length === 1 &&
      h1s[0]
        .toLowerCase()
        .split(/\W+/)
        .some((word) => word.length > 3 && titleWords.has(word))
    const skippedHeading = headings.some((heading, index) =>
      index ? heading.level - headings[index - 1].level > 1 : heading.level > 2
    )

    addCheck(
      'metadata',
      'title',
      'Title tag',
      title.length >= 10 && title.length <= 65,
      10,
      title ? `${title.length} characters` : 'Missing title',
      'critical'
    )
    addCheck(
      'metadata',
      'description',
      'Meta description',
      description.length >= 50 && description.length <= 170,
      10,
      description ? `${description.length} characters` : 'Missing description',
      'critical'
    )
    addCheck(
      'metadata',
      'description-unique',
      'Unique meta description',
      !!description && description.toLowerCase() !== title.toLowerCase(),
      3,
      description ? 'Description differs from title' : 'Missing description'
    )
    addCheck(
      'metadata',
      'viewport',
      'Mobile viewport',
      /width\s*=\s*device-width/i.test(viewport),
      4,
      viewport || 'Missing viewport'
    )
    addCheck(
      'metadata',
      'html-lang',
      'HTML language',
      !!lang,
      4,
      lang || 'Missing lang attribute'
    )
    addCheck('metadata', 'favicon', 'Favicon', favicon, 4)

    addCheck(
      'indexability',
      'canonical',
      'Canonical URL',
      canonicalValid,
      10,
      canonical || 'Missing canonical',
      'critical'
    )
    addCheck(
      'indexability',
      'indexable',
      'Indexable robots meta',
      !/(noindex|nofollow)/i.test(robots),
      10,
      robots || 'No restrictive robots meta',
      'critical'
    )
    addCheck(
      'content',
      'h1',
      'Single H1',
      h1s.length === 1,
      8,
      `${h1s.length} H1 tags`,
      'critical'
    )
    addCheck(
      'content',
      'h1-title-match',
      'H1 matches topic',
      h1Related,
      4,
      h1s[0] || 'Missing H1'
    )
    addCheck(
      'content',
      'heading-structure',
      'Heading structure',
      headings.length >= 2 && !skippedHeading,
      4,
      `${headings.length} headings`
    )
    addCheck(
      'content',
      'word-count',
      'Content depth',
      wordCount >= 300,
      4,
      `${wordCount} words`
    )
    addCheck(
      'media',
      'image-alt',
      'Image alt text',
      !images.length || imagesWithAlt.length / images.length >= 0.8,
      7,
      `${imagesWithAlt.length}/${images.length} images`
    )
    addCheck(
      'media',
      'image-alt-duplicates',
      'Distinct image alt text',
      duplicateAltCount <= Math.max(1, Math.floor(imagesWithAlt.length * 0.25)),
      4,
      `${duplicateAltCount} duplicate alt values`
    )
    addCheck(
      'media',
      'lazy-images',
      'Lazy loaded images',
      !images.length || lazyImages.length / images.length >= 0.4,
      4,
      `${lazyImages.length}/${images.length} images`
    )
    addCheck(
      'social-schema',
      'open-graph',
      'Open Graph preview',
      og.title && og.description && og.image,
      5,
      `${ogCount}/3 core tags`
    )
    addCheck(
      'social-schema',
      'twitter-card',
      'Twitter card preview',
      twitter.card && twitter.title && twitter.description,
      5,
      `${twitterCount}/4 core tags`
    )
    addCheck(
      'social-schema',
      'structured-data',
      'Structured data',
      jsonLdScripts.length >= 1,
      5,
      `${jsonLdScripts.length} JSON-LD blocks`
    )
    addCheck(
      'social-schema',
      'schema-type',
      'Schema types',
      schemaTypes.size >= 1,
      5,
      schemaTypes.size ? [...schemaTypes].slice(0, 4).join(', ') : 'No schema types'
    )
    addCheck(
      'local-seo',
      'local-business-schema',
      'Local business schema',
      hasLocalBusinessSchema,
      4,
      hasLocalBusinessSchema ? 'Local/organization schema detected' : 'No local business schema'
    )
    addCheck(
      'local-seo',
      'address-signal',
      'Address signal',
      addressSignals,
      4,
      addressSignals ? 'Address-like text found' : 'No address-like text found'
    )
    addCheck(
      'local-seo',
      'map-signal',
      'Map signal',
      mapSignals,
      3,
      mapSignals ? 'Map/embed link found' : 'No map signal found'
    )
    addCheck(
      'local-seo',
      'opening-hours',
      'Opening hours signal',
      openingHourSignals,
      3,
      openingHourSignals ? 'Hours-like text found' : 'No hours signal found'
    )
    addCheck(
      'trust-conversion',
      'about-page',
      'About/company page',
      aboutPageLinks > 0,
      3,
      `${aboutPageLinks} links`
    )
    addCheck(
      'trust-conversion',
      'contact-path',
      'Contact path',
      contactPageLinks > 0 || mailtoLinks > 0 || phoneLinks > 0 || contactForms > 0,
      4,
      `${contactPageLinks} links, ${contactForms} forms`
    )
    addCheck(
      'trust-conversion',
      'trust-pages',
      'Trust pages',
      privacyLinks > 0 || termsLinks > 0 || reviewSignals || galleryPageLinks > 0,
      3,
      `${privacyLinks} privacy, ${termsLinks} terms, reviews ${reviewSignals ? 'yes' : 'no'}`
    )
    addCheck(
      'trust-conversion',
      'above-fold-cta',
      'Above-fold CTA',
      aboveFoldCtaCount > 0,
      4,
      `${aboveFoldCtaCount} CTA controls near top`
    )
    addCheck(
      'trust-conversion',
      'direct-message-channel',
      'Direct message channel',
      whatsappLinks > 0 || messengerLinks > 0,
      2,
      `${whatsappLinks} WhatsApp, ${messengerLinks} Messenger links`
    )
    addCheck(
      'links',
      'internal-links',
      'Internal links',
      internalLinks >= 3,
      2,
      `${internalLinks} internal links`
    )
    addCheck(
      'links',
      'link-hygiene',
      'Clean links',
      emptyLinks <= 2,
      2,
      `${emptyLinks} empty or placeholder links`
    )
    addCheck(
      'links',
      'external-noopener',
      'Safe external tabs',
      unsafeExternalLinks === 0,
      1,
      `${unsafeExternalLinks} links missing noopener`
    )

    const categoryLabels = {
      metadata: 'Metadata',
      indexability: 'Indexability',
      content: 'Content structure',
      media: 'Media',
      'social-schema': 'Social and schema',
      'local-seo': 'Local SEO',
      'trust-conversion': 'Trust and conversion',
      links: 'Link hygiene',
    }
    const categories = Object.entries(categoryLabels).reduce(
      (items, [id, label]) => {
        const categoryChecks = checks.filter((check) => check.category === id)
        const points = categoryChecks.reduce((sum, check) => sum + check.points, 0)
        const earned = categoryChecks.reduce((sum, check) => sum + check.earned, 0)

        items[id] = {
          id,
          label,
          score: points ? Math.round((earned / points) * 100) : 0,
          earned,
          points,
        }

        return items
      },
      {}
    )
    const totalPoints = checks.reduce((total, check) => total + check.points, 0)
    const earnedPoints = checks.reduce((total, check) => total + check.earned, 0)
    const score = totalPoints
      ? Math.max(0, Math.min(100, Math.round((earnedPoints / totalPoints) * 100)))
      : 0
    const issues = checks
      .filter((check) => !check.passed)
      .map((check) => check.label)
    const issueDetails = checks
      .filter((check) => !check.passed)
      .map(({ id, category, label, detail, severity }) => ({
        id,
        category,
        label,
        detail,
        severity,
      }))

    const resourceBreakdown = resources.reduce((items, resource) => {
      const type = resource.initiatorType || 'other'
      items[type] = Number(items[type] || 0) + 1
      return items
    }, {})
    const paintEntries = performance.getEntriesByType
      ? performance.getEntriesByType('paint')
      : []
    const firstContentfulPaint = Math.round(
      paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0
    )
    const largestPaintEntries = performance.getEntriesByType
      ? performance.getEntriesByType('largest-contentful-paint')
      : []
    const largestContentfulPaint = Math.round(
      largestPaintEntries[largestPaintEntries.length - 1]?.startTime || 0
    )
    const layoutShiftEntries = performance.getEntriesByType
      ? performance.getEntriesByType('layout-shift')
      : []
    const cumulativeLayoutShift = Number(
      layoutShiftEntries
        .filter((entry) => !entry.hadRecentInput)
        .reduce((sum, entry) => sum + Number(entry.value || 0), 0)
        .toFixed(3)
    )
    const cleanSnippet = (value, max = 700) => String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
    const textFromSelector = (selector, max = 700) => cleanSnippet(
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.innerText || node.textContent || '')
        .filter(Boolean)
        .join(' | '),
      max
    )
    const rawTextChunks = {
      hero: textFromSelector('main section:first-of-type, header, [class*="hero" i], [id*="hero" i], [class*="banner" i]', 900),
      services: textFromSelector('[class*="service" i], [id*="service" i], [class*="product" i], [id*="product" i], [class*="menu" i], [id*="menu" i]', 900),
      about: textFromSelector('[class*="about" i], [id*="about" i], [class*="story" i], [id*="story" i], [class*="team" i], [id*="team" i]', 900),
      contact: textFromSelector('[class*="contact" i], [id*="contact" i], [class*="location" i], [id*="location" i], address', 900),
      trust: textFromSelector('[class*="review" i], [id*="review" i], [class*="testimonial" i], [id*="testimonial" i], [class*="case" i], [id*="case" i], [class*="portfolio" i], [id*="portfolio" i]', 900),
      footer: textFromSelector('footer, [role="contentinfo"], [class*="footer" i], [id*="footer" i]', 900),
    }

    const navTiming = navigation
      ? {
          ttfb: Math.round((navigation.responseStart || 0) - (navigation.requestStart || 0)),
          domInteractive: Math.round(navigation.domInteractive || 0),
          domComplete: Math.round(navigation.domComplete || 0),
          transferSize: navigation.transferSize || 0,
          encodedBodySize: navigation.encodedBodySize || 0,
          decodedBodySize: navigation.decodedBodySize || 0,
        }
      : {}
    const hreflangLinks = Array.from(document.querySelectorAll('link[rel~="alternate" i][hreflang]')).map((link) => ({
      language: (link.getAttribute('hreflang') || '').trim(),
      url: link.href || link.getAttribute('href') || '',
    })).filter(({ language, url }) => language && url).slice(0, 40)
    const feedLinks = Array.from(document.querySelectorAll('link[rel~="alternate" i][type*="rss" i], link[rel~="alternate" i][type*="atom" i]')).map((link) => ({
      type: link.getAttribute('type') || '',
      title: link.getAttribute('title') || '',
      url: link.href || link.getAttribute('href') || '',
    })).filter(({ url }) => url).slice(0, 20)
    const webManifest = document.querySelector('link[rel="manifest" i]')?.href || ''
    const charset = document.characterSet || document.querySelector('meta[charset]')?.getAttribute('charset') || ''
    const direction = document.documentElement.getAttribute('dir') || ''
    const publishedAt = readMetaAny('article:published_time') || readMetaAny('datePublished') || readMetaAny('date') || ''
    const modifiedAt = readMetaAny('article:modified_time') || readMetaAny('dateModified') || readMetaAny('last-modified') || ''
    const timeValues = Array.from(document.querySelectorAll('time[datetime]')).map((node) => node.getAttribute('datetime') || '').filter(Boolean).slice(0, 30)
    const copyrightYears = [...new Set((textContent.match(/(?:©|copyright)?\s*(?:19|20)\d{2}(?:\s*[-–]\s*(?:19|20)\d{2})?/gi) || []).flatMap((value) => value.match(/(?:19|20)\d{2}/g) || []))].slice(0, 12)
    const localeValues = [readMetaAny('og:locale'), readMetaAny('content-language'), lang, ...hreflangLinks.map(({ language }) => language)].filter(Boolean)
    const addressCountries = [...new Set(businessIdentity.addresses.map((address) => address.addressCountry).filter(Boolean))]
    const addressTexts = [...new Set([
      ...Array.from(document.querySelectorAll('address,[itemprop="address" i]'))
        .map((node) => String(node.textContent || '').replace(/\s+/g, ' ').trim()),
      ...businessIdentity.addresses.map((address) => Object.values(address || {}).filter(Boolean).join(', ')),
    ].filter(Boolean))].slice(0, 20)
    const geoMeta = {
      region: readMetaAny('geo.region') || readMetaAny('geo_region') || '',
      placename: readMetaAny('geo.placename') || readMetaAny('geo_placename') || '',
      position: readMetaAny('geo.position') || readMetaAny('icbm') || '',
    }
    const ccTld = (() => {
      const suffix = location.hostname.split('.').pop()?.toUpperCase() || ''
      return suffix.length === 2 ? suffix : ''
    })()
    const currencyCodes = [...new Set((`${textContent.slice(0, 50000)} ${jsonLdScripts.map((script) => script.textContent || '').join(' ')}`.match(/\b(?:USD|CAD|GBP|EUR|AUD|NZD|BDT|INR|AED|SAR|QAR|JPY|CNY|SGD|MYR|ZAR|CHF|SEK|NOK|DKK|PKR)\b/gi) || []).map((value) => value.toUpperCase()))].slice(0, 20)
    const geographyEvidence = {
      addressCountries,
      addressTexts,
      geoMeta,
      localeValues: [...new Set(localeValues)].slice(0, 30),
      ccTld,
      currencyCodes,
      areaServed: businessIdentity.areaServed,
    }
    const cartLinks = countLinks(/\b(cart|basket|bag|checkout)\b/i)
    const commerceEvidence = {
      productSchema: [...schemaTypes].some((type) => /Product|Offer|AggregateOffer/i.test(String(type))),
      cartLinks,
      checkoutLinks: countLinks(/\b(checkout|pay now|payment)\b/i),
      priceMentions: (textContent.match(/(?:[$€£৳₹]|USD|CAD|GBP|EUR|BDT|INR|AED|SAR)\s?\d[\d,.]*/gi) || []).slice(0, 30),
      currencies: currencyCodes,
      paymentAccepted: businessIdentity.paymentAccepted,
    }
    const unnamedButtons = visibleButtons.filter((node) => !`${node.textContent || ''} ${node.value || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`.trim()).length
    const unnamedLinks = anchorNodes.filter((node) => !`${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`.trim() && !node.querySelector('img[alt]')).length
    const accessibilitySignals = {
      unlabeledControls, emptyHeadingCount, unnamedButtons, unnamedLinks,
      imagesMissingAlt: Math.max(0, images.length - imagesWithAlt.length),
      htmlLanguagePresent: Boolean(lang),
      skipLinkPresent: anchorNodes.some((anchor) => /skip to (?:main|content)|skip navigation/i.test(anchor.textContent || '')),
      landmarkCounts: {
        header: document.querySelectorAll('header,[role="banner"]').length,
        navigation: document.querySelectorAll('nav,[role="navigation"]').length,
        main: document.querySelectorAll('main,[role="main"]').length,
        footer: document.querySelectorAll('footer,[role="contentinfo"]').length,
      },
    }
    const qualityRuntime = globalThis.LeadLensQuality || null
    const mainContent = qualityRuntime?.extractMainContent?.(document) || {
      title: title || '', excerpt: description || '', text: textContent.slice(0, 12000), wordCount, source: 'page-text-fallback',
    }
    const accessibilityAudit = qualityRuntime?.auditAccessibility?.(document) || {
      engine: 'built-in-basic', issues: [], issueCount: 0,
    }
    const explicitPageSignals = qualityRuntime?.extractExplicitPageSignals?.(document) || {
      policyLinks: [], explicitOfferings: [], languages: [lang].filter(Boolean),
    }
    const dateEvidence = qualityRuntime?.extractDateEvidence?.(document) || {
      machineReadable: timeValues, visible: [], copyrightYears,
    }

    const rawEvidence = {
      title,
      titleLength: title.length,
      description,
      descriptionLength: description.length,
      canonical,
      robots,
      viewport,
      lang,
      generator,
      charset,
      direction,
      qualityRuntimeVersion: qualityRuntime?.version || '',
      mainContent,
      accessibilityAudit,
      explicitPageSignals,
      dateEvidence,
      hreflangLinks,
      feedLinks,
      webManifest,
      contentDates: { publishedAt, modifiedAt, timeValues, copyrightYears },
      businessIdentity,
      geographyEvidence,
      commerceEvidence,
      formDetails,
      accessibilitySignals,
      relatedPageEvidence: Content.relatedPageEvidence.slice(0, 12),
      h1Texts: h1s.slice(0, 10),
      headingSummary: ['h1','h2','h3','h4','h5','h6'].reduce((items, tag) => {
        items[tag] = document.querySelectorAll(tag).length
        return items
      }, {}),
      schemaTypes: [...schemaTypes],
      og,
      twitter,
      sampleInternalLinks: links
        .filter(({ url }) => url.hostname === location.hostname)
        .map(({ url }) => url.href)
        .slice(0, 25),
      sampleExternalLinks: links
        .filter(({ url }) => url.hostname !== location.hostname)
        .map(({ url }) => url.href)
        .slice(0, 25),
      missingAltImages: images
        .filter((image) => !(image.getAttribute('alt') || '').trim())
        .map((image) => image.currentSrc || image.src || image.getAttribute('src') || '')
        .filter(Boolean)
        .slice(0, 25),
      formActions: Array.from(document.forms)
        .map((form) => form.action || '')
        .filter(Boolean)
        .slice(0, 20),
      resourceBreakdown,
      firstContentfulPaint,
      largestContentfulPaint,
      cumulativeLayoutShift,
      navTiming,
      pageTextPreview: textContent.slice(0, 1600),
      rawTextChunks,
    }
    const now = Date.now()
    let seoInfrastructure = null
    if (
      Content.seoInfrastructureCache.url === url &&
      Content.seoInfrastructureCache.expiresAt > now &&
      Content.seoInfrastructureCache.value
    ) {
      seoInfrastructure = Content.seoInfrastructureCache.value
    } else {
      seoInfrastructure = await Content.driver('fetchSeoInfrastructure', [url]).catch((error) => ({
        error: String(error?.message || error),
      }))
      Content.seoInfrastructureCache = {
        url,
        expiresAt: now + 60_000,
        value: seoInfrastructure,
      }
    }
    rawEvidence.evidenceCoverage = qualityRuntime?.assessEvidenceQuality?.({
      url,
      title,
      mainContent,
      structuredDataCount: jsonLdScripts.length,
      contactCount: mailtoLinks + phoneLinks + socialProfileLinks,
      relatedPageCount: Content.relatedPageEvidence.length,
      headersCaptured: Boolean(seoInfrastructure?.pageResponse?.checked),
      robotsChecked: Boolean(seoInfrastructure?.robotsTxt?.checked),
      sitemapChecked: Boolean(seoInfrastructure?.sitemap?.checked),
    }) || null
    rawEvidence.recordValidation = qualityRuntime?.validateEvidenceRecord?.({
      websiteUrl: url,
      websiteHost: location.hostname,
      emails: businessIdentity.emails,
    }) || { success: true, issues: [] }

    return Content.driver('saveSeoAudit', [
      url,
      {
        score,
        issues,
        issueDetails,
        categories,
        checks,
        title,
        protocol: location.protocol,
        descriptionLength: description.length,
        h1Count: h1s.length,
        headingCount: headings.length,
        canonical,
        robots,
        lang,
        viewport,
        favicon,
        images: images.length,
        imagesWithAlt: imagesWithAlt.length,
        brokenImages,
        lazyImages: lazyImages.length,
        duplicateAltCount,
        ogCount,
        twitterCount,
        jsonLdCount: jsonLdScripts.length,
        schemaTypes: [...schemaTypes],
        wordCount,
        internalLinks,
        externalLinks,
        mailtoLinks,
        phoneLinks,
        emptyLinks,
        unsafeExternalLinks,
        mixedContentResources,
        insecureForms,
        resources: resources.length,
        scriptCount,
        stylesheetCount,
        loadTime,
        domReadyTime,
        tableLayoutCount,
        deprecatedNodeCount,
        generator,
        inlineStyleCount,
        formControls: formControls.length,
        unlabeledControls,
        ctaCount,
        navigationCount,
        footerPresent,
        contactPageLinks,
      trustPageLinks,
      clientProofSignals,
        smallTapTargets,
        visibleButtons: visibleButtons.length,
        intrusiveFixedElements,
        formCount,
        formsWithoutSubmit,
        iframeCount,
        domNodeCount,
        emptyHeadingCount,
        longTitle,
        shortTitle,
        shortDescription,
        longDescription,
        mobileOverflow,
        aboutPageLinks,
        servicePageLinks,
        pricingPageLinks,
        bookingPageLinks,
        galleryPageLinks,
        privacyLinks,
        termsLinks,
        reviewSignals,
        teamSignals,
        addressSignals,
        openingHourSignals,
        mapSignals,
        hasLocalBusinessSchema,
        whatsappLinks,
        messengerLinks,
        contactForms,
        aboveFoldCtaCount,
        logoImages: logoImages.length,
        brokenLogoImages,
        oversizedElements,
        missingModernHints,
        intentKeywords,
        pageUrl,
        rawEvidence,
        seoInfrastructure,
        firstContentfulPaint,
        largestContentfulPaint,
        cumulativeLayoutShift,
        navTiming,
        resourceBreakdown,
        auditedAt: new Date().toISOString(),
        pageTextPreview: textContent.slice(0, 1600),
        rawTextChunks,
      },
    ])
  },

  /**
   * Detect directory, listing, search-result, or research pages.
   * Contact evidence from these pages is still saved, but marked for manual review.
   * This helper must never block contact persistence.
   * @param {String} url
   * @param {String} title
   * @returns {Boolean}
   */
  isLeadResearchPage(url = '', title = '') {
    try {
      const parsed = new URL(String(url || location.href || ''), location.href)
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
      const path = `${parsed.pathname || ''} ${parsed.search || ''}`.toLowerCase()
      const pageTitle = String(title || '').toLowerCase()

      if (
        /^(?:maps\.)?google\.[a-z.]+$/.test(host) &&
        /\b(maps|search|local|travel)\b/.test(`${path} ${pageTitle}`)
      ) {
        return true
      }

      if (
        /^(?:yelp\.com|tripadvisor\.com|yellowpages\.[a-z.]+|clutch\.co|designrush\.com|upwork\.com|fiverr\.com)$/i.test(host)
      ) {
        return true
      }

      return (
        /\/(?:search|directory|directories|listing|listings|results|near-me|providers?|companies|agencies|restaurants|clinics|hotels)(?:\/|$|[?_-])/i.test(parsed.pathname || '') ||
        /[?&](?:q|query|search|keyword)=/i.test(parsed.search || '') ||
        /\b(?:search results|directory of|list of|top \d*|best \d*|compare)\b/i.test(pageTitle)
      )
    } catch (error) {
      return false
    }
  },

  /**
   * Extract email addresses and social media links from the current page.
   * @param {String} url
   */
  async extractContacts(url) {
    Content.relatedPageEvidence = []
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    const emails = new Map()
    const socials = new Map()
    const socialPlatforms = [
      {
        name: 'Facebook',
        hosts: ['facebook.com', 'fb.com'],
        blocked:
          /\/(share|sharer|dialog|plugins|login|privacy|help|policies|tr|events|groups\/create|videos?|posts?|reels?|watch|photo|photos)(\/|$)/i,
      },
      {
        name: 'Instagram',
        hosts: ['instagram.com'],
        blocked: /\/(p|reel|reels|stories|explore|accounts|directory)(\/|$)/i,
      },
      {
        name: 'LinkedIn',
        hosts: ['linkedin.com'],
        allowed: /^\/(company|in|school|showcase)\//i,
      },
      {
        name: 'X',
        hosts: ['x.com', 'twitter.com'],
        blocked: /\/(intent|share|search|hashtag|home|i|privacy|tos|status)(\/|$)/i,
      },
      {
        name: 'YouTube',
        hosts: ['youtube.com', 'youtu.be'],
        allowed: /^\/(@|c\/|channel\/|user\/)/i,
      },
      {
        name: 'TikTok',
        hosts: ['tiktok.com'],
        allowed: /^\/@/i,
      },
      {
        name: 'Pinterest',
        hosts: ['pinterest.com'],
        blocked: /\/(pin|search|login)(\/|$)/i,
      },
      {
        name: 'Telegram',
        hosts: ['t.me', 'telegram.me'],
      },
      {
        name: 'WhatsApp',
        hosts: ['wa.me', 'whatsapp.com'],
        allowed: /^\/(send|channel|c)\b|^\/\d+/i,
      },
    ]
    const pageSource = /contact/i.test(location.pathname)
      ? 'contact page'
      : /about/i.test(location.pathname)
      ? 'about page'
      : location.pathname === '/' || location.pathname === ''
      ? 'homepage'
      : 'page'

    const addEmail = (email, source) => {
      let decoded = String(email || '').toLowerCase().trim()
      try { decoded = decodeURIComponent(decoded) } catch (error) { /* Keep raw value. */ }
      decoded = decoded
        .replace(/[\u200B-\u200D\uFEFF\uFFFC\uFFFD]/g, ' ')
        .replace(/&amp;/gi, '&')
      const matches = decoded.match(/[a-z0-9.!#$&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,24}/gi) || []
      let value = String(matches[matches.length - 1] || '').toLowerCase().trim()
      value = value.replace(/^email(?=(?:hello|info|contact|support|sales|admin|team)@)/i, '')
      if (!value || /%|\.\.|[<>{}\[\]"\\]/.test(value)) return
      const current = emails.get(value)
      emails.set(value, { value, sources: [...new Set([...(current?.sources || []), source])] })
    }

    const addMatches = (text, source) => {
      if (!text) return

      ;(text.match(emailRegex) || []).forEach((email) =>
        addEmail(email, source)
      )
    }


    const phones = new Map()
    const normalisePhone = (value = '', source = '', context = '') => {
      const original = String(value || '').trim()
      const checked = globalThis.LeadLensIntelligence?.phoneCandidate?.(original, { source, context })
      if (checked && !checked.possible) return ''
      if (checked?.e164) return checked.e164
      if (checked?.national) return checked.national
      const raw = original.replace(/[^\d+]/g, '')
      const digits = raw.replace(/\D/g, '')
      return digits.length >= 7 && digits.length <= 15 ? `${raw.startsWith('+') ? '+' : ''}${digits}` : ''
    }
    const addPhone = (value, source, context = '') => {
      const phone = normalisePhone(value, source, context)
      if (!phone) return
      const key = phone.replace(/\D/g, '')
      if (!key) return
      const current = phones.get(key)
      const canonical = current?.value?.startsWith('+') ? current.value : phone.startsWith('+') ? phone : current?.value || phone
      phones.set(key, { platform: 'Phone', type: 'phone', phoneRecord: true, value: canonical, url: `tel:${canonical}`, context: String(context || '').slice(0, 180), sources: [...new Set([...(current?.sources || []), source])] })
    }
    const addPhoneMatches = (input, source) => {
      if (!input) return
      const value = String(input)
      const pattern = /(?:\+?\d[\d\s().\-]{6,}\d)/g
      for (const match of value.matchAll(pattern)) {
        const index = Number(match.index || 0)
        const context = value.slice(Math.max(0, index - 55), Math.min(value.length, index + match[0].length + 55))
        addPhone(match[0], source, context)
      }
    }

    const sourceForElement = (element, fallback) => {
      const closest = element.closest(
        'footer,[role="contentinfo"],[class*="footer" i],[id*="footer" i],[class*="contact" i],[id*="contact" i],[class*="about" i],[id*="about" i]'
      )

      if (!closest) return fallback

      const text = `${closest.id || ''} ${closest.className || ''} ${
        closest.getAttribute('role') || ''
      }`.toLowerCase()

      if (/footer|contentinfo/.test(text) || closest.tagName === 'FOOTER') {
        return 'footer'
      }

      if (/contact/.test(text)) return 'contact section'
      if (/about/.test(text)) return 'about section'

      return fallback
    }

    const normaliseUrl = (href) => {
      try {
        const parsed = new URL(href, location.href)

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return null
        }

        parsed.hash = ''

        ;[
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_term',
          'utm_content',
          'hl',
          'fbclid',
          'gclid',
        ].forEach((param) => parsed.searchParams.delete(param))

        if (/^(?:www\.)?(twitter\.com|x\.com)$/i.test(parsed.hostname)) {
          parsed.pathname = parsed.pathname.replace(
            /^\/https?:\/+(?:www\.)?(?:twitter\.com|x\.com)\//i,
            '/'
          )
        }

        return parsed
      } catch (error) {
        return null
      }
    }

    const detectSocial = (href, source = `${pageSource} link`) => {
      let candidate = String(href || '').trim()
      try { candidate = decodeURIComponent(candidate) } catch (error) { /* Keep raw value. */ }
      candidate = candidate
        .replace(/&amp;/gi, '&')
        .split(/&quot;|&#34;|&#x22;|%7b|%7d|[{}<>"\\\s]/i)[0]
        .trim()
      if (!candidate || candidate.length > 350 || /\.svg(?:$|[?#])/i.test(candidate)) return
      const parsed = normaliseUrl(candidate)

      if (!parsed) return

      const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase()
      const currentHost = location.hostname.replace(/^www\./i, '').toLowerCase()

      if (hostname === currentHost) return

      const platform = socialPlatforms.find(({ hosts }) =>
        hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
      )

      if (!platform) return

      const path = parsed.pathname.replace(/\/+$/, '') || '/'

      if (path === '/') return
      if (platform.allowed && !platform.allowed.test(path)) return
      if (platform.blocked && platform.blocked.test(path)) return

      if (platform.name === 'Instagram') {
        ;[...parsed.searchParams.keys()].forEach((key) => parsed.searchParams.delete(key))
      }
      if (platform.name === 'X') {
        parsed.hostname = 'twitter.com'
        parsed.pathname = `/${path.split('/').filter(Boolean).pop() || ''}`
      }

      const socialUrl = parsed.toString().replace(/\/$/, '')

      const key = `${platform.name}:${socialUrl.toLowerCase()}`
      const current = socials.get(key)

      socials.set(key, {
        platform: platform.name,
        url: socialUrl,
        sources: [...new Set([...(current?.sources || []), source])],
      })
    }

    document.querySelectorAll('a[href^="tel:"]').forEach((anchor) => {
      const raw = (anchor.getAttribute('href') || '')
        .replace(/^tel:/i, '')
        .split('?')[0]
        .trim()

      if (raw) addPhone(raw, sourceForElement(anchor, `${pageSource} tel link`))
    })

    document.querySelectorAll('a[href^="mailto:"]').forEach((anchor) => {
      const raw = (anchor.getAttribute('href') || '')
        .replace(/^mailto:/i, '')
        .split('?')[0]
        .trim()

      if (raw) addEmail(raw, sourceForElement(anchor, `${pageSource} mailto link`))
    })

    document.querySelectorAll('a[href]').forEach((anchor) => {
      detectSocial(anchor.getAttribute('href') || '', sourceForElement(anchor, `${pageSource} link`))
    })

    if (document.body) {
      addMatches(document.body.innerText, `${pageSource} visible text`)
      addPhoneMatches(document.body.innerText, `${pageSource} visible text`)

      const footer = document.querySelector(
        'footer,[role="contentinfo"],[class*="footer" i],[id*="footer" i]'
      )

      if (footer) {
        addMatches(footer.innerText, 'footer')
      }
    }

    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((script) => {
        try {
          const text = script.textContent || ''

          addMatches(text, 'schema JSON-LD')

          const collectSchemaPhones = (value, key = '') => {
            if (!value) return
            if (Array.isArray(value)) return value.forEach((item) => collectSchemaPhones(item, key))
            if (typeof value === 'object') {
              Object.entries(value).forEach(([childKey, childValue]) => collectSchemaPhones(childValue, childKey))
              return
            }
            if (/^(telephone|phone|mobile|contactnumber|contact_number|faxnumber)$/i.test(key)) {
              addPhone(String(value), 'schema JSON-LD')
            }
          }

          const parsedSchema = JSON.parse(text)
          collectSchemaPhones(parsedSchema)

          const collectLinks = (value) => {
            if (!value) return

            if (Array.isArray(value)) {
              value.forEach(collectLinks)
              return
            }

            if (typeof value === 'string') {
              detectSocial(value, 'schema JSON-LD')
              return
            }

            if (typeof value === 'object') {
              collectLinks(value.sameAs)
              collectLinks(value.url)
              Object.values(value).forEach(collectLinks)
            }
          }

          collectLinks(parsedSchema)
        } catch (error) {
          // Continue
        }
      })

    document
      .querySelectorAll('[data-email],[data-mail],[data-contact-email]')
      .forEach((element) => {
        const value =
          element.getAttribute('data-email') ||
          element.getAttribute('data-mail') ||
          element.getAttribute('data-contact-email')

        if (value) {
          addMatches(value, 'data attribute')
          addPhoneMatches(value, 'data attribute')
        }
      })

    document.querySelectorAll('meta[name], meta[property]').forEach((meta) => {
      const key = `${meta.getAttribute('name') || ''} ${
        meta.getAttribute('property') || ''
      }`
      const value = meta.getAttribute('content')

      if (!value) return

      if (/email/i.test(key)) addMatches(value, 'meta tag')
      if (/phone|tel|contact/i.test(key)) addPhoneMatches(value, 'meta tag')
      if (
        /(same[_-]?as|social|facebook|instagram|linkedin|twitter|x:|youtube|tiktok|pinterest)/i.test(
          key
        )
      ) {
        detectSocial(value, 'meta tag')
      }
    })


    // Modern websites often render contact evidence inside hydration scripts,
    // encoded attributes, or linked contact/about pages rather than plain text.
    // Scan those sources too, while keeping the final validation filters below.
    const addObfuscatedEmails = (text, source) => {
      if (!text) return

      const cleaned = String(text)
        .replace(/\s*(?:\[|\()\s*at\s*(?:\]|\))\s*/gi, '@')
        .replace(/\s+(?:at)\s+/gi, '@')
        .replace(/\s*(?:\[|\()\s*dot\s*(?:\]|\))\s*/gi, '.')
        .replace(/\s+(?:dot)\s+/gi, '.')

      addMatches(cleaned, source)
    }

    const addSocialMatches = (text, source) => {
      if (!text) return

      const decoded = String(text)
        .replace(/\\\//g, '/')
        .replace(/&amp;/gi, '&')
        .replace(/&#x2F;|&#47;/gi, '/')

      const pattern = /https?:\/\/[^\s"'<>\\]+/gi
      ;(decoded.match(pattern) || []).forEach((match) => detectSocial(match, source))
    }

    const scanDocumentSnapshot = (doc, source) => {
      if (!doc) return

      const html = doc.documentElement?.innerHTML || ''
      let text = ''
      if (doc.body) {
        const clone = doc.body.cloneNode(true)
        clone.querySelectorAll('br,p,div,section,article,header,footer,nav,main,aside,li,tr,h1,h2,h3,h4,h5,h6,address,form').forEach((node) => node.append(' '))
        text = clone.textContent || ''
      }
      text = String(text).replace(/\s+/g, ' ').trim()

      addMatches(text, `${source} visible text`)
      addMatches(html, `${source} HTML`)
      addPhoneMatches(text, `${source} visible text`)
      addObfuscatedEmails(text, `${source} obfuscated text`)
      addSocialMatches(html, `${source} HTML`)

      doc.querySelectorAll?.('a[href], [data-href], [data-url], [data-link], [data-social], meta[content]').forEach((element) => {
        const value =
          element.getAttribute('href') ||
          element.getAttribute('data-href') ||
          element.getAttribute('data-url') ||
          element.getAttribute('data-link') ||
          element.getAttribute('data-social') ||
          element.getAttribute('content') ||
          ''

        if (!value) return

        addMatches(value, `${source} attribute`)
        addPhoneMatches(value, `${source} attribute`)
        addObfuscatedEmails(value, `${source} attribute`)
        detectSocial(value, `${source} attribute`)
      })
    }

    scanDocumentSnapshot(document, pageSource)

    // Fetch a small same-origin set of likely contact/about/location pages.
    // This is intentionally limited so normal scans remain fast and predictable.
    const linkedContactPages = [...document.querySelectorAll('a[href]')]
      .map((anchor) => anchor.href)
      .filter(Boolean)
      .filter((href) => {
        try {
          const parsed = new URL(href, location.href)
          return (
            parsed.origin === location.origin &&
            parsed.href !== location.href &&
            /\b(contact|contact-us|contacts|about|about-us|team|staff|people|location|locations|reservation|booking|support|help|hours|visit|find-us|privacy|terms|terms-of-service|legal)\b/i.test(
              `${parsed.pathname} ${parsed.search}`
            )
          )
        } catch (error) {
          return false
        }
      })
      .filter((href, index, values) => values.indexOf(href) === index)
      .slice(0, 8)


    // Phase 1 security: block sensitive paths from related-page crawling, omit credentials.
    const SENSITIVE_PATH_RE = /(^|\/)(login|signin|sign-in|signup|sign-up|register|logout|account|dashboard|billing|checkout|cart|admin|settings|profile|payment|payments|pay|bank|insurance|health|government|api|oauth|auth|reset-password|password|wp-admin|wp-login)(\/|$|\?|#)/i
    const isSafeSameOriginPublic = (href) => {
      try {
        const u = new URL(href, location.href)
        if (u.origin !== location.origin) return false
        if (!/^https?:$/.test(u.protocol)) return false
        if (u.username || u.password) return false
        if (SENSITIVE_PATH_RE.test(u.pathname)) return false
        if (/(^|[?&])(access_token|id_token|token|api[_-]?key|secret|session|sig|signature)=/i.test(u.search)) return false
        return true
      } catch (_) { return false }
    }

    const guessedContactPages = [
      '/contact', '/contact-us', '/contacts', '/about', '/about-us', '/team', '/locations', '/location', '/privacy', '/terms', '/terms-of-service', '/legal'
    ]
      .map((path) => { try { return new URL(path, location.origin).href } catch { return null } })
      .filter(Boolean)
      .filter((href) => href !== location.href)

    const RELATED_MAX = 3
    const contactPageFetchQueue = [...new Set([...linkedContactPages, ...guessedContactPages])]
      .filter(isSafeSameOriginPublic)
      .slice(0, RELATED_MAX)

    let queueIndex = 0
    const processLinkedHtml = ({ href, finalUrl = href, html, status = 200 }) => {
      if (!html || html.length > 1500000) return
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const source = `linked page: ${new URL(finalUrl || href, location.href).pathname}`
      scanDocumentSnapshot(doc, source)
      const pageText = String(doc.body?.innerText || doc.body?.textContent || '').replace(/\s+/g, ' ').trim()
      if (Content.relatedPageEvidence.length < 12) {
        Content.relatedPageEvidence.push({
          url: finalUrl || href,
          title: String(doc.title || '').trim().slice(0, 200),
          textPreview: pageText.slice(0, 1200),
          forms: doc.forms?.length || 0,
          status,
        })
      }
    }

    // Streaming byte-limited reader: abort oversized responses before the full body loads.
    const MAX_BYTES = 1_500_000
    const readWithLimit = async (response, controller) => {
      const lenHeader = Number(response.headers.get('content-length') || '0')
      if (lenHeader && lenHeader > MAX_BYTES) { try { controller.abort() } catch (_) {} return null }
      const reader = response.body?.getReader?.()
      if (!reader) {
        const txt = await response.text()
        return txt.length > MAX_BYTES ? null : txt
      }
      const chunks = []
      let total = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BYTES) { try { controller.abort() } catch (_) {} return null }
        chunks.push(value)
      }
      const buf = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { buf.set(c, off); off += c.byteLength }
      return new TextDecoder('utf-8', { fatal: false }).decode(buf)
    }

    const fetchLinkedPage = async () => {
      while (queueIndex < contactPageFetchQueue.length) {
        const href = contactPageFetchQueue[queueIndex++]
        try {
          const cached = Content.relatedPageCache.get(href)
          if (cached && cached.expiresAt > Date.now()) {
            processLinkedHtml(cached)
            continue
          }

          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)
          const response = await fetch(href, {
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            signal: controller.signal,
          })
          clearTimeout(timeout)
          if (!response.ok) continue
          // Re-check the final URL after redirects.
          if (!isSafeSameOriginPublic(response.url || href)) continue
          const contentType = response.headers.get('content-type') || ''
          if (!/^text\/html|application\/xhtml\+xml/i.test(contentType)) continue
          const html = await readWithLimit(response, controller)
          if (!html) continue
          const cachedPage = {
            href,
            finalUrl: response.url || href,
            html,
            status: response.status,
            expiresAt: Date.now() + 60_000,
          }
          Content.relatedPageCache.set(href, cachedPage)
          if (Content.relatedPageCache.size > 20) {
            const oldestKey = Content.relatedPageCache.keys().next().value
            Content.relatedPageCache.delete(oldestKey)
          }
          processLinkedHtml(cachedPage)
        } catch (error) {
          // Continue without failing the main scan.
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(2, contactPageFetchQueue.length) }, () => fetchLinkedPage()))

    const filteredEmails = [...emails.values()].filter(({ value, sources = [] }) => {
      const local = String(value || '').split('@')[0]
      const sourceText = sources.join(' ')
      const socialWordOnly = /^(instagram|facebook|twitter|linkedin|tiktok|youtube|pinterest|whatsapp)$/i.test(local)
      const confirmedEmailSource = /mailto|data attribute|attribute|schema json-ld/i.test(sourceText)

      const domain = String(value || '').split('@')[1] || ''
      const suspiciousLocal = /^(?:u003e|sample|test|example|email|yourname|name|noreply|no-reply)$/i.test(local) ||
        /^\d{3,}[-_.]?\d{2,}/.test(local) ||
        /^u003e/i.test(local)
      const suspiciousDomain = /(?:^|\.)(?:example|domain|yourdomain|email|test|localhost|you|spambreak)\.(?:com|org|net|test|local)$/i.test(domain) ||
        /(?:spambreak\.com|\.if$|commeet$|\.invalid$)/i.test(domain)

      const intelligenceEmail = globalThis.LeadLensIntelligence?.emailCandidate?.(value, { source: sourceText, siteHost: location.hostname })
      return (
        (!intelligenceEmail || intelligenceEmail.valid) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) &&
        !/\.(png|jpg|jpeg|gif|svg|webp|avif|heic|ico|css|js|woff2?|ttf|eot|mp4|webm|pdf)$/i.test(value) &&
        !/@(example|domain|yourdomain|email|test|localhost)\b/i.test(value) &&
        !/^(img|image|asset|thumbnail|sprite|icon)[-_\d]/i.test(local) &&
        !suspiciousLocal &&
        !suspiciousDomain &&
        !(socialWordOnly && !confirmedEmailSource) &&
        value.length <= 254
      )
    })

    const socialLinks = [...socials.values(), ...phones.values()]
    const suspiciousSourcePage = typeof Content.isLeadResearchPage === 'function'
      ? Content.isLeadResearchPage(url, document.title || '')
      : false

    if (suspiciousSourcePage) {
      filteredEmails.forEach((email) => {
        email.source = `${email.source || 'page'}; manual review: research/directory page`
        email.sources = [
          ...new Set([
            ...(email.sources || [email.source || 'page']),
            'manual review: research/directory page',
          ]),
        ]
      })

      socialLinks.forEach((social) => {
        social.source = `${social.source || 'page link'}; manual review: research/directory page`
        social.sources = [
          ...new Set([
            ...(social.sources || [social.source || 'page link']),
            'manual review: research/directory page',
          ]),
        ]
      })
    }

    if (filteredEmails.length || socialLinks.length) {
      return Content.driver('saveContacts', [
        url,
        document.title || '',
        {
          emails: filteredEmails,
          socials: socialLinks,
          reviewStatus: suspiciousSourcePage ? 'manual_review' : 'found',
        },
      ])
    }
  },

  extractEmails(url) {
    return Content.extractContacts(url)
  },

  /**
   * Enable scripts to call Driver functions through messaging
   * @param {Object} message
   * @param {Object} sender
   * @param {Function} callback
   */
  onMessage(rawMessage, sender, callback) {
    // Phase E: strict envelope validation.
    const guard = (typeof self !== 'undefined' && self.LeadLensMessageGuard) || null
    const verdict = guard
      ? guard.validate(rawMessage, sender, { allowedMethods: Content.ALLOWED_MESSAGE_METHODS, allowTabSender: true })
      : { ok: !!(sender && sender.id === chrome.runtime.id), source: rawMessage?.source, func: rawMessage?.func, args: rawMessage?.args || [] }

    if (!verdict.ok) {
      if (callback) callback({ error: verdict.reason || 'invalid-message' })
      return !!callback
    }

    const { source, func, args } = verdict

    if (!Content.ALLOWED_MESSAGE_METHODS.has(func) || typeof Content[func] !== 'function') {
      const error = new Error(`Method not allowed: Content.${func}`)
      if (callback) callback({ error: error.message })
      return !!callback
    }

    Content.driver('log', { source, func, args })

    Promise.resolve(Content[func].call(Content, ...(args || [])))
      .then((result) => {
        if (callback) callback(result)
      })
      .catch((error) => {
        Content.error(error)

        if (callback) {
          callback({ error: String(error?.message || error) })
        }
      })

    return !!callback
  },


  driverFallback(func, message = '') {
    if (func === 'error') return undefined
    if (func === 'isDisabledDomain') return false
    if (func === 'getTechnologies') return []
    if (func === 'canStartPageScan') {
      return {
        ok: false,
        status: 'background-unavailable',
        message: 'LeadLens background worker is reconnecting. Retry the scan in a moment.',
      }
    }
    return { ok: false, status: 'background-unavailable', error: String(message || 'Background worker unavailable') }
  },

  driver(func, args) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            source: 'content.js',
            func,
            args:
              args instanceof Error
                ? [args.toString()]
                : args
                ? Array.isArray(args)
                  ? args
                  : [args]
                : [],
          },
          (response) => {
            if (chrome.runtime.lastError) {
              const error = new Error(`${chrome.runtime.lastError.message}: Driver.${func}`)
              if (func !== 'error') {
                try { console.warn('[LeadLens content]', error.message) } catch (e) { /* Ignore */ }
                // Log opportunistically without keeping the original request pending.
                try { void Content.driver('error', error) } catch (e) { /* Ignore */ }
              }
              resolve(Content.driverFallback(func, error.message))
              return
            }
            resolve(response)
          }
        )
      } catch (error) {
        resolve(Content.driverFallback(func, error?.message || error))
      }
    })
  },

  async analyzeRequires(url, requires) {
    await Promise.all(
      requires.map(async ({ name, categoryId, technologies }) => {
        const id = categoryId ? `category:${categoryId}` : `technology:${name}`

        if (
          !Content.analyzedRequires.includes(id) &&
          Object.keys(Content.cache).length
        ) {
          Content.analyzedRequires.push(id)

          await Promise.all([
            Content.onGetTechnologies(technologies, name, categoryId),
            Content.driver('onContentLoad', [
              url,
              Content.cache,
              Content.language,
              name,
              categoryId,
            ]),
          ])
        }
      })
    )
  },

  /**
   * Callback for getTechnologies
   * @param {Array} technologies
   */
  async onGetTechnologies(technologies = [], requires, categoryRequires) {
    const url = location.href

    const js = await getJs(technologies)
    const dom = await getDom(technologies)

    await Promise.all([
      Content.driver('analyzeJs', [url, js, requires, categoryRequires]),
      Content.driver('analyzeDom', [url, dom, requires, categoryRequires]),
    ])
  },
}

// Enable messaging between scripts
chrome.runtime.onMessage.addListener(Content.onMessage)

if (/complete|interactive|loaded/.test(document.readyState)) {
  Content.init()
} else {
  document.addEventListener('DOMContentLoaded', Content.init)
}
