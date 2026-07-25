'use strict'
/* eslint-env browser */
/* globals chrome, Wappalyzer, Utils, LeadLensBlacklist, LeadLensIntelligence */

const {
  setTechnologies,
  setCategories,
  analyze,
  analyzeManyToMany,
  resolve,
  getTechnology,
} = Wappalyzer
const { agent, promisify, getOption, setOption, open, globEscape } = Utils

const expiry = 1000 * 60 * 60 * 48

// Large lead datasets are stored per website instead of rewriting one huge object.
// This keeps bulk scans and the first Lead Vault load stable with hundreds of websites.
const CONTACT_SHARD_PREFIX = 'contactItemsByHost:'
const REJECTED_CONTACT_PREFIX = 'rejectedContactsByHost:'
const SEO_AUDIT_PREFIX = 'seoAuditByHost:'
const CONTACT_SUMMARY_PREFIX = 'contactSummaryByHost:'
const SEO_SUMMARY_PREFIX = 'seoAuditSummaryByHost:'
const CONTACT_SHARD_VERSION = 2

const maxHostnames = 120

const hostnameIgnoreList =
  /\b((local|dev(elop(ment)?)?|sandbox|stag(e|ing)?|preprod|production|preview|test(ing)?|[^a-z]demo(shop)?|cache)[.-]|dev\d|localhost|\.local|\.test|web\.archive\.org|^([0-9.]+|[\d.]+)$|^([a-f0-9:]+:+)+[a-f0-9]+$)/

const xhrDebounce = []

let xhrAnalyzed = {}

let initDone
let initSettled = false

// Serialize contact-store writes so concurrent bulk-scan tabs cannot overwrite
// each other's email, social, phone, or placeholder records.
let contactItemsWriteQueue = Promise.resolve()
let hostnameCacheSaveTimer = null
let technologyHistorySaveTimer = null

function enqueueContactItemsWrite(task) {
  const run = contactItemsWriteQueue.then(task, task)
  contactItemsWriteQueue = run.catch(() => undefined)
  return run
}

const activePageScans = new Map()

const scanSessionTtl = 1000 * 60 * 2
const scanSessionStorageKey = 'leadLensActivePageScans'

const debugLoggingEnabled = false

const initPromise = new Promise((resolve) => {
  initDone = resolve
})

function settleDriverInit() {
  if (initSettled) return
  initSettled = true
  initDone()
}

const allowedMessageMethods = new Set([
  'analyzeDom',
  'analyzeJs',
  'clearCache',
  'clearContacts',
  'resetSystem',
  'cleanupOldLeads',
  'deleteContact',
  'deleteLead',
  'detectTechnology',
  'error',
  'getContacts',
  'getContactSummaries',
  'getLeadDetails',
  'getLeadDetailsBatch',
  'getDetections',
  'getTechnologies',
  'isDisabledDomain',
  'log',
  'lookupDomainAge',
  'normalizeStoredContacts',
  'releaseScanResources',
  'onContentLoad',
  'beginPageScan',
  'canStartPageScan',
  'endPageScan',
  'saveContacts',
  'saveEmails',
  'fetchSeoInfrastructure',
  'saveScanPlaceholder',
  'saveSeoAudit',
  'updateLeadMeta',
])

function getRequiredTechnologies(name, categoryId) {
  return name
    ? Wappalyzer.requires.find(({ name: _name }) => _name === name).technologies
    : categoryId
    ? Wappalyzer.categoryRequires.find(
        ({ categoryId: _categoryId }) => _categoryId === categoryId
      ).technologies
    : undefined
}

