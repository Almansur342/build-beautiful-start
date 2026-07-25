'use strict'
/* eslint-env browser */
/* globals chrome, indexedDB, navigator */

// Manifest v2 polyfill
if (chrome.runtime.getManifest().manifest_version === 2) {
  chrome.action = chrome.browserAction
}

// eslint-disable-next-line no-unused-vars
const Utils = {
  agent: chrome.runtime.getURL('/').startsWith('moz-')
    ? 'firefox'
    : chrome.runtime.getURL('/').startsWith('safari-')
    ? 'safari'
    : 'chrome',

  leadDb: null,
  leadDbName: 'qrinux-leadlens-browser-db',
  leadDbStore: 'kv',
  leadDbKeys: new Set([
    'contactItems',
    'contactEmails',
    'domainAgeLookups',
    'leadMeta',
    'technologyHistory',
    'seoAudits',
    'hostnames',
    'contactSummaryIndex',
    'seoAuditSummaryIndex',
    'bulkDraftText',
    'bulkResumeState',
  ]),

  withTimeout(promise, delay = 12000, message = 'Operation timed out') {
    let timeoutId

    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), delay)
    })

    return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId)
    })
  },

  /** Use promises instead of callbacks. */
  promisify(context, method, ...args) {
    return new Promise((resolve, reject) => {
      context[method](...args, (...callbackArgs) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }

        resolve(...callbackArgs)
      })
    })
  },

  /** Open a browser tab. */
  open(url, active = true) {
    chrome.tabs.create({ url, active })
  },

  async openLeadDb() {
    if (Utils.leadDb) return Utils.leadDb
    if (typeof indexedDB === 'undefined') return null

    try {
      Utils.leadDb = await Utils.withTimeout(new Promise((resolve, reject) => {
      const request = indexedDB.open(Utils.leadDbName, 1)

      request.onblocked = () => reject(new Error('Browser database is blocked by another extension page. Close old LeadLens pages and try again.'))
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(Utils.leadDbStore)) {
          db.createObjectStore(Utils.leadDbStore)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      }), 7000, 'Browser database did not open in time')
      Utils.leadDb.onversionchange = () => {
        try { Utils.leadDb?.close?.() } catch (error) { /* Ignore stale handle cleanup. */ }
        Utils.leadDb = null
      }
      return Utils.leadDb
    } catch (error) {
      try { Utils.leadDb?.close?.() } catch (closeError) { /* Ignore stale handle cleanup. */ }
      Utils.leadDb = null
      throw error
    }
  },

  async leadDbGet(name) {
    const db = await Utils.openLeadDb()
    if (!db) return undefined

    return Utils.withTimeout(new Promise((resolve, reject) => {
      let transaction
      try {
        transaction = db.transaction(Utils.leadDbStore, 'readonly')
        const request = transaction.objectStore(Utils.leadDbStore).get(name)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.onabort = () => reject(transaction.error || new Error('Browser database read was aborted'))
      } catch (error) {
        reject(error)
      }
    }), 4500, `Browser database read timed out: ${name}`)
  },

  async leadDbSet(name, value) {
    const db = await Utils.openLeadDb()
    if (!db) throw new Error('Browser database is unavailable')

    return Utils.withTimeout(new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(Utils.leadDbStore, 'readwrite')
        transaction.objectStore(Utils.leadDbStore).put(value, name)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error || new Error('Browser database write was aborted'))
      } catch (error) {
        reject(error)
      }
    }), 6500, `Browser database write timed out: ${name}`)
  },

  async leadDbDelete(name) {
    const db = await Utils.openLeadDb()
    if (!db) return

    return Utils.withTimeout(new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(Utils.leadDbStore, 'readwrite')
        transaction.objectStore(Utils.leadDbStore).delete(name)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error || new Error('Browser database delete was aborted'))
      } catch (error) {
        reject(error)
      }
    }), 6500, `Browser database delete timed out: ${name}`)
  },

  async leadDbEntries(prefix = '') {
    const db = await Utils.openLeadDb()
    if (!db) return {}
    return Utils.withTimeout(new Promise((resolve, reject) => {
      const result = {}
      try {
        const transaction = db.transaction(Utils.leadDbStore, 'readonly')
        const request = transaction.objectStore(Utils.leadDbStore).openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return resolve(result)
          const key = String(cursor.key || '')
          if (!prefix || key.startsWith(prefix)) result[key] = cursor.value
          cursor.continue()
        }
        request.onerror = () => reject(request.error)
        transaction.onabort = () => reject(transaction.error || new Error('Browser database cursor read was aborted'))
      } catch (error) { reject(error) }
    }), 12000, 'Browser database cursor read timed out')
  },

  async clearLeadDatabase() {
    const db = await Utils.openLeadDb()
    if (!db) return

    return Utils.withTimeout(new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(Utils.leadDbStore, 'readwrite')
        transaction.objectStore(Utils.leadDbStore).clear()
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error || new Error('Browser database reset was aborted'))
      } catch (error) {
        reject(error)
      }
    }), 8000, 'Browser database reset timed out')
  },

  async resetAllData() {
    await Utils.clearLeadDatabase()

    if (typeof caches !== 'undefined') {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch (error) {
        // Cache cleanup is best-effort; browser database and settings reset still continue.
      }
    }

    await Utils.promisify(chrome.storage.local, 'clear')
    return { ok: true }
  },

  async rawLocalGet(name) {
    const option = await Utils.promisify(chrome.storage.local, 'get', name)
    return option[name]
  },

  async rawLocalRemove(names) {
    try {
      await Utils.promisify(chrome.storage.local, 'remove', names)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('LeadLens local cleanup failed', error)
    }
  },

  async migrateLeadDatabase() {
    const heavyKeys = [...Utils.leadDbKeys]

    try {
      const localData = await Utils.promisify(chrome.storage.local, 'get', heavyKeys)
      const migrated = []

      for (const key of heavyKeys) {
        const current = await Utils.leadDbGet(key)
        if (typeof current === 'undefined' && typeof localData[key] !== 'undefined') {
          await Utils.leadDbSet(key, localData[key])
          migrated.push(key)
        }
      }

      if (migrated.length) await Utils.rawLocalRemove(migrated)
      return { migrated }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('LeadLens browser database migration failed', error)
      return { migrated: [], error: String(error?.message || error) }
    }
  },

  /**
   * Get a setting or lead-data value. Heavy CRM datasets are stored in IndexedDB;
   * small settings stay in chrome.storage.local.
   */
  async getOption(name, defaultValue = null) {
    try {
      if (Utils.leadDbKeys.has(name)) {
        const dbValue = await Utils.leadDbGet(name)
        if (typeof dbValue !== 'undefined') return dbValue

        const legacy = await Utils.rawLocalGet(name)
        if (typeof legacy !== 'undefined') {
          await Utils.leadDbSet(name, legacy)
          await Utils.rawLocalRemove(name)
          return legacy
        }

        return defaultValue
      }

      const value = await Utils.rawLocalGet(name)
      if (typeof value !== 'undefined') return value
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('LeadLens storage read failed', error)
    }

    return defaultValue
  },

  /**
   * Save a setting or lead-data value. Heavy CRM datasets are written to IndexedDB.
   */
  async setOption(name, value) {
    try {
      if (Utils.leadDbKeys.has(name)) {
        await Utils.leadDbSet(name, value)
        await Utils.rawLocalRemove(name)
        return
      }

      await Utils.promisify(chrome.storage.local, 'set', { [name]: value })
    } catch (error) {
      // Fall back to chrome.storage.local if IndexedDB is unavailable.
      if (Utils.leadDbKeys.has(name)) {
        try {
          await Utils.promisify(chrome.storage.local, 'set', { [name]: value })
          return
        } catch (fallbackError) {
          // eslint-disable-next-line no-console
          console.error('LeadLens fallback storage write failed', fallbackError)
        }
      }
      // eslint-disable-next-line no-console
      console.error('LeadLens storage write failed', error)
    }
  },

  async exportBrowserDatabase() {
    const result = {}
    for (const key of Utils.leadDbKeys) result[key] = await Utils.getOption(key, {})
    result.dynamicShards = {
      ...(await Utils.leadDbEntries('contactItemsByHost:')),
      ...(await Utils.leadDbEntries('rejectedContactsByHost:')),
      ...(await Utils.leadDbEntries('seoAuditByHost:')),
      ...(await Utils.leadDbEntries('contactSummaryByHost:')),
      ...(await Utils.leadDbEntries('seoAuditSummaryByHost:')),
    }
    return result
  },

  async exportAllData() {
    const storage = await Utils.promisify(chrome.storage.local, 'get', null)
    const browserDatabase = await Utils.exportBrowserDatabase()

    return { storage: storage || {}, browserDatabase }
  },

  async importAllData(payload = {}) {
    const storage = payload.storage && typeof payload.storage === 'object'
      ? payload.storage
      : payload
    const browserDatabase = payload.browserDatabase && typeof payload.browserDatabase === 'object'
      ? payload.browserDatabase
      : storage

    await Utils.promisify(chrome.storage.local, 'set', storage || {})

    for (const key of Utils.leadDbKeys) {
      if (typeof browserDatabase[key] !== 'undefined') await Utils.leadDbSet(key, browserDatabase[key])
    }
    const dynamicShards = browserDatabase.dynamicShards && typeof browserDatabase.dynamicShards === 'object'
      ? browserDatabase.dynamicShards
      : {}
    for (const [key, value] of Object.entries(dynamicShards)) {
      if (/^(?:contactItemsByHost:|rejectedContactsByHost:|seoAuditByHost:|contactSummaryByHost:|seoAuditSummaryByHost:)/.test(key)) await Utils.leadDbSet(key, value)
    }
    await Utils.rawLocalRemove([...Utils.leadDbKeys])
  },

  async getBrowserStorageStats() {
    let localBytes = 0
    let usage = 0
    let quota = 10 * 1024 * 1024

    try {
      localBytes = await Utils.promisify(chrome.storage.local, 'getBytesInUse', null)
    } catch (error) {
      localBytes = 0
    }

    try {
      const estimate = await navigator.storage?.estimate?.()
      usage = Number(estimate?.usage || localBytes || 0)
      quota = Number(estimate?.quota || quota)
    } catch (error) {
      usage = localBytes
    }

    const percent = quota > 0 ? Math.min(100, Math.round((usage / quota) * 1000) / 10) : 0

    return {
      usage,
      quota,
      localBytes,
      databaseBytes: Math.max(0, usage - localBytes),
      percent,
    }
  },

  formatBytes(value = 0) {
    const bytes = Number(value || 0)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  },

  async deleteLegacyFolderAutosaveDatabase() {
    if (typeof indexedDB === 'undefined') return

    try {
      indexedDB.deleteDatabase('leadlens-local-autosave')
      await Utils.rawLocalRemove([
        'leadLensAutoSaveFolderConnected',
        'leadLensAutoSaveSignatures',
        'leadLensLocalPreviewLimit',
      ])
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('LeadLens legacy folder cleanup failed', error)
    }
  },

  /** Apply internationalization. */
  i18n() {
    Array.from(document.querySelectorAll('[data-i18n]')).forEach(
      (node) => (node.innerHTML = chrome.i18n.getMessage(node.dataset.i18n))
    )
  },

  sendMessage(source, func, args) {
    return new Promise((resolve, reject) => {
      const guard = (typeof self !== 'undefined' && self.LeadLensMessageGuard) || null
      const envelope = guard
        ? guard.envelope(source, func, args)
        : { source, func, args: args ? (Array.isArray(args) ? args : [args]) : [] }
      chrome.runtime.sendMessage(envelope, (response) => {
        chrome.runtime.lastError
          ? reject(chrome.runtime.lastError)
          : resolve(response)
      })
    })
  },

  globEscape(string) {
    return string.replace(/\*/g, '\\*')
  },
}
