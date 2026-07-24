/*
 * Qrinux LeadLens deterministic quality runtime.
 * This file intentionally performs evidence extraction and validation only.
 * It does not make lead-qualification, industry, country, or sales decisions.
 */
;(function initialiseLeadLensQuality(global) {
  'use strict'

  const VERSION = '1.0.0'
  const MAX_TEXT = 12000
  const MAX_ITEMS = 60
  const compact = (value, max = 500) => String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
  const unique = (values, max = MAX_ITEMS) => [...new Set((values || []).map((value) => compact(value)).filter(Boolean))].slice(0, max)
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))

  const COMPOUND_SUFFIXES = new Set([
    'ac.bd','co.bd','com.bd','edu.bd','gov.bd','net.bd','org.bd',
    'com.au','net.au','org.au','edu.au','gov.au','asn.au','id.au',
    'co.uk','org.uk','me.uk','ltd.uk','plc.uk','ac.uk','gov.uk','sch.uk',
    'co.in','firm.in','net.in','org.in','gen.in','ind.in','ac.in','edu.in','res.in','gov.in','mil.in',
    'co.nz','net.nz','org.nz','ac.nz','govt.nz','school.nz',
    'co.za','org.za','net.za','web.za','gov.za','ac.za','school.za',
    'com.br','net.br','org.br','gov.br','edu.br',
    'com.cn','net.cn','org.cn','gov.cn','edu.cn',
    'co.jp','ne.jp','or.jp','ac.jp','go.jp',
    'co.kr','ne.kr','or.kr','ac.kr','go.kr',
    'com.sg','net.sg','org.sg','gov.sg','edu.sg','per.sg',
    'com.my','net.my','org.my','gov.my','edu.my',
    'com.pk','net.pk','org.pk','edu.pk','gov.pk','gob.pk','gok.pk','gos.pk','gkp.pk',
    'com.ph','net.ph','org.ph','gov.ph','edu.ph',
    'com.hk','net.hk','org.hk','gov.hk','edu.hk','idv.hk',
    'com.tw','net.tw','org.tw','gov.tw','edu.tw','idv.tw',
    'com.tr','net.tr','org.tr','biz.tr','info.tr','web.tr','gov.tr','edu.tr',
    'com.sa','net.sa','org.sa','gov.sa','edu.sa','med.sa','pub.sa','sch.sa',
    'com.eg','net.eg','org.eg','gov.eg','edu.eg',
    'com.ng','net.ng','org.ng','gov.ng','edu.ng','sch.ng',
    'com.mx','net.mx','org.mx','gob.mx','edu.mx',
    'com.ua','net.ua','org.ua','gov.ua','edu.ua',
    'com.vn','net.vn','org.vn','gov.vn','edu.vn',
    'com.ar','net.ar','org.ar','gob.ar','edu.ar',
    'com.co','net.co','nom.co','org.co','gov.co','edu.co',
    'co.id','web.id','or.id','ac.id','sch.id','go.id',
    'co.il','net.il','org.il','ac.il','gov.il','muni.il',
    'com.pl','net.pl','org.pl','gov.pl','edu.pl',
    'com.pt','org.pt','edu.pt','gov.pt',
    'com.gr','net.gr','org.gr','edu.gr','gov.gr',
    'com.ru','net.ru','org.ru','pp.ru',
    'com.de','com.fr','com.es','com.it','com.nl','com.be','com.ch','com.se','com.no','com.dk','com.fi',
  ])

  const COUNTRY_DIAL_CODES = Object.freeze({
    BD:'880', CA:'1', US:'1', GB:'44', AU:'61', NZ:'64', IN:'91', PK:'92', LK:'94', NP:'977',
    AE:'971', SA:'966', QA:'974', KW:'965', BH:'973', OM:'968', SG:'65', MY:'60', ID:'62', PH:'63',
    JP:'81', KR:'82', CN:'86', HK:'852', TW:'886', TH:'66', VN:'84', ZA:'27', NG:'234', KE:'254',
    EG:'20', MA:'212', GH:'233', DE:'49', FR:'33', ES:'34', IT:'39', NL:'31', BE:'32', CH:'41',
    AT:'43', SE:'46', NO:'47', DK:'45', FI:'358', IE:'353', PT:'351', PL:'48', CZ:'420', RO:'40',
    GR:'30', TR:'90', RU:'7', UA:'380', BR:'55', MX:'52', AR:'54', CO:'57', CL:'56', PE:'51'
  })

  function parseDomain(input = '') {
    if (global.LeadLensPublicSuffix?.parse) {
      try {
        const parsed = global.LeadLensPublicSuffix.parse(input)
        if (parsed?.hostname) return { ...parsed, source: 'embedded-public-suffix-list' }
      } catch (error) { /* deterministic fallback below */ }
    }
    if (global.tldts?.parse) {
      try {
        const parsed = global.tldts.parse(input, { allowPrivateDomains: true })
        return {
          hostname: parsed.hostname || '',
          domain: parsed.domain || '',
          subdomain: parsed.subdomain || '',
          publicSuffix: parsed.publicSuffix || '',
          isIp: Boolean(parsed.isIp),
          source: 'tldts',
        }
      } catch (error) { /* deterministic fallback below */ }
    }
    let hostname = compact(input, 500).toLowerCase()
    try { hostname = new URL(/^https?:\/\//i.test(hostname) ? hostname : `https://${hostname}`).hostname.toLowerCase() } catch (error) {
      hostname = hostname.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].split(':')[0]
    }
    hostname = hostname.replace(/^\.+|\.+$/g, '')
    const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')
    const labels = hostname.split('.').filter(Boolean)
    if (isIp || labels.length < 2) return { hostname, domain: hostname, subdomain: '', publicSuffix: '', isIp, source: 'fallback' }
    const lastTwo = labels.slice(-2).join('.')
    const publicSuffix = COMPOUND_SUFFIXES.has(lastTwo) ? lastTwo : labels.at(-1)
    const suffixLabels = publicSuffix.split('.').length
    const domain = labels.slice(-(suffixLabels + 1)).join('.')
    const subdomain = labels.slice(0, -(suffixLabels + 1)).join('.')
    return { hostname, domain, subdomain, publicSuffix, isIp: false, source: 'fallback' }
  }

  function isEmail(value = '') {
    const text = compact(value, 320).replace(/^mailto:/i, '').split(/[?#]/)[0]
    if (global.validator?.isEmail) {
      try { return global.validator.isEmail(text, { allow_utf8_local_part: true, require_tld: true, ignore_max_length: false }) } catch (error) { /* fallback */ }
    }
    if (!text || text.length > 254 || /\s/.test(text) || text.includes('..')) return false
    const match = text.match(/^([^@]+)@([^@]+)$/)
    if (!match) return false
    const [, local, domain] = match
    if (!local || local.length > 64 || !domain.includes('.') || /(^[.-]|[.-]$)/.test(domain)) return false
    if (!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false
    return domain.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  }

  function isUrl(value = '') {
    const text = compact(value, 2048)
    if (global.validator?.isURL) {
      try { return global.validator.isURL(text, { protocols: ['http','https'], require_protocol: true, require_valid_protocol: true }) } catch (error) { /* fallback */ }
    }
    try {
      const parsed = new URL(text)
      return /^(?:http|https):$/.test(parsed.protocol) && Boolean(parsed.hostname)
    } catch (error) { return false }
  }

  function normaliseEmail(value = '') {
    const text = compact(value, 320).replace(/^mailto:/i, '').split(/[?#]/)[0].replace(/[<>()[\]{};,]+$/g, '').toLowerCase()
    return isEmail(text) ? text : ''
  }

  function normalisePhone(value = '', options = {}) {
    const raw = compact(value, 200)
    if (!raw) return { raw: '', e164: '', possible: false, country: '', extension: '', source: 'none' }
    if (global.libphonenumber?.parsePhoneNumberFromString) {
      try {
        const parsed = global.libphonenumber.parsePhoneNumberFromString(raw, options.defaultCountry || undefined)
        if (parsed) return {
          raw,
          e164: parsed.number || '',
          possible: typeof parsed.isPossible === 'function' ? parsed.isPossible() : true,
          valid: typeof parsed.isValid === 'function' ? parsed.isValid() : undefined,
          country: parsed.country || '',
          extension: parsed.ext || '',
          type: typeof parsed.getType === 'function' ? parsed.getType() || '' : '',
          source: 'libphonenumber-js',
        }
      } catch (error) { /* fallback */ }
    }
    let decoded = raw
    try { decoded = decodeURIComponent(raw) } catch (error) { /* keep raw */ }
    const extensionMatch = decoded.match(/(?:ext\.?|extension|x)\s*(\d{1,8})\b/i)
    const extension = extensionMatch?.[1] || ''
    const hasPlus = /^\s*\+/.test(decoded) || /(?:phone=|wa\.me\/)%?2?b?/i.test(decoded)
    let digits = decoded.replace(/(?:ext\.?|extension|x)\s*\d{1,8}\b/ig, '').replace(/\D/g, '')
    if (/^(?:00|011)/.test(digits)) digits = digits.replace(/^(?:00|011)/, '')
    const defaultCountry = String(options.defaultCountry || '').toUpperCase()
    if (!hasPlus && defaultCountry && COUNTRY_DIAL_CODES[defaultCountry]) {
      digits = digits.replace(/^0+/, '')
      digits = `${COUNTRY_DIAL_CODES[defaultCountry]}${digits}`
    }
    const possible = digits.length >= 7 && digits.length <= 15 && !/^(.)\1{6,}$/.test(digits)
    const hasInternationalContext = hasPlus || Boolean(defaultCountry && COUNTRY_DIAL_CODES[defaultCountry])
    const detectedCountry = hasInternationalContext ? (Object.entries(COUNTRY_DIAL_CODES)
      .sort((a, b) => b[1].length - a[1].length)
      .find(([, code]) => digits.startsWith(code))?.[0] || '') : ''
    return {
      raw,
      e164: possible && hasInternationalContext ? `+${digits}` : '',
      national: possible && !hasInternationalContext ? digits : '',
      possible,
      valid: undefined,
      country: detectedCountry,
      extension,
      type: '',
      source: 'fallback',
    }
  }

  function visibleText(node) {
    if (!node || !node.isConnected) return ''
    try {
      const style = node.ownerDocument?.defaultView?.getComputedStyle?.(node)
      if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return ''
    } catch (error) { /* Continue */ }
    return compact(node.innerText || node.textContent || '', MAX_TEXT)
  }

  function extractMainContent(document) {
    if (!document?.querySelectorAll) return { title: '', excerpt: '', text: '', wordCount: 0, source: 'none' }
    if (global.Readability) {
      try {
        const clone = document.cloneNode(true)
        const result = new global.Readability(clone, { charThreshold: 120 }).parse()
        if (result?.textContent) {
          const text = compact(result.textContent, MAX_TEXT)
          return { title: compact(result.title, 300), excerpt: compact(result.excerpt, 700), text, wordCount: text.split(/\s+/).filter(Boolean).length, source: '@mozilla/readability' }
        }
      } catch (error) { /* deterministic fallback */ }
    }
    const candidates = Array.from(document.querySelectorAll('main, article, [role="main"], section, .content, #content, .main, #main')).slice(0, 120)
    const scored = candidates.map((node) => {
      const text = visibleText(node)
      const links = node.querySelectorAll?.('a').length || 0
      const paragraphs = node.querySelectorAll?.('p,li').length || 0
      const controls = node.querySelectorAll?.('button,input,select,textarea').length || 0
      const score = text.length + paragraphs * 120 - links * 26 - controls * 35
      return { node, text, score }
    }).filter(({ text }) => text.length >= 120).sort((a, b) => b.score - a.score)
    const best = scored[0]
    const fallbackText = compact(document.body?.innerText || document.body?.textContent || '', MAX_TEXT)
    const text = best?.text || fallbackText
    const firstParagraph = best?.node?.querySelector?.('p')
    return {
      title: compact(best?.node?.querySelector?.('h1,h2')?.textContent || document.title || '', 300),
      excerpt: compact(firstParagraph?.textContent || text, 700),
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      source: best ? 'dom-density' : 'document-body',
    }
  }

  function auditAccessibility(document) {
    if (!document?.querySelectorAll) return { engine: 'none', checks: {}, issues: [], issueCount: 0 }
    const issues = []
    const push = (id, impact, count, description, examples = []) => {
      if (!count) return
      issues.push({ id, impact, count, description, examples: unique(examples, 8) })
    }
    const images = Array.from(document.querySelectorAll('img'))
    push('image-alt', 'serious', images.filter((node) => !node.hasAttribute('alt')).length, 'Images without an alt attribute', images.filter((node) => !node.hasAttribute('alt')).map((node) => node.currentSrc || node.src))
    const controls = Array.from(document.querySelectorAll('input:not([type="hidden"]),select,textarea'))
    const controlName = (node) => {
      const id = node.id
      return compact(node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || node.getAttribute('title') || node.getAttribute('placeholder') || (id ? document.querySelector(`label[for="${global.CSS?.escape ? global.CSS.escape(id) : id}"]`)?.textContent : '') || node.closest('label')?.textContent)
    }
    push('form-label', 'critical', controls.filter((node) => !controlName(node)).length, 'Form controls without a detectable label', controls.filter((node) => !controlName(node)).map((node) => `${node.tagName.toLowerCase()}${node.name ? `[name=${node.name}]` : ''}`))
    const buttons = Array.from(document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]'))
    const accessibleName = (node) => compact(node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || node.getAttribute('title') || node.value || node.textContent || node.querySelector('img[alt]')?.alt)
    push('button-name', 'serious', buttons.filter((node) => !accessibleName(node)).length, 'Buttons without an accessible name')
    const links = Array.from(document.querySelectorAll('a[href]'))
    push('link-name', 'serious', links.filter((node) => !accessibleName(node)).length, 'Links without an accessible name', links.filter((node) => !accessibleName(node)).map((node) => node.href))
    const ids = Array.from(document.querySelectorAll('[id]')).map((node) => node.id).filter(Boolean)
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
    push('duplicate-id', 'moderate', new Set(duplicateIds).size, 'Duplicate element IDs', duplicateIds)
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((node) => Number(node.tagName.slice(1)))
    const skips = headings.slice(1).filter((level, index) => level - headings[index] > 1).length
    push('heading-order', 'moderate', skips, 'Heading levels skip one or more levels')
    push('html-lang', 'serious', document.documentElement?.getAttribute('lang') ? 0 : 1, 'Document language is not declared')
    push('document-title', 'serious', compact(document.title) ? 0 : 1, 'Document title is missing')
    push('main-landmark', 'moderate', document.querySelector('main,[role="main"]') ? 0 : 1, 'No main landmark detected')
    const targetBlank = links.filter((node) => node.target === '_blank' && !/\b(?:noopener|noreferrer)\b/i.test(node.rel || ''))
    push('unsafe-new-window', 'moderate', targetBlank.length, 'New-window links without noopener/noreferrer', targetBlank.map((node) => node.href))
    const engine = global.axe ? 'axe-core-compatible-preflight' : 'deterministic-preflight'
    return {
      engine,
      checks: {
        images: images.length,
        controls: controls.length,
        buttons: buttons.length,
        links: links.length,
        headings: headings.length,
      },
      issues,
      issueCount: issues.reduce((sum, item) => sum + item.count, 0),
      note: 'Automated preflight only; colour contrast, keyboard flow, and screen-reader behaviour still require manual review.',
    }
  }

  function extractExplicitPageSignals(document) {
    if (!document?.querySelectorAll) return {}
    const links = Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
      text: compact(`${anchor.textContent || ''} ${anchor.getAttribute('aria-label') || ''} ${anchor.getAttribute('title') || ''}`, 240),
      href: anchor.href || anchor.getAttribute('href') || '',
    }))
    const policies = [
      ['privacy', /\bprivacy(?: policy)?\b/i], ['terms', /\bterms(?: of (?:use|service))?|conditions\b/i],
      ['cookies', /\bcookies?(?: policy| preferences)?\b/i], ['refund', /\brefund|returns? policy\b/i],
      ['shipping', /\bshipping|delivery policy\b/i], ['accessibility', /\baccessibility(?: statement)?\b/i],
      ['careers', /\bcareers?|jobs?|join (?:our )?team\b/i], ['press', /\bpress|media|newsroom\b/i],
    ]
    const policyLinks = policies.flatMap(([type, pattern]) => links.filter(({ text, href }) => pattern.test(`${text} ${href}`)).slice(0, 8).map(({ text, href }) => ({ type, text, url: href }))).slice(0, 50)
    const serviceSelectors = '[class*="service" i] h2,[class*="service" i] h3,[id*="service" i] h2,[id*="service" i] h3,[class*="product" i] h2,[class*="product" i] h3,[itemprop="name"]'
    const explicitOfferings = unique(Array.from(document.querySelectorAll(serviceSelectors)).map((node) => node.textContent), 40)
    const languages = unique([
      document.documentElement?.getAttribute('lang'),
      ...Array.from(document.querySelectorAll('link[rel~="alternate"][hreflang]')).map((node) => node.getAttribute('hreflang')),
    ], 40)
    return { policyLinks, explicitOfferings, languages }
  }

  function extractDateEvidence(document) {
    if (!document?.querySelectorAll) return { machineReadable: [], visible: [], copyrightYears: [] }
    const machineReadable = unique([
      ...Array.from(document.querySelectorAll('time[datetime]')).map((node) => node.getAttribute('datetime')),
      ...Array.from(document.querySelectorAll('meta[content]')).filter((node) => /(?:published|modified|updated|date)/i.test(`${node.getAttribute('name') || ''} ${node.getAttribute('property') || ''} ${node.getAttribute('itemprop') || ''}`)).map((node) => node.content),
    ], 50)
    const visible = unique(Array.from(document.querySelectorAll('time,.date,.published,.updated,[class*="date" i]')).map((node) => node.textContent), 30)
    const pageText = compact(document.body?.textContent || '', 80000)
    const copyrightYears = unique((pageText.match(/(?:©|copyright)?\s*(?:19|20)\d{2}(?:\s*[-–]\s*(?:19|20)\d{2})?/gi) || []).flatMap((value) => value.match(/(?:19|20)\d{2}/g) || []), 20)
    return { machineReadable, visible, copyrightYears }
  }

  function assessEvidenceQuality(payload = {}) {
    const checks = {
      url: isUrl(payload.url || ''),
      title: Boolean(compact(payload.title)),
      mainContent: Number(payload.mainContent?.wordCount || 0) >= 40,
      structuredData: Number(payload.structuredDataCount || 0) > 0,
      contacts: Number(payload.contactCount || 0) > 0,
      relatedPages: Number(payload.relatedPageCount || 0) > 0,
      headers: Boolean(payload.headersCaptured),
      robots: Boolean(payload.robotsChecked),
      sitemap: Boolean(payload.sitemapChecked),
    }
    const score = Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100)
    return {
      score,
      label: score >= 85 ? 'Rich evidence' : score >= 65 ? 'Good evidence' : score >= 40 ? 'Partial evidence' : 'Limited evidence',
      checks,
      missing: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
      note: 'Coverage score only. It measures captured evidence, not business quality or lead value.',
    }
  }

  function validateEvidenceRecord(record = {}) {
    const issues = []
    if (!record || typeof record !== 'object' || Array.isArray(record)) issues.push({ path: '', message: 'Evidence record must be an object.' })
    const url = record?.websiteUrl || record?.url || ''
    if (url && !isUrl(url)) issues.push({ path: 'websiteUrl', message: 'Website URL is not a valid HTTP(S) URL.' })
    const host = record?.websiteHost || record?.host || ''
    if (host && parseDomain(host).hostname !== String(host).replace(/^www\./i, '').toLowerCase()) issues.push({ path: 'websiteHost', message: 'Website host could not be normalised.' })
    for (const [index, email] of (Array.isArray(record?.emails) ? record.emails : []).entries()) {
      const value = typeof email === 'string' ? email : email?.value
      if (value && !isEmail(value)) issues.push({ path: `emails.${index}`, message: 'Email format is invalid.' })
    }
    return { success: issues.length === 0, issues, data: record }
  }

  function rankTextChunks(chunks = {}, terms = []) {
    const query = unique(terms.flatMap((term) => compact(term).toLowerCase().split(/[^\p{L}\p{N}]+/u)), 80)
    const querySet = new Set(query.filter((token) => token.length > 2))
    return Object.entries(chunks || {}).map(([name, value]) => {
      const text = compact(value, 5000)
      const tokens = new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2))
      const overlap = [...querySet].filter((token) => tokens.has(token)).length
      const density = text ? Math.min(20, Math.log10(text.length + 1) * 4) : 0
      return { name, text, score: Math.round((overlap * 12 + density) * 10) / 10, source: 'deterministic-token-overlap' }
    }).sort((a, b) => b.score - a.score)
  }

  async function optionalLocalSuggestions(payload = {}, options = {}) {
    if (!options.enabled) return { enabled: false, available: Boolean(global.transformers), suggestions: [], modifiedRawEvidence: false }
    if (!global.transformers?.pipeline) return { enabled: true, available: false, suggestions: [], modifiedRawEvidence: false, reason: 'Transformers.js is not bundled in this release; no model was executed.' }
    // Strictly limited to text-chunk ranking. Results are suggestions and never mutate raw evidence.
    try {
      const ranked = rankTextChunks(payload.chunks || {}, options.terms || ['services','about','contact','location','booking','pricing'])
      return { enabled: true, available: true, suggestions: ranked.slice(0, 6), modifiedRawEvidence: false, task: 'chunk-ranking-only' }
    } catch (error) {
      return { enabled: true, available: true, suggestions: [], modifiedRawEvidence: false, error: String(error?.message || error) }
    }
  }

  global.LeadLensQuality = Object.freeze({
    version: VERSION,
    compact,
    unique,
    clamp,
    parseDomain,
    rootDomain: (value) => parseDomain(value).domain,
    isEmail,
    isUrl,
    normaliseEmail,
    normalisePhone,
    extractMainContent,
    auditAccessibility,
    extractExplicitPageSignals,
    extractDateEvidence,
    assessEvidenceQuality,
    validateEvidenceRecord,
    rankTextChunks,
    optionalLocalSuggestions,
  })
})(globalThis)