function isSimilarUrl(a, b) {
  const normalise = (url) => String(url || '').replace(/(\/|\/?#.+)$/, '')

  return normalise(a) === normalise(b)
}

const Driver = {
  /**
   * Initialise driver
   */
  async init() {
    await Utils.migrateLeadDatabase()
    await Utils.deleteLegacyFolderAutosaveDatabase()
    await Driver.loadTechnologies()
    await Driver.restorePageScanSessions()

    // Merge the versioned non-prospect library on upgrades. This keeps social
    // networks, major platforms, directories, marketplaces, and large brands
    // out of prospect scans while preserving user-added domains.
    const protectedDomains = [...LeadLensBlacklist.protectedDomains]
    const recommendedDomains = [...LeadLensBlacklist.domains]
    const blacklistVersion = Number(LeadLensBlacklist.version || 1)
    const installedBlacklistVersion = Number(
      await getOption('leadLensDefaultBlacklistVersion', 0)
    )
    const disabledDomains = await getOption('disabledDomains')
    const cleaned = (disabledDomains || [])
      .map((domain) => String(domain || '').trim().toLowerCase())
      .filter(Boolean)

    if (disabledDomains === null || installedBlacklistVersion < blacklistVersion) {
      await setOption('disabledDomains', [
        ...new Set([...cleaned, ...recommendedDomains, ...protectedDomains]),
      ])
      await setOption('leadLensDefaultBlacklistVersion', blacklistVersion)
    } else {
      await setOption('disabledDomains', [
        ...new Set([...cleaned, ...protectedDomains]),
      ])
    }

    // Keep important features enabled by default so users do not need to
    // manually turn on core LeadLens intelligence after installing/updating.
    const defaultEnabledOptions = {
      badge: true,
      showCached: true,
      localAiEnabled: true,
      localAiModelDownload: false,
      leadLensConservativeFramework: true,
      leadLensLargeDataSafeMode: true,
      leadLensAutoAcceptCookieConsent: true,
    }

    for (const [option, value] of Object.entries(defaultEnabledOptions)) {
      if (await getOption(option) === null) await setOption(option, value)
    }
    // Local intelligence is an always-on part of LeadLens v1.5.0. There is no
    // user-facing disable path; failures fall back to deterministic evidence.
    await setOption('localAiEnabled', true)

    // Do not block the service-worker startup with a full shard scan. Large
    // databases are repaired in the background after messaging becomes ready.
    // The existing per-host summary shards remain immediately readable.
    const hostnameCache = await getOption('hostnames', {})

    Driver.cache = {
      hostnames: Object.keys(hostnameCache || {}).reduce((cache, hostname) => {
        const storedHost = hostnameCache?.[hostname] || {}
        const detections = Array.isArray(storedHost.detections) ? storedHost.detections : []

        cache[hostname] = {
          ...storedHost,
          detections: detections
            .map(({ technology: name, pattern = {}, version = '' } = {}) => {
              const technology = getTechnology(name, true)
              if (!technology) return null

              let regex
              try {
                regex = new RegExp(pattern.regex || '', 'i')
              } catch (error) {
                regex = new RegExp('', 'i')
              }

              return {
                technology,
                pattern: {
                  regex,
                  confidence: Number(pattern.confidence || 0),
                },
                version,
              }
            })
            .filter(Boolean),
        }

        return cache
      }, {}),
      robots: await getOption('robots', {}),
      ads: [],
    }

    const { version } = chrome.runtime.getManifest()
    const previous = await getOption('version')
    const upgradeMessage = await getOption('upgradeMessage', true)

    await setOption('version', version)

    const current = await getOption('version')

    if (!previous) {
      await Driver.clearCache()
    } else if (version !== previous && upgradeMessage) {
      // Continue without opening third-party upgrade pages.
    }

    settleDriverInit()

    // Repair indexes and retention asynchronously. This protects the first
    // Lead Vault load when hundreds or thousands of leads already exist.
    setTimeout(() => {
      Utils.withTimeout(Driver.repairShardIndexes(), 30000, 'Background lead shard recovery timed out')
        .catch((error) => Driver.log(error, 'shard-recovery', 'error'))
      Driver.applyRetentionCleanup()
        .catch((error) => Driver.log(error, 'retention-cleanup', 'error'))
    }, 1200)
  },

  /**
   * Log debug messages to the console
   * @param {String} message
   * @param {String} source
   * @param {String} type
   */
  log(message, source = 'driver', type = 'log') {
    if (type === 'error') {
      const safeError = message instanceof Error ? message.message : String(message || '')
      // eslint-disable-next-line no-console
      console.error(`[LeadLens ${source}]`, safeError)
      return
    }

    if (!debugLoggingEnabled) {
      return
    }

    const safeMessage = Driver.safeDebugMessage(message)

    // eslint-disable-next-line no-console
    console[type](`[LeadLens ${source}]`, safeMessage)
  },

  safeDebugMessage(message) {
    if (!message || typeof message !== 'object') {
      return message
    }

    const safe = {
      source: message.source,
      func: message.func,
    }

    const args = Array.isArray(message.args) ? message.args : []

    if (args[0]) {
      try {
        safe.urlHost = new URL(String(args[0])).hostname
      } catch (e) {
        safe.firstArgType = typeof args[0]
      }
    }

    if (args[1] && typeof args[1] === 'object') {
      safe.payload = {
        htmlLength: typeof args[1].html === 'string' ? args[1].html.length : 0,
        textLength: typeof args[1].text === 'string' ? args[1].text.length : 0,
        cssLength: typeof args[1].css === 'string' ? args[1].css.length : 0,
        scriptSrcCount: Array.isArray(args[1].scriptSrc) ? args[1].scriptSrc.length : 0,
        scriptsCount: Array.isArray(args[1].scripts) ? args[1].scripts.length : 0,
        metaCount: args[1].meta && typeof args[1].meta === 'object' ? Object.keys(args[1].meta).length : 0,
        cookiesCount: args[1].cookies && typeof args[1].cookies === 'object' ? Object.keys(args[1].cookies).length : 0,
      }
    }

    return safe
  },

  /**
   * Log errors to the console
   * @param {String} error
   * @param {String} source
   */
  error(error, source = 'driver') {
    Driver.log(error, source, 'error')
  },

  /**
   * Load technologies and categories into memory
   */
  async loadTechnologies() {
    try {
      const categories = await (
        await fetch(chrome.runtime.getURL('categories.json'))
      ).json()

      let technologies = {}

      for (const index of Array(27).keys()) {
        const character = index ? String.fromCharCode(index + 96) : '_'

        technologies = {
          ...technologies,
          ...(await (
            await fetch(chrome.runtime.getURL(`technologies/${character}.json`))
          ).json()),
        }
      }

      Object.keys(technologies).forEach((name) => {
        delete technologies[name].description
        delete technologies[name].cpe
        delete technologies[name].pricing
        delete technologies[name].website
      })

      setTechnologies(technologies)
      setCategories(categories)
    } catch (error) {
      Driver.error(error)
    }
  },

  /**
   * Get all categories
   */
  getCategories() {
    return Wappalyzer.categories
  },

  /**
   * Perform a HTTP POST request
   * @param {String} url
   * @param {String} body
   */
  post(url, body) {
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  },

  /**
   * Wrapper for analyze — the per-page scan gate lives in onContentLoad,
   * which is the single entry point per website with a real URL. Calling
   * authorize() here would fire for every partial detection (headers, xhr,
   * scripts) with an object arg, log "[object Object]" as website_url, and
   * collapse every bulk-scan row into one via the 60s dedupe window.
   */
  async analyze(...args) {
    return analyze(...args)
  },

  /**
   * Analyse JavaScript variables
   * @param {String} url
   * @param {Array} js
   */
  analyzeJs(url, js, requires, categoryRequires) {
    const technologies =
      getRequiredTechnologies(requires, categoryRequires) ||
      Wappalyzer.technologies

    return Driver.onDetect(
      url,
      js
        .map(({ name, chain, value }) => {
          const technology = technologies.find(
            ({ name: _name }) => name === _name
          )

          return technology
            ? analyzeManyToMany(technology, 'js', { [chain]: [value] })
            : []
        })
        .flat()
    )
  },

  /**
   * Analyse DOM nodes
   * @param {String} url
   * @param {Array} dom
   */
  analyzeDom(url, dom, requires, categoryRequires) {
    const technologies =
      getRequiredTechnologies(requires, categoryRequires) ||
      Wappalyzer.technologies

    return Driver.onDetect(
      url,
      dom
        .map(
          (
            { name, selector, exists, text, property, attribute, value },
            index
          ) => {
            const technology = technologies.find(
              ({ name: _name }) => name === _name
            )

            if (!technology) {
              return []
            }

            if (typeof exists !== 'undefined') {
              return analyzeManyToMany(technology, 'dom.exists', {
                [selector]: [''],
              })
            }

            if (typeof text !== 'undefined') {
              return analyzeManyToMany(technology, 'dom.text', {
                [selector]: [text],
              })
            }

            if (typeof property !== 'undefined') {
              return analyzeManyToMany(
                technology,
                `dom.properties.${property}`,
                {
                  [selector]: [value],
                }
              )
            }

            if (typeof attribute !== 'undefined') {
              return analyzeManyToMany(
                technology,
                `dom.attributes.${attribute}`,
                {
                  [selector]: [value],
                }
              )
            }
          }
        )
        .flat()
    )
  },

  /**
   * Force a technology detection by URL and technology name
   * @param {String} url
   * @param {String} name
   */
  detectTechnology(url, name) {
    const technology = getTechnology(name)

    return Driver.onDetect(url, [
      { technology, pattern: { regex: '', confidence: 100 }, version: '' },
    ])
  },

  /**
   * Enable scripts to call Driver functions through messaging
   * @param {Object} message
   * @param {Object} sender
   * @param {Function} callback
   */
  onMessage(rawMessage, sender, callback) {
    // Phase E: strict envelope validation.
    const guard = self.LeadLensMessageGuard
    const verdict = guard
      ? guard.validate(rawMessage, sender, { allowedMethods: allowedMessageMethods, allowTabSender: true })
      : { ok: !!(sender && sender.id === chrome.runtime.id), source: rawMessage?.source, func: rawMessage?.func, args: rawMessage?.args || [] }

    if (!verdict.ok) {
      if (callback) callback({ error: verdict.reason || 'invalid-message' })
      return !!callback
    }

    const { source, func, args } = verdict

    if (!allowedMessageMethods.has(func) || !Driver[func]) {
      const error = new Error(`Method is not available: Driver.${func}`)
      Driver.error(error)
      if (callback) {
        callback({ error: error.message })
      }
      return !!callback
    }

    if (func !== 'log') {
      Driver.log({ source, func, args })
    }



    // A service-worker startup problem must never freeze Lead Vault requests.
    // Read-only requests can continue with a safe empty cache while startup recovers.
    new Promise(async (resolve) => {
      try {
        await Utils.withTimeout(initPromise, 7000, 'Driver initialization wait timed out')
      } catch (error) {
        Driver.log(error, 'driver-init', 'error')
      }

      Driver.cache = Driver.cache || { hostnames: {}, robots: {}, ads: [] }
      resolve(Driver[func].call(Driver, ...(args || [])))
    })
      .then((result) => {
        if (callback) callback(result)
      })
      .catch((error) => {
        Driver.error(error)

        if (callback) {
          callback({ error: String(error?.message || error) })
        }
      })

    return !!callback
  },

  async content(url, func, args) {
    const [tab] = await promisify(chrome.tabs, 'query', {
      url: globEscape(url),
    })

    if (!tab) {
      return
    }

    if (tab.status !== 'complete') {
      throw new Error(`Tab ${tab.id} not ready for sendMessage: ${tab.status}`)
    }

    return new Promise((resolve, reject) => {
      const guard = self.LeadLensMessageGuard
      const envelope = guard
        ? guard.envelope('driver.js', func, args)
        : { source: 'driver.js', func, args: args ? (Array.isArray(args) ? args : [args]) : [] }
      chrome.tabs.sendMessage(tab.id, envelope, (response) => {
          if (chrome.runtime.lastError) {
            if (func === 'error') return resolve()
            const error = new Error(`${chrome.runtime.lastError.message}: Driver.${func}`)
            Driver.error(error)
            reject(error)
            return
          }
          if (response?.error) {
            reject(new Error(String(response.error)))
            return
          }
          resolve(response)
        }
      )
    })
  },

  async restorePageScanSessions() {
    let stored = {}
    try {
      if (chrome.storage?.session) {
        stored = await new Promise((resolve) => chrome.storage.session.get([scanSessionStorageKey], (items = {}) => resolve(items[scanSessionStorageKey] || {})))
      } else {
        stored = await getOption(scanSessionStorageKey, {})
      }
    } catch (error) {
      stored = {}
    }
    const now = Date.now()
    Object.entries(stored || {}).forEach(([hostname, expiresAt]) => {
      const expiry = Number(expiresAt || 0)
      if (hostname && expiry > now) activePageScans.set(hostname, expiry)
    })
    Driver.cleanupPageScans(false)
  },

  persistPageScanSessions() {
    const payload = Object.fromEntries(activePageScans.entries())
    try {
      if (chrome.storage?.session) {
        chrome.storage.session.set({ [scanSessionStorageKey]: payload }, () => void chrome.runtime.lastError)
      } else {
        setOption(scanSessionStorageKey, payload).catch(() => {})
      }
    } catch (error) {
      // Persistence is best-effort; the in-memory session remains active.
    }
  },

  normaliseScanHostname(url) {
    try {
      return new URL(url).hostname
    } catch (e) {
      return ''
    }
  },

  cleanupPageScans(persist = true) {
    const now = Date.now()
    let changed = false

    for (const [hostname, expiresAt] of activePageScans.entries()) {
      if (expiresAt <= now) {
        activePageScans.delete(hostname)
        changed = true
      }
    }
    if (changed && persist) Driver.persistPageScanSessions()
  },

  async canStartPageScan(url) {
    const hostname = Driver.normaliseScanHostname(url)

    if (!hostname) {
      return { ok: false, status: 'invalid-url' }
    }

    if (await Driver.isDisabledDomain(url)) {
      return { ok: false, status: 'disabled-domain' }
    }

    const contactIndex = await Driver.getContactSummaryIndex()
    const hosts = new Set(Object.keys(contactIndex || {}))
    const storageStats = await Utils.getBrowserStorageStats()

    if (storageStats.percent >= 98 && !hosts.has(hostname)) {
      return {
        ok: false,
        status: 'storage-critical',
        message:
          'Browser database is almost full. Open Lead Vault, download a backup, and delete old leads before scanning more websites.',
      }
    }

    return { ok: true, status: 'browser-database' }
  },

  beginPageScan(url) {
    const hostname = Driver.normaliseScanHostname(url)

    if (!hostname) {
      return false
    }

    Driver.cleanupPageScans()
    activePageScans.set(hostname, Date.now() + scanSessionTtl)
    Driver.persistPageScanSessions()

    return true
  },

  endPageScan(url) {
    const hostname = Driver.normaliseScanHostname(url)

    if (!hostname) {
      return false
    }

    // Keep a short grace period so late async scripts/XHR from the user-started
    // scan can still be associated with this website, but normal browsing stays
    // outside automatic scan processing.
    activePageScans.set(hostname, Date.now() + 15000)
    Driver.persistPageScanSessions()

    return true
  },

  isPageScanActive(url) {
    const hostname = Driver.normaliseScanHostname(url)

    if (!hostname) {
      return false
    }

    Driver.cleanupPageScans()

    return (activePageScans.get(hostname) || 0) > Date.now()
  },

  /**
   * Analyse response headers
   * @param {Object} request
   */
  async onWebRequestComplete(request) {
    if (request.responseHeaders) {
      if (!Driver.isPageScanActive(request.url) || (await Driver.isDisabledDomain(request.url))) {
        return
      }

      const headers = {}

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const [tab] = await promisify(chrome.tabs, 'query', {
          url: globEscape(request.url),
        })

        if (tab) {
          request.responseHeaders.forEach((header) => {
            const name = header.name.toLowerCase()

            headers[name] = headers[name] || []

            headers[name].push(
              (header.value || header.binaryValue || '').toString()
            )
          })

          Driver.onDetect(request.url, analyze({ headers })).catch(Driver.error)
        }
      } catch (error) {
        Driver.error(error)
      }
    }
  },

  /**
   * Analyse scripts
   * @param {Object} request
   */
  async onScriptRequestComplete(request) {
    const initiatorUrl = request.initiator || request.documentUrl || request.url

    if (
      !Driver.isPageScanActive(initiatorUrl) ||
      (await Driver.isDisabledDomain(initiatorUrl)) ||
      (await Driver.isDisabledDomain(request.url))
    ) {
      return
    }

    const { hostname } = new URL(initiatorUrl)

    if (!Driver.cache.hostnames[hostname]) {
      Driver.cache.hostnames[hostname] = {}
    }

    if (!Driver.cache.hostnames[hostname].analyzedScripts) {
      Driver.cache.hostnames[hostname].analyzedScripts = []
    }

    if (Driver.cache.hostnames[hostname].analyzedScripts.length >= 25) {
      return
    }

    Driver.cache.hostnames[hostname].analyzedScripts.push(request.url)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(request.url, { signal: controller.signal })

      clearTimeout(timeout)

      if (!response.ok) {
        return
      }

      const scripts = (await response.text()).slice(0, 200000)

      Driver.onDetect(initiatorUrl, analyze({ scripts })).catch(Driver.error)
    } catch (error) {
      Driver.log('Script analysis skipped', error?.message || error)
    }
  },

  /**
   * Analyse XHR request hostnames
   * @param {Object} request
   */
  async onXhrRequestComplete(request) {
    if (!Driver.isPageScanActive(request.originUrl || request.initiator || request.url) || (await Driver.isDisabledDomain(request.url))) {
      return
    }

    let hostname
    let originHostname

    try {
      ;({ hostname } = new URL(request.url))
      ;({ hostname: originHostname } = new URL(request.originUrl))
    } catch (error) {
      return
    }

    if (!xhrDebounce.includes(hostname)) {
      xhrDebounce.push(hostname)

      setTimeout(() => {
        xhrDebounce.splice(xhrDebounce.indexOf(hostname), 1)

        xhrAnalyzed[originHostname] = xhrAnalyzed[originHostname] || []

        if (!xhrAnalyzed[originHostname].includes(hostname)) {
          xhrAnalyzed[originHostname].push(hostname)

          if (Object.keys(xhrAnalyzed).length > 500) {
            xhrAnalyzed = {}
          }

          Driver.onDetect(
            request.originUrl || request.initiator,
            analyze({ xhr: hostname })
          ).catch(Driver.error)
        }
      }, 1000)
    }
  },

  /**
   * Process return values from content.js
   * @param {String} url
   * @param {Object} items
   * @param {String} language
   */
  async onContentLoad(url, items, language, requires, categoryRequires) {
    try {
      // Qrinux LeadLens — log this page scan + enforce daily quota
      try {
        if (url && typeof self !== 'undefined' && self.LeadLensGate) {
          // Phase C: build an immutable scan context up-front. All downstream
          // work in this scan (enrichment, batching, logging) MUST reuse
          // ctx.scan_id / ctx.event_id — do not derive a new id later.
          const ctx = self.LeadLensScanContext
            ? await self.LeadLensScanContext.createFromUrl(url)
            : null
          const eventId = ctx ? ctx.event_id : ('evt_' + Math.floor(Date.now() / 60000) + '_' + Math.random().toString(36).slice(2, 10))
          const scanId = ctx ? ctx.scan_id : ((self.crypto && self.crypto.randomUUID) ? self.crypto.randomUUID() : ('scan_' + Math.random().toString(36).slice(2, 10)))
          this._activeScanContext = ctx

          const gate = await self.LeadLensGate.authorize(url, { eventId, scanId })
          if (!gate.ok) {
            const silent = gate.reason === 'network_error' || gate.reason === 'service_error'
            if (!silent) {
              try {
                chrome.notifications && chrome.notifications.create({
                  type: 'basic',
                  iconUrl: chrome.runtime.getURL('images/icon_128.png'),
                  title: 'Qrinux LeadLens — scan blocked',
                  message: gate.message || 'Scan blocked. Check your API key or plan.',
                })
              } catch (e) {}
            }
            return
          }
        }
      } catch (e) { /* fail closed */ return }

      items.cookies = items.cookies || {}

      // Use only page-visible cookies by default. The privileged chrome.cookies
      // permission is intentionally not required, which keeps Web Store review
      // lower-risk and avoids reading HttpOnly cookies.
      if (chrome.cookies?.getAll) {
        try {
          ;(
            await promisify(chrome.cookies, 'getAll', {
              url,
            })
          ).forEach(
            ({ name, value }) => (items.cookies[name.toLowerCase()] = [value])
          )
        } catch (error) {
          Driver.log('Privileged cookie read skipped', error?.message || error)
        }
      }

      // Change Google Analytics 4 cookie from _ga_XXXXXXXXXX to _ga_*
      Object.keys(items.cookies).forEach((name) => {
        if (/_ga_[A-Z0-9]+/.test(name)) {
          items.cookies['_ga_*'] = items.cookies[name]

          delete items.cookies[name]
        }
      })

      const technologies = getRequiredTechnologies(requires, categoryRequires)

      await Driver.onDetect(
        url,
        analyze({ url, ...items }, technologies),
        language,
        true
      )
    } catch (error) {
      Driver.error(error)
    }
  },

  /**
   * Get all technologies
   */
  getTechnologies() {
    return Wappalyzer.technologies
  },

  /**
   * Check if Wappalyzer has been disabled for the domain
   */
  async isDisabledDomain(url) {
    try {
      const { hostname } = new URL(url)
      const disabledDomains = await getOption('disabledDomains', [])

      return disabledDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      )
    } catch (error) {
      return false
    }
  },

  /**
   * Callback for detections
   * @param {String} url
   * @param {Array} detections
   * @param {String} language
   * @param {Boolean} incrementHits
   */
  async onDetect(
    url,
    detections = [],
    language,
    incrementHits = false,
    analyzeRequires = true
  ) {
    if (!url || !detections.length) {
      return
    }

    url = url.split('#')[0]

    const { hostname, pathname } = new URL(url)

    // Cache detections
    const cache = (Driver.cache.hostnames[hostname] = {
      detections: [],
      hits: incrementHits ? 0 : 1,
      https: url.startsWith('https://'),
      analyzedScripts: [],
      ...(Driver.cache.hostnames[hostname] || []),
      dateTime: Date.now(),
    })

    // Remove duplicates
    cache.detections = cache.detections
      .concat(detections)
      .filter(({ technology }) => technology)
      .filter(
        (
          {
            technology: { name },
            pattern: { regex, value },
            confidence,
            version,
          },
          index,
          detections
        ) =>
          detections.findIndex(
            ({
              technology: { name: _name },
              pattern: { regex: _regex, value: _value },
              confidence: _confidence,
              version: _version,
            }) =>
              name === _name &&
              version === _version &&
              confidence === _confidence &&
              value === _value &&
              (!regex || regex.toString() === _regex.toString())
          ) === index
      )
      .map((detection) => {
        if (
          detections.find(
            ({ technology: { slug } }) => slug === detection.technology.slug
          )
        ) {
          detection.lastUrl = url
        }

        return detection
      })

    // Track if technology was identified on website's root path
    detections.forEach(({ technology: { name } }) => {
      const detection = cache.detections.find(
        ({ technology: { name: _name } }) => name === _name
      )

      detection.rootPath = detection.rootPath || pathname === '/'
    })

    const resolved = resolve(cache.detections).map((detection) => detection)

    await Driver.trackTechnologyChanges(hostname, resolved)

    // Look for technologies that require other technologies to be present on the page
    const requires = [
      ...Wappalyzer.requires.filter(({ name }) =>
        resolved.some(({ name: _name }) => _name === name)
      ),
      ...Wappalyzer.categoryRequires.filter(({ categoryId }) =>
        resolved.some(({ categories }) =>
          categories.some(({ id }) => id === categoryId)
        )
      ),
    ]

    try {
      await Driver.content(url, 'analyzeRequires', [url, requires])
    } catch (error) {
      // Continue
    }

    await Driver.setIcon(url, resolved)

    await Driver.ping()

    cache.hits += incrementHits ? 1 : 0
    cache.language = cache.language || language

    // Expire cache
    Driver.cache.hostnames = Object.keys(Driver.cache.hostnames)
      .sort((a, b) =>
        Driver.cache.hostnames[a].dateTime > Driver.cache.hostnames[b].dateTime
          ? -1
          : 1
      )
      .reduce((hostnames, hostname) => {
        const cache = Driver.cache.hostnames[hostname]

        if (
          cache.dateTime > Date.now() - expiry &&
          Object.keys(hostnames).length < maxHostnames
        ) {
          hostnames[hostname] = cache
        }

        return hostnames
      }, {})

    // Persist transient technology cache on a debounce. Rewriting the entire
    // hostname cache on every detected script/resource becomes expensive in
    // long bulk sessions. Full lead evidence is already stored per website.
    Driver.scheduleTransientStorePersist()

    Driver.log({ hostname, technologies: resolved })
  },

  /**
   * Callback for onAd listener
   * @param {Object} ad
   */
  onAd(ad) {
    Driver.cache.ads.push(ad)
  },

  /**
   * Update the extension icon
   * @param {String} url
   * @param {Object} technologies
   */
  async setIcon(url, technologies = []) {
    if (await Driver.isDisabledDomain(url)) {
      technologies = []
    }

    const showCached = await getOption('showCached', true)
    const badge = await getOption('badge', true)

    const _technologies = technologies.filter(
      ({ slug, lastUrl }) =>
        slug !== 'cart-functionality' &&
        (showCached || isSimilarUrl(url, lastUrl))
    )

    if (!url) {
      return
    }

    let tabs = []

    try {
      tabs = await promisify(chrome.tabs, 'query', {
        url: globEscape(url),
      })
    } catch (error) {
      // Continue
    }

    tabs.forEach(({ id: tabId }) => {
      chrome.action.setBadgeText(
        {
          tabId,
          text:
            badge && _technologies.length
              ? _technologies.length.toString()
              : '',
        },
        () => {}
      )

      chrome.action.setIcon(
        {
          tabId,
          path: chrome.runtime.getURL('images/icon_128.png'),
        },
        () => {}
      )
    })
  },

  /**
   * Get the detected technologies for the current tab
   */
  async getDetections() {
    const [tab] = await promisify(chrome.tabs, 'query', {
      active: true,
      currentWindow: true,
    })

    if (!tab) {
      Driver.error(new Error('getDetections: no active tab found'))

      return
    }

    const { url } = tab

    if (await Driver.isDisabledDomain(url)) {
      await Driver.setIcon(url, [])

      return
    }

    const showCached = await getOption('showCached', true)

    const { hostname } = new URL(url)

    const cache = Driver.cache.hostnames?.[hostname]

    const resolved = (cache ? resolve(cache.detections) : []).filter(
      ({ lastUrl }) => showCached || isSimilarUrl(url, lastUrl)
    )

    await Driver.setIcon(url, resolved)

    return resolved
  },

  /**
   * Fetch the website's robots.txt rules
   * @param {String} hostname
   * @param {Boolean} secure
   */
  async getRobots(hostname, secure = false) {
    return []
  },

  /**
   * Check if the website allows indexing of a URL
   * @param {String} href
   */
  async checkRobots(href) {
    return true
  },

  /**
   * Clear caches
   */
  async clearCache() {
    clearTimeout(hostnameCacheSaveTimer)
    clearTimeout(technologyHistorySaveTimer)
    hostnameCacheSaveTimer = null
    technologyHistorySaveTimer = null
    Driver.cache.hostnames = {}

    xhrAnalyzed = {}

    await setOption('hostnames', {})
  },

  /**
   * Save extracted email addresses and social media links from a page.
   * @param {String} url
   * @param {String} pageTitle
   * @param {Object} contacts
   */
  async saveContacts(url, pageTitle, contacts = {}) {
    return enqueueContactItemsWrite(async () => {
      const { hostname } = new URL(url)
      const stored = await Driver.getContactShard(hostname)
      const now = new Date().toISOString()
      const emails = (contacts.emails || []).map((email) => typeof email === 'string' ? { value: email, source: 'page' } : email)
      const socials = contacts.socials || []
      const pageContactStatus = contacts.reviewStatus || 'found'
      const technologies = Driver.getStoredTechnologies(hostname)
      const rejected = []

      emails.forEach((email = {}) => {
        const value = Driver.cleanEmailValue(email.value || '', hostname)
        if (!value) {
          rejected.push({ type: 'email', value: email.value || '', reason: 'Invalid or contaminated email candidate' })
          return
        }
        const key = `email:${value}`
        const sources = email.sources || [email.source || 'page']
        const current = stored[key]
        stored[key] = {
          ...(current || {}),
          id: key,
          type: 'email',
          value,
          email: value,
          emailDomain: value.split('@')[1] || '',
          emailKind: Driver.classifyEmailKind(value.split('@')[1] || '', hostname),
          websiteUrl: url,
          websiteHost: hostname,
          pageTitle: (pageTitle || current?.pageTitle || hostname).slice(0, 100),
          foundAt: current?.foundAt || now,
          lastSeenAt: now,
          foundCount: Number(current?.foundCount || 0) + 1,
          status: pageContactStatus,
          sources: [...new Set([...(current?.sources || []), ...sources])].slice(0, 24),
          technologies: technologies.length ? technologies : current?.technologies || [],
        }
      })

      socials.forEach((social = {}) => {
        const { platform, source, sources } = social
        const socialUrl = social.url || social.value || social.href || ''
        if (!platform || !socialUrl) return
        const nextSources = sources || [source || 'page link']
        const value = Driver.cleanSocialValue(platform, socialUrl, nextSources.join(' '))
        if (!value) {
          rejected.push({ type: 'social', platform, value: socialUrl, reason: 'Invalid or contaminated social/phone candidate' })
          return
        }
        const cleanPlatform = Driver.normaliseSocialPlatform(platform, value)
        const isPhone = /^(?:Phone|WhatsApp)$/i.test(cleanPlatform) || /^(?:tel:|https?:\/\/(?:api\.)?whatsapp\.com|https?:\/\/wa\.me)/i.test(value)
        const recordType = isPhone ? 'phone' : 'social'
        const key = `${recordType}:${cleanPlatform}:${value.toLowerCase()}`
        const current = stored[key]
        stored[key] = {
          ...(current || {}),
          id: key,
          type: recordType,
          value,
          platform: cleanPlatform,
          websiteUrl: url,
          websiteHost: hostname,
          pageTitle: (pageTitle || current?.pageTitle || hostname).slice(0, 100),
          foundAt: current?.foundAt || now,
          lastSeenAt: now,
          foundCount: Number(current?.foundCount || 0) + 1,
          status: pageContactStatus,
          sources: [...new Set([...(current?.sources || []), ...nextSources])].slice(0, 24),
          technologies: technologies.length ? technologies : current?.technologies || [],
        }
      })

      await Driver.saveContactShard(hostname, stored)
      await Driver.rememberRejectedContacts(hostname, rejected)
    })
  },
  /**
   * Save extracted email addresses from older content scripts.
   * @param {String} url
   * @param {String} pageTitle
   * @param {Array} emails
   */
  saveEmails(url, pageTitle, emails) {
    return Driver.saveContacts(url, pageTitle, { emails, socials: [] })
  },


  async fetchSeoInfrastructure(url = '') {
    const checkedAt = new Date().toISOString()
    const empty = {
      checkedAt,
      pageResponse: {
        checked: false,
        status: '',
        finalUrl: '',
        contentType: '',
        contentLength: '',
        lastModified: '',
        server: '',
        poweredBy: '',
        cacheControl: '',
        contentEncoding: '',
        securityHeaders: {},
        missingSecurityHeaders: [],
        error: '',
      },
      robotsTxt: {
        checked: false,
        found: false,
        status: '',
        url: '',
        sitemapUrls: [],
        disallowCount: 0,
        allowCount: 0,
        crawlDelay: '',
        rawPreview: '',
        error: '',
      },
      sitemap: {
        checked: false,
        found: false,
        status: '',
        url: '',
        urlCount: 0,
        sampleUrls: [],
        error: '',
      },
    }

    let parsed

    try {
      parsed = new URL(url)
    } catch (error) {
      return { ...empty, error: 'Invalid URL' }
    }

    if (!/^https?:$/.test(parsed.protocol)) return empty

    const origin = `${parsed.protocol}//${parsed.host}`
    const fetchText = async (target, timeoutMs = 8000) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(target, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            Accept: 'text/plain, application/xml, text/xml, */*;q=0.8',
          },
        })
        const text = await response.text()

        return {
          ok: response.ok,
          status: response.status,
          url: response.url || target,
          text: text.slice(0, 150000),
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    const result = JSON.parse(JSON.stringify(empty))

    try {
      const inspectResponse = async (method = 'HEAD') => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        try {
          const response = await fetch(parsed.href, {
            method,
            redirect: 'follow',
            signal: controller.signal,
            headers: method === 'GET' ? { Accept: 'text/html,application/xhtml+xml,*/*;q=0.7', Range: 'bytes=0-0' } : { Accept: 'text/html,application/xhtml+xml,*/*;q=0.7' },
          })
          if (response.body?.cancel) response.body.cancel().catch(() => {})
          return response
        } finally {
          clearTimeout(timeout)
        }
      }
      let response = await inspectResponse('HEAD')
      if ([405, 501].includes(response.status)) response = await inspectResponse('GET')
      const header = (name) => response.headers.get(name) || ''
      const securityHeaderNames = [
        'strict-transport-security',
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy',
        'permissions-policy',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy',
      ]
      const securityHeaders = Object.fromEntries(securityHeaderNames.map((name) => [name, header(name)]))
      const expected = parsed.protocol === 'https:'
        ? securityHeaderNames.slice(0, 6)
        : securityHeaderNames.slice(1, 6)
      result.pageResponse = {
        checked: true,
        status: response.status,
        finalUrl: response.url || parsed.href,
        contentType: header('content-type'),
        contentLength: header('content-length'),
        lastModified: header('last-modified'),
        server: header('server'),
        poweredBy: header('x-powered-by'),
        cacheControl: header('cache-control'),
        contentEncoding: header('content-encoding'),
        securityHeaders,
        missingSecurityHeaders: expected.filter((name) => !securityHeaders[name]),
        error: '',
      }
    } catch (error) {
      result.pageResponse = {
        ...result.pageResponse,
        checked: true,
        error: String(error?.message || error),
      }
    }

    try {
      const robotsUrl = `${origin}/robots.txt`
      const robots = await fetchText(robotsUrl, 7000)
      const robotsText = robots.text || ''
      const sitemapUrls = [...robotsText.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)]
        .map((match) => match[1].trim())
        .filter(Boolean)

      result.robotsTxt = {
        checked: true,
        found: robots.ok && /(?:user-agent|sitemap|disallow|allow)\s*:/i.test(robotsText),
        status: robots.status,
        url: robots.url || robotsUrl,
        sitemapUrls: [...new Set(sitemapUrls)].slice(0, 20),
        disallowCount: (robotsText.match(/^\s*disallow\s*:/gim) || []).length,
        allowCount: (robotsText.match(/^\s*allow\s*:/gim) || []).length,
        crawlDelay: (robotsText.match(/^\s*crawl-delay\s*:\s*(.+)$/im) || [])[1] || '',
        rawPreview: robotsText.slice(0, 2000),
        error: '',
      }
    } catch (error) {
      result.robotsTxt = {
        ...result.robotsTxt,
        checked: true,
        url: `${origin}/robots.txt`,
        error: String(error?.message || error),
      }
    }

    const candidateSitemaps = [
      ...result.robotsTxt.sitemapUrls,
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
    ].filter((value, index, values) => value && values.indexOf(value) === index)

    for (const sitemapUrl of candidateSitemaps.slice(0, 4)) {
      try {
        const sitemap = await fetchText(sitemapUrl, 8000)
        const text = sitemap.text || ''
        const urls = [...text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
          .map((match) => match[1].trim())
          .filter(Boolean)

        result.sitemap = {
          checked: true,
          found: sitemap.ok && urls.length > 0,
          status: sitemap.status,
          url: sitemap.url || sitemapUrl,
          urlCount: urls.length,
          sampleUrls: urls.slice(0, 20),
          error: '',
        }

        if (result.sitemap.found) break
      } catch (error) {
        result.sitemap = {
          ...result.sitemap,
          checked: true,
          url: sitemapUrl,
          error: String(error?.message || error),
        }
      }
    }

    return result
  },

  async saveSeoAudit(url, audit = {}) {
    const { hostname } = new URL(url)
    const record = {
      ...audit,
      websiteUrl: url,
      websiteHost: hostname,
      auditedAt: audit.auditedAt || new Date().toISOString(),
    }
    await enqueueContactItemsWrite(() => Driver.saveSeoAuditShard(hostname, record))
    await Driver.saveScanPlaceholder(url, audit.title || hostname, 'scanned')
  },

  async saveScanPlaceholder(url, pageTitle = '', status = 'scanned') {
    return enqueueContactItemsWrite(async () => {
      const { hostname } = new URL(url)
      const stored = await Driver.getContactShard(hostname)
      const now = new Date().toISOString()
      const key = `site:${hostname}`
      stored[key] = {
        ...(stored[key] || {}),
        id: key,
        type: 'site',
        value: url,
        websiteUrl: url,
        websiteHost: hostname,
        pageTitle: (pageTitle || hostname).slice(0, 100),
        foundAt: stored[key]?.foundAt || now,
        lastSeenAt: now,
        foundCount: Number(stored[key]?.foundCount || 0) + 1,
        status,
        sources: ['bulk scan'],
        technologies: Driver.getStoredTechnologies(hostname),
      }
      await Driver.saveContactShard(hostname, stored)
    })
  },

  async lookupDomainAge(hostname = '', websiteUrl = '', scanStatus = '') {
    const host = Driver.normaliseLookupHostname(hostname, websiteUrl)
    const checkedAt = new Date().toISOString()

    if (!host) {
      return Driver.domainAgeResult({
        host,
        rootDomain: '',
        status: 'invalid-domain',
        checkedAt,
        message: 'No valid domain was available for this lead.',
      })
    }

    const rootDomain = Driver.rootDomain(host)
    const lookups = await getOption('domainAgeLookups', {})
    const cached = Driver.findFreshDomainAgeLookup(lookups, host, rootDomain)

    if (cached) {
      return cached
    }

    const result = await Driver.fetchDomainAgeFromRdap(rootDomain, host, scanStatus)

    Driver.domainLookupKeys(host, rootDomain).forEach((key) => {
      lookups[key] = result
    })
    await setOption('domainAgeLookups', lookups)

    return result
  },

  findFreshDomainAgeLookup(lookups = {}, host = '', rootDomain = '') {
    const cacheMaxAge = 1000 * 60 * 60 * 24 * 30

    return Driver.domainLookupKeys(host, rootDomain)
      .map((key) => lookups[key])
      .find((cached) => {
        if (!cached?.checkedAt) return false

        return Date.now() - new Date(cached.checkedAt).getTime() < cacheMaxAge
      })
  },

  resolveDomainAgeLookup(hostname = '', websiteUrl = '', lookups = {}) {
    const host = Driver.normaliseLookupHostname(hostname, websiteUrl)
    const rootDomain = Driver.rootDomain(host)

    return Driver.findFreshDomainAgeLookup(lookups, host, rootDomain) || null
  },

  domainLookupKeys(host = '', rootDomain = '') {
    return [
      host,
      rootDomain,
      host && `www.${host}`,
      rootDomain && `www.${rootDomain}`,
    ]
      .filter(Boolean)
      .map((key) => key.toLowerCase())
      .filter((key, index, keys) => keys.indexOf(key) === index)
  },

  async fetchDomainAgeFromRdap(rootDomain, host, scanStatus = '') {
    const checkedAt = new Date().toISOString()
    // Provider chain: rdap.org → IANA bootstrap → registry fallback.
    // Each provider is tried in order with its own timeout. First success wins.
    const providers = [
      `https://rdap.org/domain/${encodeURIComponent(rootDomain)}`,
      `https://www.rdap.net/domain/${encodeURIComponent(rootDomain)}`,
      `https://rdap.iana.org/domain/${encodeURIComponent(rootDomain)}`,
    ]

    let lastStatus = 0
    let lastError = null
    let response = null

    for (const url of providers) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const candidate = await fetch(url, {
          headers: { Accept: 'application/rdap+json, application/json' },
          signal: controller.signal,
          redirect: 'follow',
        })
        clearTimeout(timeout)
        lastStatus = candidate.status
        // 200 = use this provider. 404/410 = definitive "not registered" — stop trying.
        if (candidate.ok || candidate.status === 404 || candidate.status === 410) {
          response = candidate
          break
        }
        // Other statuses (429, 5xx, 451): try the next provider.
      } catch (error) {
        clearTimeout(timeout)
        lastError = error
        // Continue to next provider.
      }
    }

    if (!response) {
      return Driver.domainAgeResult({
        host,
        rootDomain,
        status: lastError?.name === 'AbortError' ? 'lookup-timeout' : 'lookup-failed',
        checkedAt,
        message: lastError?.name === 'AbortError'
          ? 'Domain age lookup timed out across all providers.'
          : `All RDAP providers failed${lastStatus ? ` (last HTTP ${lastStatus})` : ''}.`,
      })
    }

    try {
      if (response.status === 404 || response.status === 410) {
        return Driver.domainAgeResult({
          host,
          rootDomain,
          status: 'not-found',
          checkedAt,
          message: Driver.domainAgeMessage('not-found', scanStatus),
        })
      }

      if (!response.ok) {
        return Driver.domainAgeResult({
          host,
          rootDomain,
          status: 'lookup-failed',
          checkedAt,
          message: `Domain age lookup failed with HTTP ${response.status}.`,
        })
      }

      const data = await response.json()
      const events = Array.isArray(data.events) ? data.events : []
      const registrationEvent = events.find(({ eventAction }) =>
        /registration|registered|created|creation/i.test(eventAction || '')
      )
      const updatedEvent = events.find(({ eventAction }) =>
        /last changed|last update|updated|changed/i.test(eventAction || '')
      )
      const expiryEvent = events.find(({ eventAction }) =>
        /expiration|expiry|expires/i.test(eventAction || '')
      )
      const registeredAt = registrationEvent?.eventDate || ''
      const updatedAt = updatedEvent?.eventDate || ''
      const expiresAt = expiryEvent?.eventDate || ''
      const registrar = Driver.rdapRegistrar(data)

      if (!registeredAt) {
        return Driver.domainAgeResult({
          host,
          rootDomain,
          status: 'no-registration-date',
          checkedAt,
          updatedAt,
          expiresAt,
          registrar,
          rdapStatus: Array.isArray(data.status) ? data.status : [],
          message: Driver.domainAgeMessage('no-registration-date', scanStatus),
        })
      }

      return Driver.domainAgeResult({
        host,
        rootDomain,
        status: 'found',
        checkedAt,
        registeredAt,
        updatedAt,
        expiresAt,
        registrar,
        rdapStatus: Array.isArray(data.status) ? data.status : [],
        age: Driver.domainAgeFromDate(registeredAt),
        message: 'Domain registration date found through public RDAP data.',
      })
    } catch (error) {
      return Driver.domainAgeResult({
        host,
        rootDomain,
        status: 'lookup-failed',
        checkedAt,
        message: Driver.domainAgeMessage('lookup-failed', scanStatus),
      })
    }
  },

  domainAgeResult(result) {
    return {
      host: result.host || '',
      rootDomain: result.rootDomain || '',
      status: result.status || 'unknown',
      checkedAt: result.checkedAt || new Date().toISOString(),
      registeredAt: result.registeredAt || '',
      updatedAt: result.updatedAt || '',
      expiresAt: result.expiresAt || '',
      registrar: result.registrar || '',
      rdapStatus: Array.isArray(result.rdapStatus) ? result.rdapStatus : [],
      age: result.age || null,
      message: result.message || '',
    }
  },

  domainAgeMessage(status, scanStatus = '') {
    if (status === 'not-found') {
      return /error|timeout|failed|unavailable/i.test(scanStatus)
        ? 'The website did not load and RDAP could not find this domain.'
        : 'RDAP could not find this domain. It may be inactive, unavailable, or unsupported.'
    }

    if (status === 'no-registration-date') {
      return 'The domain appears in RDAP, but the registry did not expose a registration date.'
    }

    return /error|timeout|failed|unavailable/i.test(scanStatus)
      ? 'The website scan had a problem, and domain age could not be confirmed.'
      : 'We could not check the domain age right now.'
  },

  domainAgeFromDate(value) {
    const start = new Date(value)

    if (Number.isNaN(start.getTime())) return null

    const now = new Date()
    let years = now.getUTCFullYear() - start.getUTCFullYear()
    let months = now.getUTCMonth() - start.getUTCMonth()

    if (now.getUTCDate() < start.getUTCDate()) months -= 1
    if (months < 0) {
      years -= 1
      months += 12
    }

    const totalMonths = Math.max(0, years * 12 + months)

    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      totalMonths,
    }
  },

  rdapRegistrar(data = {}) {
    const entities = Array.isArray(data.entities) ? data.entities : []
    const registrar = entities.find(({ roles }) =>
      Array.isArray(roles) && roles.includes('registrar')
    )
    const entries = Array.isArray(registrar?.vcardArray?.[1])
      ? registrar.vcardArray[1]
      : []
    const fn = entries.find(([key]) => key === 'fn')

    return fn?.[3] || ''
  },

  normaliseLookupHostname(hostname = '', websiteUrl = '') {
    const value = String(hostname || '').trim() || Driver.hostnameFromUrl(websiteUrl)

    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split(':')[0]
      .toLowerCase()
  },

  hostnameFromUrl(url = '') {
    try {
      return new URL(url).hostname || ''
    } catch (error) {
      return ''
    }
  },

  rootDomain(hostname = '') {
    const qualityDomain = globalThis.LeadLensQuality?.rootDomain?.(hostname)
    if (qualityDomain) return qualityDomain
    const host = String(hostname || '')
      .replace(/^www\./i, '')
      .toLowerCase()
    const labels = host.split('.').filter(Boolean)

    if (labels.length <= 2) return host

    const compoundSuffixes = new Set([
      'ac.bd',
      'co.bd',
      'com.au',
      'com.bd',
      'com.br',
      'com.cn',
      'com.eg',
      'com.hk',
      'com.mx',
      'com.my',
      'com.ng',
      'com.pk',
      'com.ph',
      'com.sa',
      'com.sg',
      'com.tr',
      'com.tw',
      'com.ua',
      'com.vn',
      'co.in',
      'co.jp',
      'co.kr',
      'co.nz',
      'co.uk',
      'co.za',
      'edu.bd',
      'gov.bd',
      'net.au',
      'net.bd',
      'org.bd',
      'org.uk',
    ])
    const suffix = labels.slice(-2).join('.')

    return compoundSuffixes.has(suffix)
      ? labels.slice(-3).join('.')
      : labels.slice(-2).join('.')
  },

  /**
   * Return resolved technology snapshot for a hostname.
   * @param {String} hostname
   */
  getStoredTechnologies(hostname) {
    const cache = Driver.cache?.hostnames?.[hostname]

    if (!cache?.detections?.length) return []

    return resolve(cache.detections)
      .filter(({ confidence }) => confidence >= 50)
      .filter(({ slug }) => slug !== 'cart-functionality')
      .map(({ name, version, confidence, categories, icon }) => ({
        name,
        version: version || '',
        confidence,
        icon,
        categories: (categories || []).map(({ id, name }) => ({ id, name })),
      }))
  },

  serialiseHostnameCache() {
    return Object.keys(Driver.cache?.hostnames || {})
      .sort((a, b) => Number(Driver.cache.hostnames[b]?.dateTime || 0) - Number(Driver.cache.hostnames[a]?.dateTime || 0))
      .slice(0, maxHostnames)
      .reduce((hostnames, hostname) => {
        const storedCache = Driver.cache.hostnames[hostname] || {}
        hostnames[hostname] = {
          ...storedCache,
          detections: (storedCache.detections || [])
            .filter(({ technology }) => technology)
            .map(({ technology: { name: technology }, pattern: { regex, confidence } = {}, version, rootPath, lastUrl }) => ({
              technology,
              pattern: { regex: regex?.source || '', confidence: Number(confidence || 0) },
              version,
              rootPath,
              lastUrl,
            })),
        }
        return hostnames
      }, {})
  },

  scheduleTransientStorePersist(delay = 1200) {
    clearTimeout(hostnameCacheSaveTimer)
    hostnameCacheSaveTimer = setTimeout(() => {
      hostnameCacheSaveTimer = null
      Driver.flushTransientStores().catch((error) => Driver.log(error, 'transient-store', 'error'))
    }, Math.max(250, Number(delay || 0)))
  },

  async flushTransientStores() {
    clearTimeout(hostnameCacheSaveTimer)
    clearTimeout(technologyHistorySaveTimer)
    hostnameCacheSaveTimer = null
    technologyHistorySaveTimer = null
    await setOption('hostnames', Driver.serialiseHostnameCache())
    if (Driver.technologyHistoryCache) {
      await setOption('technologyHistory', Driver.technologyHistoryCache)
    }
  },

  async releaseScanResources(url = '') {
    if (url === '*' || url === 'all') {
      activePageScans.clear()
      Driver.persistPageScanSessions()
      await Driver.flushTransientStores()
      const keys = Object.keys(Driver.cache?.hostnames || {})
      if (keys.length > 70) {
        const keep = new Set(keys.slice(-45))
        Driver.cache.hostnames = Object.fromEntries(
          Object.entries(Driver.cache.hostnames).filter(([hostname]) => keep.has(hostname))
        )
        await setOption('hostnames', Driver.serialiseHostnameCache())
      }
      return { ok: true, status: 'checkpoint-flushed' }
    }

    const hostname = Driver.normaliseScanHostname(url)
    if (!hostname) return { ok: false, status: 'invalid-url' }
    activePageScans.delete(hostname)
    Driver.persistPageScanSessions()
    // Contact and SEO evidence is already stored in durable per-host shards.
    // Debounce transient technology-cache writes so long queues do not block
    // the service worker after every completed website.
    Driver.scheduleTransientStorePersist(650)
    if (Object.keys(Driver.cache?.hostnames || {}).length > 70) {
      delete Driver.cache.hostnames[hostname]
      Driver.scheduleTransientStorePersist(400)
    }
    return { ok: true }
  },

  async trackTechnologyChanges(hostname, technologies = []) {
    if (!Driver.technologyHistoryCache) {
      Driver.technologyHistoryCache = await getOption('technologyHistory', {}) || {}
    }
    const history = Driver.technologyHistoryCache
    const currentNames = technologies
      .filter(({ confidence }) => confidence >= 50)
      .map(({ name }) => name)
      .sort()
    const previousNames = history[hostname]?.latest || []

    if (currentNames.join('|') === previousNames.join('|')) return

    const added = currentNames.filter((name) => !previousNames.includes(name))
    const removed = previousNames.filter((name) => !currentNames.includes(name))
    history[hostname] = {
      latest: currentNames,
      changes: added.length && removed.length
        ? (history[hostname]?.changes || [])
        : [
            { dateTime: new Date().toISOString(), added, removed },
            ...(history[hostname]?.changes || []),
          ].slice(0, 25),
    }

    clearTimeout(technologyHistorySaveTimer)
    technologyHistorySaveTimer = setTimeout(() => {
      technologyHistorySaveTimer = null
      Driver.flushTransientStores().catch((error) => Driver.log(error, 'technology-history', 'error'))
    }, 1200)
  },

  contactShardKey(hostname = '') {
    return `${CONTACT_SHARD_PREFIX}${String(hostname || '').trim().toLowerCase()}`
  },

  rejectedContactKey(hostname = '') {
    return `${REJECTED_CONTACT_PREFIX}${String(hostname || '').trim().toLowerCase()}`
  },


  contactSummaryKey(hostname = '') {
    return `${CONTACT_SUMMARY_PREFIX}${String(hostname || '').trim().toLowerCase()}`
  },

  seoAuditSummaryKey(hostname = '') {
    return `${SEO_SUMMARY_PREFIX}${String(hostname || '').trim().toLowerCase()}`
  },

  async initialiseContactSummaryCache() {
    if (Driver.contactSummaryCache) return Driver.contactSummaryCache
    const entries = await Utils.leadDbEntries(CONTACT_SUMMARY_PREFIX)
    const cache = {}
    Object.entries(entries || {}).forEach(([key, value]) => {
      const host = String(key).slice(CONTACT_SUMMARY_PREFIX.length).trim().toLowerCase()
      if (host && value && typeof value === 'object') cache[host] = value
    })

    // One-time compatibility migration from the older monolithic index.
    if (!Object.keys(cache).length) {
      const legacy = await getOption('contactSummaryIndex', {}) || {}
      for (const [host, summary] of Object.entries(legacy)) {
        if (!host || !summary) continue
        cache[host] = summary
        await Utils.leadDbSet(Driver.contactSummaryKey(host), summary)
      }
      if (Object.keys(legacy).length) await setOption('contactSummaryIndex', {})
    }

    Driver.contactSummaryCache = cache
    return cache
  },

  async writeContactHostSummary(hostname = '', summary = null) {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return
    const cache = await Driver.initialiseContactSummaryCache()
    if (summary) {
      cache[host] = summary
      await Utils.leadDbSet(Driver.contactSummaryKey(host), summary)
    } else {
      delete cache[host]
      await Utils.leadDbDelete(Driver.contactSummaryKey(host))
    }
  },

  async initialiseSeoSummaryCache() {
    if (Driver.seoSummaryCache) return Driver.seoSummaryCache
    const entries = await Utils.leadDbEntries(SEO_SUMMARY_PREFIX)
    const cache = {}
    Object.entries(entries || {}).forEach(([key, value]) => {
      const host = String(key).slice(SEO_SUMMARY_PREFIX.length).trim().toLowerCase()
      if (host && value && typeof value === 'object') cache[host] = value
    })
    if (!Object.keys(cache).length) {
      const legacy = await getOption('seoAuditSummaryIndex', {}) || {}
      for (const [host, summary] of Object.entries(legacy)) {
        if (!host || !summary) continue
        cache[host] = summary
        await Utils.leadDbSet(Driver.seoAuditSummaryKey(host), summary)
      }
      if (Object.keys(legacy).length) await setOption('seoAuditSummaryIndex', {})
    }
    Driver.seoSummaryCache = cache
    return cache
  },

  async writeSeoHostSummary(hostname = '', summary = null) {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return
    const cache = await Driver.initialiseSeoSummaryCache()
    if (summary) {
      cache[host] = summary
      await Utils.leadDbSet(Driver.seoAuditSummaryKey(host), summary)
    } else {
      delete cache[host]
      await Utils.leadDbDelete(Driver.seoAuditSummaryKey(host))
    }
  },

  safeDecode(value = '') {
    let text = String(value || '')
    try { text = decodeURIComponent(text) } catch (error) { /* Keep raw value. */ }
    return text
      .replace(/&amp;/gi, '&')
      .replace(/&quot;|&#34;|&#x22;/gi, '"')
      .replace(/&#39;|&#x27;/gi, "'")
      .replace(/\\u00(?:3c|3e|22|27|26)/gi, ' ')
      .replace(/[\u200B-\u200D\uFEFF\uFFFC\uFFFD]/g, ' ')
      .trim()
  },

  cleanEmailValue(value = '', siteHost = '') {
    const decoded = Driver.safeDecode(value).toLowerCase()
    if (/\?u00(?:3c|3e|22|27|26)|(?:^|[^a-z0-9])u00(?:3c|3e|22|27|26)/i.test(decoded)) return ''
    const matches = decoded.match(/[a-z0-9.!#$&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,24}/gi) || []
    const email = String(matches[matches.length - 1] || '').replace(/^[._-]+|[._-]+$/g, '')
    if (!email || email.length > 254 || /%|\.\.|[<>{}\[\]"\\]/.test(email)) return ''
    let [local = '', domain = ''] = email.split('@')
    const roleMatch = local.match(/(hello|info|contact|support|sales|admin|team|booking|bookings|reservation|reservations|events|office|frontdesk|service|customerservice|marketing)$/i)
    if (roleMatch && local !== roleMatch[1].toLowerCase()) local = roleMatch[1].toLowerCase()
    if (/\d{3,}[-_.]?\d{2,}/.test(local) && !roleMatch) return ''
    if (!local || local.length > 64 || !domain || !/^[a-z0-9.-]+\.[a-z]{2,24}$/i.test(domain)) return ''
    if (domain.split('.').some((part) => !part || part.length > 63 || /^-|-$/.test(part))) return ''
    if (/\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|pdf)$/i.test(domain)) return ''
    if (/^(?:sample|test|example|email|yourname|name|noreply|no-reply)$/i.test(local)) return ''
    if (/^(?:\d{3,}[-_.]?\d{2,}[a-z]|\d{4,}[a-z])/i.test(local)) return ''
    const labels = domain.split('.')
    const tld = labels[labels.length - 1] || ''
    const knownLongTlds = new Set([
      'com', 'org', 'net', 'edu', 'gov', 'mil', 'info', 'biz', 'name', 'mobi', 'pro', 'app', 'dev',
      'io', 'ai', 'co', 'me', 'tv', 'xyz', 'online', 'site', 'store', 'shop', 'cloud', 'tech', 'digital',
      'agency', 'company', 'email', 'services', 'solutions', 'restaurant', 'hotel', 'care', 'clinic', 'law',
      'travel', 'media', 'marketing', 'design', 'studio', 'space', 'world', 'live', 'news', 'today', 'life',
      'ca', 'uk', 'us', 'au', 'nz', 'in', 'bd', 'pk', 'sg', 'hk', 'za', 'ae', 'sa', 'fr', 'de', 'it',
      'es', 'nl', 'be', 'ch', 'se', 'no', 'dk', 'fi', 'ie', 'jp', 'kr', 'cn', 'br', 'mx', 'tr', 'vn',
      'ph', 'my', 'id', 'th', 'lk', 'np', 'ng', 'ke', 'gh', 'tz', 'ug', 'eg', 'ma', 'gr', 'pt', 'pl',
      'cz', 'sk', 'hu', 'ro', 'bg', 'hr', 'rs', 'si', 'at', 'ru', 'ua', 'am', 'ge', 'il', 'qa', 'kw'
    ])
    if (tld.length > 2 && !knownLongTlds.has(tld)) return ''
    if (/^(?:if|invalid|local|localhost)$/i.test(tld)) return ''
    if (/^(?:com|net|org|co|io|ai|info|biz)[a-z]{2,}$/i.test(tld)) return ''
    const hostRoot = Driver.rootDomain(siteHost)
    const emailRoot = Driver.rootDomain(domain)
    if (hostRoot && domain !== hostRoot && domain.startsWith(hostRoot)) return ''
    if (!emailRoot || /(?:example|test|invalid|localhost|spambreak)\./i.test(domain)) return ''
    const finalEmail = `${local}@${domain}`
    const checked = globalThis.LeadLensIntelligence?.emailCandidate?.(finalEmail, { siteHost, source: 'stored contact extraction' })
    if (checked && !checked.valid) return ''
    return finalEmail
  },

  cleanPhoneValue(value = '', source = '', context = '') {
    const decoded = Driver.safeDecode(value)
    const checked = globalThis.LeadLensIntelligence?.phoneCandidate?.(decoded, { source, context })
    if (checked && !checked.possible) return ''
    if (checked?.e164) return checked.e164
    if (checked?.national) return checked.national
    const raw = decoded.replace(/^tel:/i, '').split('?')[0].trim()
    const digits = raw.replace(/\D/g, '')
    if (!digits || digits.length < 7 || digits.length > 15) return ''
    return raw.startsWith('+') ? `+${digits}` : digits
  },

  normaliseSocialPlatform(platform = '', host = '') {
    const value = `${platform} ${host}`.toLowerCase()
    if (/^phone$/i.test(String(platform || '').trim()) || /^tel:/i.test(host)) return 'Phone'
    if (/whatsapp|wa\.me/.test(value)) return 'WhatsApp'
    if (/facebook|fb\.com/.test(value)) return 'Facebook'
    if (/instagram/.test(value)) return 'Instagram'
    if (/linkedin/.test(value)) return 'LinkedIn'
    if (/(?:twitter|^x$|x\.com)/.test(value)) return 'Twitter'
    if (/youtube|youtu\.be/.test(value)) return 'YouTube'
    if (/tiktok/.test(value)) return 'TikTok'
    if (/pinterest/.test(value)) return 'Pinterest'
    if (/telegram|t\.me/.test(value)) return 'Telegram'
    return platform || 'Social'
  },

  cleanSocialValue(platform = '', value = '', source = '') {
    const platformName = Driver.normaliseSocialPlatform(platform, value)
    if (/^phone$/i.test(platformName)) {
      const phone = Driver.cleanPhoneValue(value, source)
      return phone ? `tel:${phone}` : ''
    }
    const decoded = Driver.safeDecode(value)
      .replace(/\$(facebook|instagram|linkedin|twitter|x)\b/gi, '')
      .replace(/\$\{[^}]+\}|\{\{[^}]+\}\}/g, '')
      .split(/&quot;|&#34;|&#x22;|%7b|%7d|[{}<>"\\\s]/i)[0]
      .trim()
    if (!decoded || decoded.length > 350 || /\.svg(?:$|[?#])/i.test(decoded)) return ''
    const normalised = Driver.normalizeSocialUrl(decoded, platformName)
    if (!normalised || /&quot;|%7b|%7d|[{}<>"\\\s]/i.test(normalised)) return ''
    return normalised
  },

  sanitiseContactItem(item = {}, fallbackHost = '') {
    const websiteHost = String(item.websiteHost || fallbackHost || Driver.normaliseScanHostname(item.websiteUrl || '')).trim().toLowerCase()
    const type = item.type || (item.email ? 'email' : 'site')
    if (!websiteHost) return null
    if (type === 'email') {
      const value = Driver.cleanEmailValue(item.value || item.email || '', websiteHost)
      if (!value) return null
      return {
        ...item,
        id: `email:${value}`,
        type: 'email',
        value,
        email: value,
        emailDomain: value.split('@')[1] || '',
        emailKind: Driver.classifyEmailKind(value.split('@')[1] || '', websiteHost),
        websiteHost,
      }
    }
    if (type === 'phone' || item.phoneRecord || /^(?:phone|whatsapp)$/i.test(item.platform || '') || /^tel:/i.test(item.value || item.url || '')) {
      const cleaned = Driver.cleanPhoneValue(item.value || item.url || item.href || '', (item.sources || []).join(' '), item.context || item.nearbyText || '')
      if (!cleaned) return null
      const platform = Driver.normaliseSocialPlatform(item.platform || 'Phone', cleaned)
      const value = platform === 'WhatsApp' ? `https://wa.me/${cleaned.replace(/\D/g, '')}` : `tel:${cleaned}`
      return { ...item, id: `phone:${platform}:${cleaned.replace(/\D/g, '')}`, type: 'phone', value, url: /^tel:/i.test(value) ? value : '', platform, phoneRecord: true, websiteHost }
    }
    if (type === 'social') {
      const value = Driver.cleanSocialValue(item.platform || '', item.value || item.url || '', (item.sources || []).join(' '))
      if (!value) return null
      const platform = Driver.normaliseSocialPlatform(item.platform || '', value)
      return {
        ...item,
        id: `social:${platform}:${value.toLowerCase()}`,
        type: 'social',
        value,
        platform,
        websiteHost,
      }
    }
    return {
      ...item,
      id: item.id || `site:${websiteHost}`,
      type: 'site',
      value: item.value || item.websiteUrl || `https://${websiteHost}/`,
      websiteHost,
    }
  },

  compactContactItem(item = {}, includeTechnologies = false) {
    const compact = {
      id: item.id,
      type: item.type,
      value: item.value,
      email: item.email,
      emailDomain: item.emailDomain,
      emailKind: item.emailKind,
      platform: item.platform,
      websiteUrl: item.websiteUrl,
      websiteHost: item.websiteHost,
      pageTitle: item.pageTitle,
      foundAt: item.foundAt,
      lastSeenAt: item.lastSeenAt,
      foundCount: item.foundCount,
      status: item.status,
      sources: Array.isArray(item.sources) ? item.sources.slice(0, 4) : [],
      summaryOnly: true,
    }
    if (includeTechnologies) compact.technologies = Driver.technologySummary(item.technologies || [])
    return compact
  },

  buildContactHostSummary(hostname = '', stored = {}) {
    const cleanRows = Object.values(stored || {})
      .map((item) => Driver.sanitiseContactItem(item, hostname))
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastSeenAt || b.foundAt || 0) - new Date(a.lastSeenAt || a.foundAt || 0))
    if (!cleanRows.length) return null
    const siteRows = cleanRows.filter((item) => item.type === 'site').slice(0, 1)
    const emailRows = cleanRows.filter((item) => item.type === 'email').slice(0, 4)
    const socialPriority = (item = {}) => {
      const text = `${item.platform || ''} ${item.value || ''}`.toLowerCase()
      if (/linkedin/.test(text)) return 0
      if (/facebook/.test(text)) return 1
      if (/instagram/.test(text)) return 2
      if (/phone|^tel:/.test(text)) return 3
      if (/whatsapp/.test(text)) return 4
      return 5
    }
    const socialRows = cleanRows
      .filter((item) => item.type === 'social')
      .sort((a, b) => socialPriority(a) - socialPriority(b))
      .slice(0, 6)
    const phoneRows = cleanRows.filter((item) => item.type === 'phone').slice(0, 4)
    const representativeRows = [...siteRows, ...emailRows, ...socialRows, ...phoneRows]
    const summaryCounts = {
      total: cleanRows.length,
      emails: cleanRows.filter((item) => item.type === 'email').length,
      socials: cleanRows.filter((item) => item.type === 'social').length,
      phones: cleanRows.filter((item) => item.type === 'phone').length,
    }
    return {
      websiteHost: hostname,
      rows: representativeRows.map((item, index) => Driver.compactContactItem(item, index === 0)),
      summaryCounts,
      searchText: cleanRows
        .slice(0, 30)
        .flatMap((item) => [item.value, item.email, item.platform, item.pageTitle, ...(item.sources || [])])
        .filter(Boolean)
        .join(' ')
        .slice(0, 5000),
      updatedAt: cleanRows[0].lastSeenAt || cleanRows[0].foundAt || new Date().toISOString(),
    }
  },

  async rememberRejectedContacts(hostname = '', rejected = []) {
    if (!hostname || !rejected.length) return
    try {
      const key = Driver.rejectedContactKey(hostname)
      const existing = await Utils.leadDbGet(key) || []
      const now = new Date().toISOString()
      const merged = [...existing, ...rejected.map((item) => ({ ...item, rejectedAt: now }))]
        .slice(-250)
      await Utils.leadDbSet(key, merged)
    } catch (error) {
      Driver.log(error, 'rejected-contact-evidence', 'error')
    }
  },

  async ensureContactShards() {
    if (Driver.contactShardReady) return true
    if (Driver.contactShardPromise) return Driver.contactShardPromise
    Driver.contactShardPromise = (async () => {
      let index = await getOption('contactSummaryIndex', {})
      if (index && Object.keys(index).length) {
        Driver.contactShardReady = true
        return true
      }
      const legacyStored = await getOption('contactItems', {})
      const legacyEmails = await getOption('contactEmails', {})
      const merged = { ...(legacyStored || {}) }
      Object.values(legacyEmails || {}).forEach((item = {}) => {
        const value = item.email || item.value
        if (value && !merged[`email:${String(value).toLowerCase()}`]) merged[`email:${String(value).toLowerCase()}`] = item
      })
      const grouped = {}
      const rejected = {}
      Object.values(merged).forEach((item = {}) => {
        const host = String(item.websiteHost || Driver.normaliseScanHostname(item.websiteUrl || '')).trim().toLowerCase()
        if (!host) return
        const clean = Driver.sanitiseContactItem(item, host)
        if (!clean) {
          rejected[host] ||= []
          rejected[host].push({ value: item.value || item.email || item.url || '', type: item.type || '', reason: 'Rejected during shard migration' })
          return
        }
        grouped[host] ||= {}
        grouped[host][clean.id] = clean
      })
      index = {}
      for (const [host, shard] of Object.entries(grouped)) {
        await Utils.leadDbSet(Driver.contactShardKey(host), shard)
        const summary = Driver.buildContactHostSummary(host, shard)
        if (summary) index[host] = summary
      }
      for (const [host, items] of Object.entries(rejected)) await Driver.rememberRejectedContacts(host, items)
      await setOption('contactSummaryIndex', index)
      await Utils.leadDbDelete('contactItems')
      await Utils.leadDbDelete('contactEmails')
      await Utils.rawLocalRemove(['contactItems', 'contactEmails'])
      await setOption('contactShardMigrationVersion', CONTACT_SHARD_VERSION)
      Driver.contactShardReady = true
      return true
    })().finally(() => { Driver.contactShardPromise = null })
    return Driver.contactShardPromise
  },

  async getContactSummaryIndex() {
    await Driver.ensureContactShards()
    return Driver.initialiseContactSummaryCache()
  },

  async getContactShard(hostname = '') {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return {}
    await Driver.ensureContactShards()
    return await Utils.leadDbGet(Driver.contactShardKey(host)) || {}
  },

  async saveContactShard(hostname = '', stored = {}) {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return
    const clean = {}
    const rejected = []
    Object.values(stored || {}).forEach((item = {}) => {
      const next = Driver.sanitiseContactItem(item, host)
      if (!next) {
        rejected.push({ value: item.value || item.email || item.url || '', type: item.type || '', reason: 'Rejected by contact cleaner' })
        return
      }
      clean[next.id] = next
    })
    if (Object.keys(clean).length) {
      await Utils.leadDbSet(Driver.contactShardKey(host), clean)
      await Driver.writeContactHostSummary(host, Driver.buildContactHostSummary(host, clean))
    } else {
      await Utils.leadDbDelete(Driver.contactShardKey(host))
      await Driver.writeContactHostSummary(host, null)
    }
    await Driver.rememberRejectedContacts(host, rejected)
  },

  async deleteContactShard(hostname = '') {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return
    await Driver.getContactSummaryIndex()
    await Utils.leadDbDelete(Driver.contactShardKey(host))
    await Utils.leadDbDelete(Driver.rejectedContactKey(host))
    await Driver.writeContactHostSummary(host, null)
  },

  async replaceAllContactShards(stored = {}) {
    const previous = await Driver.getContactSummaryIndex()
    const grouped = {}
    Object.values(stored || {}).forEach((item = {}) => {
      const host = String(item.websiteHost || Driver.normaliseScanHostname(item.websiteUrl || '')).trim().toLowerCase()
      if (!host) return
      const clean = Driver.sanitiseContactItem(item, host)
      if (!clean) return
      grouped[host] ||= {}
      grouped[host][clean.id] = clean
    })
    for (const host of Object.keys(previous || {})) {
      if (!grouped[host]) {
        await Utils.leadDbDelete(Driver.contactShardKey(host))
        await Driver.writeContactHostSummary(host, null)
      }
    }
    for (const [host, shard] of Object.entries(grouped)) {
      await Utils.leadDbSet(Driver.contactShardKey(host), shard)
      await Driver.writeContactHostSummary(host, Driver.buildContactHostSummary(host, shard))
    }
    await Utils.leadDbDelete('contactItems')
    await Utils.leadDbDelete('contactEmails')
    await Utils.rawLocalRemove(['contactItems', 'contactEmails'])
  },

  /**
   * Return the contact store with legacy email data migrated into per-host shards.
   * Full data is assembled only for explicit export/cleanup actions.
   */
  async getStoredContacts() {
    const index = await Driver.getContactSummaryIndex()
    const result = {}
    const hosts = Object.keys(index || {})
    for (let offset = 0; offset < hosts.length; offset += 20) {
      const batch = hosts.slice(offset, offset + 20)
      const shards = await Promise.all(batch.map((host) => Driver.getContactShard(host)))
      shards.forEach((shard) => Object.assign(result, shard || {}))
    }
    return result
  },


  classifyEmailKind(emailDomain = '', siteHost = '') {
    const emailRoot = Driver.rootDomain(emailDomain)
    const hostRoot = Driver.rootDomain(siteHost)
    const personalEmailRoots = new Set([
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'icloud.com',
      'proton.me',
      'protonmail.com',
      'aol.com',
    ])

    if (!emailRoot) return 'direct'
    if (personalEmailRoots.has(emailRoot)) return 'personal'
    if (emailRoot && hostRoot && emailRoot === hostRoot) return 'direct'
    if (emailRoot && hostRoot && Driver.relatedEmailDomain(emailRoot, hostRoot)) {
      return 'related-domain'
    }

    return 'platform'
  },

  relatedEmailDomain(emailDomain = '', siteDomain = '') {
    const tokens = (domain) =>
      String(domain || '')
        .split('.')[0]
        .replace(/[^a-z0-9]/gi, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 4)
    const emailTokens = tokens(emailDomain)
    const siteTokens = tokens(siteDomain)

    return emailTokens.some((emailToken) =>
      siteTokens.some(
        (siteToken) =>
          emailToken.includes(siteToken) ||
          siteToken.includes(emailToken) ||
          Driver.levenshtein(emailToken, siteToken) <= 2
      )
    )
  },

  levenshtein(a = '', b = '') {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i])

    for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j

    for (let i = 1; i <= b.length; i += 1) {
      for (let j = 1; j <= a.length; j += 1) {
        matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            )
      }
    }

    return matrix[b.length][a.length]
  },

  /**
   * Keep email validation local. External DNS validation is intentionally disabled.
   * @param {Array} emails
   */
  async validateEmails(emails = []) {
    // This is a local quality check, not a deliverability/MX verification.
    // It prevents misleading "verified email" behavior while still giving
    // the UI/export a dependable confidence signal.
    const disposableDomains = new Set(['example.com', 'test.com', 'mailinator.com'])

    return emails.map((email) => {
      const value = String(email || '').trim().toLowerCase()
      const domain = value.split('@')[1] || ''
      const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
      const disposable = disposableDomains.has(domain)

      return {
        email: value,
        validFormat,
        disposable,
        confidence: validFormat && !disposable ? 'medium' : 'low',
        verified: false,
      }
    })
  },

  seoAuditShardKey(hostname = '') {
    return `${SEO_AUDIT_PREFIX}${String(hostname || '').trim().toLowerCase()}`
  },

  async ensureSeoAuditShards() {
    if (Driver.seoAuditShardReady) return true
    if (Driver.seoAuditShardPromise) return Driver.seoAuditShardPromise
    Driver.seoAuditShardPromise = (async () => {
      let index = await getOption('seoAuditSummaryIndex', {})
      if (index && Object.keys(index).length) {
        Driver.seoAuditShardReady = true
        return true
      }
      const legacy = await getOption('seoAudits', {})
      index = {}
      for (const [host, audit] of Object.entries(legacy || {})) {
        if (!host || !audit || typeof audit !== 'object') continue
        await Utils.leadDbSet(Driver.seoAuditShardKey(host), audit)
        index[host] = Driver.seoAuditSummary(audit)
      }
      await setOption('seoAuditSummaryIndex', index)
      await Utils.leadDbDelete('seoAudits')
      await Utils.rawLocalRemove('seoAudits')
      Driver.seoAuditShardReady = true
      return true
    })().finally(() => { Driver.seoAuditShardPromise = null })
    return Driver.seoAuditShardPromise
  },

  async getSeoAuditSummaryIndex() {
    await Driver.ensureSeoAuditShards()
    return Driver.initialiseSeoSummaryCache()
  },

  async getSeoAuditShard(hostname = '') {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return null
    await Driver.ensureSeoAuditShards()
    return await Utils.leadDbGet(Driver.seoAuditShardKey(host)) || null
  },

  async saveSeoAuditShard(hostname = '', audit = {}) {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return
    await Driver.getSeoAuditSummaryIndex()
    await Utils.leadDbSet(Driver.seoAuditShardKey(host), audit)
    await Driver.writeSeoHostSummary(host, Driver.seoAuditSummary(audit))
  },

  async deleteSeoAuditShard(hostname = '') {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return
    await Driver.getSeoAuditSummaryIndex()
    await Utils.leadDbDelete(Driver.seoAuditShardKey(host))
    await Driver.writeSeoHostSummary(host, null)
  },

  async repairShardIndexes() {
    await Driver.ensureContactShards()
    await Driver.ensureSeoAuditShards()

    const [contactEntries, seoEntries, contactSummaryEntries, seoSummaryEntries] = await Promise.all([
      Utils.leadDbEntries(CONTACT_SHARD_PREFIX),
      Utils.leadDbEntries(SEO_AUDIT_PREFIX),
      Utils.leadDbEntries(CONTACT_SUMMARY_PREFIX),
      Utils.leadDbEntries(SEO_SUMMARY_PREFIX),
    ])

    const contactHosts = new Set()
    const seoHosts = new Set()
    let contactRepairs = 0
    let seoRepairs = 0
    Driver.contactSummaryCache = {}
    Driver.seoSummaryCache = {}

    for (const [key, shard] of Object.entries(contactEntries || {})) {
      const host = String(key).slice(CONTACT_SHARD_PREFIX.length).trim().toLowerCase()
      if (!host) continue
      contactHosts.add(host)
      const summary = Driver.buildContactHostSummary(host, shard)
      if (!summary) continue
      await Driver.writeContactHostSummary(host, summary)
      contactRepairs += 1
    }
    for (const key of Object.keys(contactSummaryEntries || {})) {
      const host = String(key).slice(CONTACT_SUMMARY_PREFIX.length).trim().toLowerCase()
      if (host && !contactHosts.has(host)) await Utils.leadDbDelete(key)
    }

    for (const [key, audit] of Object.entries(seoEntries || {})) {
      const host = String(key).slice(SEO_AUDIT_PREFIX.length).trim().toLowerCase()
      if (!host || !audit || typeof audit !== 'object') continue
      seoHosts.add(host)
      await Driver.writeSeoHostSummary(host, Driver.seoAuditSummary(audit))
      seoRepairs += 1
    }
    for (const key of Object.keys(seoSummaryEntries || {})) {
      const host = String(key).slice(SEO_SUMMARY_PREFIX.length).trim().toLowerCase()
      if (host && !seoHosts.has(host)) await Utils.leadDbDelete(key)
    }

    await Promise.all([
      setOption('contactSummaryIndex', {}),
      setOption('seoAuditSummaryIndex', {}),
    ])

    return { contactRepairs, seoRepairs }
  },

  seoAuditSummary(audit = null) {
    if (!audit || typeof audit !== 'object') return null
    const raw = audit.rawEvidence && typeof audit.rawEvidence === 'object'
      ? audit.rawEvidence
      : {}
    const nav = audit.navTiming && typeof audit.navTiming === 'object'
      ? audit.navTiming
      : raw.navTiming && typeof raw.navTiming === 'object'
      ? raw.navTiming
      : {}

    return {
      score: audit.score ?? null,
      issues: Array.isArray(audit.issues) ? audit.issues.slice(0, 40) : [],
      title: audit.title || raw.title || '',
      descriptionLength: audit.descriptionLength ?? raw.descriptionLength ?? 0,
      wordCount: audit.wordCount ?? raw.wordCount ?? 0,
      internalLinks: audit.internalLinks ?? raw.internalLinks ?? 0,
      externalLinks: audit.externalLinks ?? raw.externalLinks ?? 0,
      images: audit.images ?? raw.images ?? 0,
      imagesWithAlt: audit.imagesWithAlt ?? raw.imagesWithAlt ?? 0,
      brokenImages: audit.brokenImages ?? raw.brokenImages ?? 0,
      scriptCount: audit.scriptCount ?? raw.scriptCount ?? 0,
      stylesheetCount: audit.stylesheetCount ?? raw.stylesheetCount ?? 0,
      resources: audit.resources ?? raw.resources ?? 0,
      mobileOverflow: Boolean(audit.mobileOverflow ?? raw.mobileOverflow),
      contactForms: audit.contactForms ?? raw.contactForms ?? 0,
      contactPageLinks: audit.contactPageLinks ?? raw.contactPageLinks ?? 0,
      bookingPageLinks: audit.bookingPageLinks ?? raw.bookingPageLinks ?? 0,
      trustPageLinks: audit.trustPageLinks ?? raw.trustPageLinks ?? 0,
      addressSignals: audit.addressSignals ?? raw.addressSignals ?? 0,
      mapSignals: audit.mapSignals ?? raw.mapSignals ?? 0,
      openingHourSignals: audit.openingHourSignals ?? raw.openingHourSignals ?? 0,
      hasLocalBusinessSchema: Boolean(audit.hasLocalBusinessSchema ?? raw.hasLocalBusinessSchema),
      firstContentfulPaint: audit.firstContentfulPaint ?? raw.firstContentfulPaint ?? null,
      largestContentfulPaint: audit.largestContentfulPaint ?? raw.largestContentfulPaint ?? null,
      cumulativeLayoutShift: audit.cumulativeLayoutShift ?? raw.cumulativeLayoutShift ?? null,
      navTiming: {
        ttfb: nav.ttfb ?? null,
        load: nav.load ?? nav.loadDuration ?? null,
        domContentLoaded: nav.domContentLoaded ?? null,
      },
      pageTextPreview: String(audit.pageTextPreview || raw.pageTextPreview || '').slice(0, 1600),
      rawTextChunks: (audit.rawTextChunks && typeof audit.rawTextChunks === 'object')
        ? audit.rawTextChunks
        : (raw.rawTextChunks && typeof raw.rawTextChunks === 'object' ? raw.rawTextChunks : {}),
      evidenceCoverage: raw.evidenceCoverage && typeof raw.evidenceCoverage === 'object' ? raw.evidenceCoverage : null,
      mainContentSummary: raw.mainContent && typeof raw.mainContent === 'object'
        ? { title: raw.mainContent.title || '', excerpt: String(raw.mainContent.excerpt || '').slice(0, 500), wordCount: raw.mainContent.wordCount || 0, source: raw.mainContent.source || '' }
        : null,
      accessibilitySummary: raw.accessibilityAudit && typeof raw.accessibilityAudit === 'object'
        ? { engine: raw.accessibilityAudit.engine || '', issueCount: raw.accessibilityAudit.issueCount || 0, issues: Array.isArray(raw.accessibilityAudit.issues) ? raw.accessibilityAudit.issues.slice(0, 12) : [] }
        : null,
      explicitPageSignals: raw.explicitPageSignals && typeof raw.explicitPageSignals === 'object'
        ? { policyLinks: Array.isArray(raw.explicitPageSignals.policyLinks) ? raw.explicitPageSignals.policyLinks.slice(0, 20) : [], explicitOfferings: Array.isArray(raw.explicitPageSignals.explicitOfferings) ? raw.explicitPageSignals.explicitOfferings.slice(0, 20) : [], languages: Array.isArray(raw.explicitPageSignals.languages) ? raw.explicitPageSignals.languages.slice(0, 20) : [] }
        : null,
      summaryOnly: true,
    }
  },

  technologySummary(technologies = []) {
    return (Array.isArray(technologies) ? technologies : [])
      .slice(0, 60)
      .map(({ name = '', version = '', confidence = 0, categories = [] } = {}) => ({
        name,
        version,
        confidence,
        categories: Array.isArray(categories)
          ? categories.slice(0, 6).map(({ id, name } = {}) => ({ id, name }))
          : [],
      }))
      .filter(({ name }) => name)
  },

  /**
   * Return lightweight contact rows for the Lead Vault index. Heavy SEO evidence,
   * technology history, and raw page data are loaded only when a lead card opens.
   */
  async getContactSummaries() {
    const index = await Driver.getContactSummaryIndex()
    const leadMeta = await getOption('leadMeta', {})
    const seoAuditSummaries = await Driver.getSeoAuditSummaryIndex()
    const domainAgeLookups = await getOption('domainAgeLookups', {})

    return Object.values(index || {})
      .map((summary = {}) => {
        const rows = Array.isArray(summary.rows) ? summary.rows : []
        const representative = rows.find((item) => item.type === 'site') || rows[0]
        if (!representative) return null
        const technologyRow = rows.find((item) => Array.isArray(item.technologies) && item.technologies.length) || representative
        const host = representative.websiteHost || summary.websiteHost || ''
        return {
          ...representative,
          websiteHost: host,
          summaryCounts: summary.summaryCounts || {},
          summarySearch: summary.searchText || '',
          technologies: Driver.technologySummary(technologyRow.technologies || []),
          leadMeta: leadMeta[host] || {},
          technologyHistory: { latest: [], changes: [] },
          seoAudit: seoAuditSummaries[host] || null,
          domainAge: Driver.resolveDomainAgeLookup(host, representative.websiteUrl, domainAgeLookups),
          summaryOnly: true,
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastSeenAt || b.foundAt || 0) - new Date(a.lastSeenAt || a.foundAt || 0))
  },

  /** Load complete evidence for one lead only when its card is expanded. */
  async getLeadDetails(hostname = '') {
    const host = String(hostname || '').trim().toLowerCase()
    if (!host) return []
    const stored = await Driver.getContactShard(host)
    const leadMeta = await getOption('leadMeta', {})
    const technologyHistory = await getOption('technologyHistory', {})
    const seoAudit = await Driver.getSeoAuditShard(host)
    const domainAgeLookups = await getOption('domainAgeLookups', {})
    return Object.values(stored || {}).map((item) => ({
      ...item,
      technologies: Driver.getStoredTechnologies(item.websiteHost).length ? Driver.getStoredTechnologies(item.websiteHost) : item.technologies || [],
      leadMeta: leadMeta[item.websiteHost] || {},
      technologyHistory: technologyHistory[item.websiteHost] || { latest: [], changes: [] },
      seoAudit,
      domainAge: Driver.resolveDomainAgeLookup(item.websiteHost, item.websiteUrl, domainAgeLookups),
      summaryOnly: false,
    })).sort((a, b) => new Date(b.foundAt || 0) - new Date(a.foundAt || 0))
  },

  async getLeadDetailsBatch(hostnames = []) {
    const wanted = [...new Set((Array.isArray(hostnames) ? hostnames : []).map((hostname) => String(hostname || '').trim().toLowerCase()).filter(Boolean))]
    if (!wanted.length) return []
    const batches = await Promise.all(wanted.map((host) => Driver.getLeadDetails(host)))
    return batches.flat().sort((a, b) => new Date(b.foundAt || 0) - new Date(a.foundAt || 0))
  },

  /** Return all stored contacts only for explicit backup/export actions. */
  async getContacts() {
    const index = await Driver.getContactSummaryIndex()
    const hosts = Object.keys(index || {})
    const rows = []
    for (let offset = 0; offset < hosts.length; offset += 20) {
      const batch = await Promise.all(hosts.slice(offset, offset + 20).map((host) => Driver.getLeadDetails(host)))
      rows.push(...batch.flat())
    }
    return rows.sort((a, b) => new Date(b.foundAt || 0) - new Date(a.foundAt || 0))
  },

  /**
   * Clear all stored contacts.
   */
  async clearContacts() {
    const [index, seoIndex] = await Promise.all([
      Driver.getContactSummaryIndex(),
      Driver.getSeoAuditSummaryIndex(),
    ])
    const hosts = [...new Set([
      ...Object.keys(index || {}),
      ...Object.keys(seoIndex || {}),
    ])]
    for (let offset = 0; offset < hosts.length; offset += 40) {
      await Promise.all(hosts.slice(offset, offset + 40).flatMap((host) => [
        Utils.leadDbDelete(Driver.contactShardKey(host)),
        Utils.leadDbDelete(Driver.rejectedContactKey(host)),
        Utils.leadDbDelete(Driver.seoAuditShardKey(host)),
      ]))
    }
    const [contactSummaryEntries, seoSummaryEntries] = await Promise.all([
      Utils.leadDbEntries(CONTACT_SUMMARY_PREFIX),
      Utils.leadDbEntries(SEO_SUMMARY_PREFIX),
    ])
    await Promise.all([
      ...Object.keys(contactSummaryEntries || {}).map((key) => Utils.leadDbDelete(key)),
      ...Object.keys(seoSummaryEntries || {}).map((key) => Utils.leadDbDelete(key)),
    ])
    Driver.contactSummaryCache = {}
    Driver.seoSummaryCache = {}
    await setOption('contactSummaryIndex', {})
    await setOption('seoAuditSummaryIndex', {})
    await Utils.leadDbDelete('contactItems')
    await Utils.leadDbDelete('contactEmails')
    await Utils.rawLocalRemove(['contactItems', 'contactEmails'])
    await setOption('domainAgeLookups', {})
    await setOption('leadMeta', {})
    await setOption('technologyHistory', {})
    await Utils.leadDbDelete('seoAudits')
    await Utils.rawLocalRemove('seoAudits')
    await setOption('hostnames', {})
  },


  async resetSystem() {
    await Utils.resetAllData()
    activePageScans.clear()
    Driver.persistPageScanSessions()
    xhrAnalyzed = {}
    Driver.cache = { hostnames: {}, robots: {}, ads: [] }
    Driver.technologyHistoryCache = {}

    try {
      chrome.action.setBadgeText({ text: '' }, () => {})
    } catch (error) {
      // Ignore badge reset failures.
    }

    try {
      chrome.runtime.sendMessage({ type: 'leadLensSystemReset' }, () => {
        void chrome.runtime.lastError
      })
    } catch (error) {
      // Ignore pages that are already closing.
    }

    return { ok: true }
  },

  async updateLeadMeta(hostname, meta = {}) {
    const leadMeta = await getOption('leadMeta', {})

    leadMeta[hostname] = {
      ...(leadMeta[hostname] || {}),
      ...meta,
    }

    await setOption('leadMeta', leadMeta)
  },

  async deleteLead(hostname) {
    await Driver.deleteContactShard(hostname)
    await Driver.deleteSeoAuditShard(hostname)
    const leadMeta = await getOption('leadMeta', {})
    const technologyHistory = await getOption('technologyHistory', {})
    const domainAgeLookups = await getOption('domainAgeLookups', {})
    delete leadMeta[hostname]
    delete technologyHistory[hostname]
    if (Driver.technologyHistoryCache) delete Driver.technologyHistoryCache[hostname]
    const host = Driver.normaliseLookupHostname(hostname)
    const rootDomain = Driver.rootDomain(host)
    Driver.domainLookupKeys(host, rootDomain).forEach((key) => { delete domainAgeLookups[key] })
    const hostnames = await getOption('hostnames', {})
    delete hostnames[hostname]
    delete hostnames[host]
    await setOption('leadMeta', leadMeta)
    await setOption('technologyHistory', technologyHistory)
    await setOption('domainAgeLookups', domainAgeLookups)
    await setOption('hostnames', hostnames)
  },

  async cleanupOldLeads(days) {
    const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000
    const index = await Driver.getContactSummaryIndex()
    const hosts = Object.entries(index || {})
      .filter(([, summary = {}]) => new Date(summary.updatedAt || 0).getTime() < cutoff)
      .map(([host]) => host)
    for (const host of hosts) await Driver.deleteLead(host)
    return { removed: hosts.length }
  },

  normalizeSocialUrl(url = '', platform = '') {
    try {
      const decoded = Driver.safeDecode(url)
        .replace(/\$(facebook|instagram|linkedin|twitter|x)\b/gi, '')
        .replace(/\$\{[^}]+\}|\{\{[^}]+\}\}/g, '')
        .trim()
      if (!decoded || decoded.length > 350 || /&quot;|%7b|%7d|[{}<>"\\\s]/i.test(decoded)) return ''
      const parsed = new URL(decoded)
      if (!/^https?:$/.test(parsed.protocol)) return ''
      let host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
      const parts = parsed.pathname.split('/').filter(Boolean)
      const lowerParts = parts.map((part) => part.toLowerCase())
      const rejectPath = (...tokens) => lowerParts.some((part) => tokens.includes(part))
      parsed.hash = ''
      const originalSearch = parsed.search
      ;[...parsed.searchParams.keys()].forEach((key) => parsed.searchParams.delete(key))

      if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com') {
        if (!parts.length || rejectPath('share', 'sharer', 'sharer.php', 'dialog', 'login', 'watch', 'reel', 'reels', 'story', 'stories', 'posts', 'videos', 'groups', 'events', 'marketplace', 'photo', 'photos', 'permalink.php')) return ''
        host = 'facebook.com'
        parsed.hostname = host
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'instagram.com') {
        if (!parts.length || rejectPath('p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts', 'share')) return ''
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'twitter.com' || host === 'x.com') {
        if (!parts.length || rejectPath('status', 'statuses', 'search', 'intent', 'share', 'home', 'i', 'hashtag', 'compose')) return ''
        parsed.hostname = 'twitter.com'
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'linkedin.com') {
        if (parts.length < 2 || !['company', 'in', 'school', 'showcase'].includes(lowerParts[0])) return ''
        parsed.pathname = `/${parts[0]}/${parts[1]}`
      } else if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (!parts.length || rejectPath('watch', 'shorts', 'playlist', 'results', 'embed', 'live')) return ''
        parsed.hostname = 'youtube.com'
        if (parts[0].startsWith('@')) parsed.pathname = `/${parts[0]}`
        else if (['channel', 'c', 'user'].includes(lowerParts[0]) && parts[1]) parsed.pathname = `/${parts[0]}/${parts[1]}`
        else return ''
      } else if (host === 'tiktok.com') {
        if (!parts.length || !parts[0].startsWith('@') || rejectPath('video')) return ''
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'pinterest.com') {
        if (!parts.length || rejectPath('pin', 'ideas', 'search')) return ''
        parsed.pathname = `/${parts[0]}`
      } else if (host === 't.me' || host === 'telegram.me') {
        if (!parts.length || rejectPath('share', 'joinchat')) return ''
        parsed.hostname = 't.me'
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'whatsapp.com') {
        const digits = `${parsed.pathname}${originalSearch}`.replace(/\D/g, '')
        if (digits.length < 7 || digits.length > 15) return ''
        parsed.hostname = 'wa.me'
        parsed.pathname = `/${digits}`
      } else {
        return ''
      }

      if (/\.svg(?:$|[?#])/i.test(parsed.pathname)) return ''
      parsed.search = ''
      return parsed.toString().replace(/\/$/, '')
    } catch (error) {
      return ''
    }
  },

  async normalizeStoredContacts() {
    const stored = await Driver.getStoredContacts()
    const next = {}
    let changed = 0

    Object.values(stored).forEach((item) => {
      const normalised =
        item.type === 'social'
          ? {
              ...item,
              value: Driver.cleanSocialValue(item.platform || '', item.value || item.url || '', (item.sources || []).join(' ')),
            }
          : item
      const key =
        normalised.type === 'social'
          ? `social:${normalised.platform || 'Social'}:${String(normalised.value || '').toLowerCase()}`
          : normalised.id || `${normalised.type}:${normalised.value || normalised.email}`

      if (!normalised.value || !key) return

      if (next[key]) {
        next[key] = {
          ...next[key],
          sources: [
            ...new Set([
              ...(next[key].sources || []),
              ...(normalised.sources || []),
            ]),
          ],
          foundCount:
            Number(next[key].foundCount || 1) + Number(normalised.foundCount || 1),
          lastSeenAt:
            new Date(normalised.lastSeenAt || normalised.foundAt || 0) >
            new Date(next[key].lastSeenAt || next[key].foundAt || 0)
              ? normalised.lastSeenAt || normalised.foundAt
              : next[key].lastSeenAt,
        }
        changed += 1
      } else {
        next[key] = {
          ...normalised,
          id: key,
        }
      }

      if (item.id !== key || item.value !== normalised.value) changed += 1
    })

    await Driver.replaceAllContactShards(next)

    return {
      changed,
      total: Object.keys(next).length,
    }
  },

  async applyRetentionCleanup() {
    const days = await getOption('cleanupDays', '')

    if (days) {
      await Driver.cleanupOldLeads(days)
    }
  },

  /**
   * Delete one stored contact.
   * @param {String} id
   */
  async deleteContact(id, hostname = '') {
    let host = String(hostname || '').trim().toLowerCase()
    let stored = host ? await Driver.getContactShard(host) : null

    if (!stored || !stored[id]) {
      const index = await Driver.getContactSummaryIndex()
      host = Object.keys(index || {}).find((candidate) => (index[candidate]?.rows || []).some((row) => row.id === id)) || ''
      stored = host ? await Driver.getContactShard(host) : null
    }

    if (!stored || !stored[id]) {
      const shards = await Utils.leadDbEntries(CONTACT_SHARD_PREFIX)
      const match = Object.entries(shards || {}).find(([, shard]) => shard && shard[id])
      if (match) {
        host = String(match[0]).slice(CONTACT_SHARD_PREFIX.length).trim().toLowerCase()
        stored = match[1]
      }
    }

    if (!host || !stored || !stored[id]) return { removed: false }
    delete stored[id]
    await Driver.saveContactShard(host, stored)
    return { removed: true, host }
  },

  /**
   * External analytics are disabled in this Qrinux build.
   */
  async ping() {
    return false
  },
}

chrome.action.setBadgeBackgroundColor({ color: '#1A73E8' }, () => {})

chrome.webRequest.onCompleted.addListener(
  Driver.onWebRequestComplete,
  { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
  ['responseHeaders']
)

chrome.webRequest.onCompleted.addListener(Driver.onScriptRequestComplete, {
  urls: ['http://*/*', 'https://*/*'],
  types: ['script'],
})

chrome.webRequest.onCompleted.addListener(Driver.onXhrRequestComplete, {
  urls: ['http://*/*', 'https://*/*'],
  types: ['xmlhttprequest'],
})

chrome.tabs.onUpdated.addListener(async (id, { status, url }) => {
  if (status === 'complete') {
    ;({ url } = await promisify(chrome.tabs, 'get', id))
  }

  if (url) {
    const { hostname } = new URL(url)

    const showCached = await getOption('showCached', true)

    const cache = Driver.cache?.hostnames?.[hostname]

    const resolved = (cache ? resolve(cache.detections) : []).filter(
      ({ lastUrl }) => showCached || isSimilarUrl(url, lastUrl)
    )

    await Driver.setIcon(url, resolved)
  }
})

// Enable messaging between scripts
chrome.runtime.onMessage.addListener(Driver.onMessage)

Utils.withTimeout(Driver.init(), 14000, 'LeadLens background initialization timed out').catch((error) => {
  Driver.error(error)
  Driver.cache = Driver.cache || { hostnames: {}, robots: {}, ads: [] }
  settleDriverInit()
})
