'use strict'
/* eslint-env browser */
/* globals Utils, chrome, LeadLensBlacklist */

const { getOption, setOption } = Utils

const Options = {
  fields: {
    badge: true,
    showCached: true,
    leadLensAutoAcceptCookieConsent: true,
  },

  async init() {
    await Options.applyTheme()

    document.getElementById('theme-toggle').addEventListener('click', async () => {
      const current = await getOption('theme', 'light')
      const next = current === 'dark' ? 'light' : 'dark'

      await setOption('theme', next)
      Options.setTheme(next)
      Options.showToast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled.`, 'info')
    })

    await Promise.all(
      Object.entries(Options.fields).map(async ([option, defaultValue]) => {
        const input = document.getElementById(option)

        if (!input) return
        input.checked = !!(await getOption(option, defaultValue))
        input.addEventListener('change', async () => {
          await setOption(option, input.checked)
          const label = input.closest('.settings-row')?.querySelector('strong')?.textContent || option
          Options.showToast(`${label} ${input.checked ? 'enabled' : 'disabled'}.`)
        })
      })
    )

    document.getElementById('clear-cache').addEventListener('click', () =>
      Options.runButtonAction('clear-cache', 'Clearing...', async () => {
        await Options.driver('clearCache')
      }, 'Technology cache cleared successfully.')
    )

    document.getElementById('clear-contacts').addEventListener('click', async () => {
      if (!window.confirm('Clear all saved contacts and related local lead data?')) return
      await Options.runButtonAction('clear-contacts', 'Clearing...', async () => {
        await Options.driver('clearContacts')
      }, 'Saved contacts and related local lead data cleared.')
    })

    document.getElementById('full-system-reset')?.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Reset LeadLens completely? This permanently deletes all leads, contacts, SEO evidence, CRM notes, browser-database records, cached technologies, blacklist edits, and settings. Download a backup first if you need any existing data.'
      )

      if (!confirmed) return

      await Options.runButtonAction('full-system-reset', 'Resetting...', async () => {
        await Options.driver('resetSystem')
      }, 'LeadLens reset complete. Reloading the extension...')

      setTimeout(() => chrome.runtime.reload(), 900)
    })

    const blacklistInput = document.getElementById('disabled-domains')
    blacklistInput.value = (
      await getOption('disabledDomains', [...LeadLensBlacklist.domains])
    ).join('\n')
    blacklistInput.addEventListener('input', Options.updateBlacklistCount)
    Options.updateBlacklistCount()
    document.getElementById('cleanup-days').value = await getOption('cleanupDays', '')

    document.getElementById('save-blacklist').addEventListener('click', () =>
      Options.runButtonAction('save-blacklist', 'Saving...', Options.saveBlacklist, 'Blacklist saved successfully.')
    )
    document.getElementById('restore-blacklist-defaults').addEventListener('click', async () => {
      if (!window.confirm('Restore the recommended non-prospect blacklist? Your custom entries will be kept.')) return
      await Options.runButtonAction('restore-blacklist-defaults', 'Restoring...', Options.restoreRecommendedBlacklist, 'Recommended blacklist restored successfully.')
    })
    document.getElementById('backup-data').addEventListener('click', () =>
      Options.runButtonAction('backup-data', 'Preparing...', Options.backupData, 'Backup downloaded successfully.')
    )
    document.getElementById('restore-data').addEventListener('change', Options.restoreData)
    document.getElementById('cleanup-leads').addEventListener('click', async () => {
      const days = document.getElementById('cleanup-days').value

      if (!days) {
        Options.showToast('Choose a cleanup period first.', 'error')
        return
      }

      await Options.runButtonAction('cleanup-leads', 'Cleaning...', async () => {
        await setOption('cleanupDays', days)
        await Options.driver('cleanupOldLeads', [days])
      }, `Cleanup completed for leads older than ${days} days.`)
    })
  },

  ensureToastRegion() {
    let region = document.getElementById('app-toast-region')

    if (!region) {
      region = document.createElement('div')
      region.id = 'app-toast-region'
      region.className = 'app-toast-region'
      region.setAttribute('aria-live', 'polite')
      document.body.appendChild(region)
    }

    return region
  },

  showToast(message, type = 'success') {
    const region = Options.ensureToastRegion()
    const toast = document.createElement('div')
    const symbols = { success: '✓', error: '!', info: 'i' }

    toast.className = `app-toast app-toast--${type}`
    const icon = document.createElement('span')
    const messageEl = document.createElement('span')
    const progress = document.createElement('span')
    icon.className = 'app-toast__icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.textContent = symbols[type] || '✓'
    messageEl.className = 'app-toast__message'
    messageEl.textContent = String(message || '')
    progress.className = 'app-toast__progress'
    progress.setAttribute('aria-hidden', 'true')
    toast.append(icon, messageEl, progress)
    region.appendChild(toast)
    requestAnimationFrame(() => toast.classList.add('is-visible'))
    setTimeout(() => {
      toast.classList.remove('is-visible')
      setTimeout(() => toast.remove(), 220)
    }, 3000)
  },

  async runButtonAction(buttonId, busyLabel, action, successMessage) {
    const button = document.getElementById(buttonId)
    const original = button?.textContent || ''

    try {
      if (button) {
        button.disabled = true
        button.classList.add('is-action-busy')
        button.textContent = busyLabel
      }
      await action()
      Options.showToast(successMessage)
    } catch (error) {
      Options.showToast(`Action failed: ${String(error?.message || error)}`, 'error')
    } finally {
      if (button) {
        button.disabled = false
        button.classList.remove('is-action-busy')
        button.textContent = original
      }
    }
  },

  parseBlacklistInput() {
    return [...new Set(
      document
        .getElementById('disabled-domains')
        .value.split(/\n|,/)
        .map((domain) => domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^\.+|\.+$/g, ''))
        .filter(Boolean)
    )]
  },

  updateBlacklistCount() {
    const count = Options.parseBlacklistInput().length
    const recommendedCount = LeadLensBlacklist.domains.length
    const groupCount = Object.keys(LeadLensBlacklist.groups || {}).length
    const element = document.getElementById('blacklist-count')

    if (element) {
      element.textContent = `${count} ignored domains saved in the editor. Recommended library: ${recommendedCount} domains across ${groupCount} categories. You can add or remove entries manually.`
    }
  },

  async saveBlacklist() {
    const domains = Options.parseBlacklistInput()
    await setOption('disabledDomains', domains)
    await setOption('leadLensDefaultBlacklistVersion', Number(LeadLensBlacklist.version || 1))
    Options.updateBlacklistCount()
  },

  async restoreRecommendedBlacklist() {
    const domains = [
      ...new Set([...Options.parseBlacklistInput(), ...LeadLensBlacklist.domains]),
    ].sort((a, b) => a.localeCompare(b))
    document.getElementById('disabled-domains').value = domains.join('\n')
    await setOption('disabledDomains', domains)
    await setOption('leadLensDefaultBlacklistVersion', Number(LeadLensBlacklist.version || 1))
    Options.updateBlacklistCount()
  },

  async backupData() {
    const snapshot = await Utils.exportAllData()
    const data = {
      exportedAt: new Date().toISOString(),
      product: 'Qrinux LeadLens',
      version: chrome.runtime.getManifest().version,
      ...snapshot,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `qrinux-leadlens-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    await setOption('lastBackupAt', new Date().toISOString())
  },

  async restoreData(event) {
    const [file] = event.target.files || []

    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const data = parsed.storage || parsed

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Invalid backup format')
      }

      await Utils.importAllData(parsed)
      Options.showToast('Backup restored successfully. Reload extension pages to view restored data.')
    } catch (error) {
      Options.showToast(`Restore failed: ${String(error?.message || error)}`, 'error')
    } finally {
      event.target.value = ''
    }
  },

  async checkLocalAi() {
    Options.showToast('No local language model is active. LeadLens keeps captured evidence deterministic and reviewable.', 'info')
  },

  async applyTheme() {
    Options.setTheme(await getOption('theme', 'light'))
  },

  setTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark')
    document.getElementById('theme-dark').classList.toggle('hidden', theme === 'dark')
    document.getElementById('theme-light').classList.toggle('hidden', theme !== 'dark')
  },

  driver(func, args) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { source: 'options.js', func, args: args ? (Array.isArray(args) ? args : [args]) : [] },
        (response) => {
          chrome.runtime.lastError
            ? reject(new Error(chrome.runtime.lastError.message))
            : resolve(response)
        }
      )
    })
  },
}

if (/complete|interactive|loaded/.test(document.readyState)) {
  Options.init()
} else {
  document.addEventListener('DOMContentLoaded', Options.init)
}

// Qrinux LeadLens API key section
;(function () {
  document.addEventListener('DOMContentLoaded', async function () {
    const input = document.getElementById('qrinux-apikey-input')
    const saveBtn = document.getElementById('qrinux-apikey-save')
    const clearBtn = document.getElementById('qrinux-apikey-clear')
    const status = document.getElementById('qrinux-apikey-status')
    if (!input || !saveBtn) return
    chrome.storage.local.get(['qrinuxApiKey'], (r) => {
      const k = r && r.qrinuxApiKey
      if (k) input.value = k
    })
    saveBtn.addEventListener('click', () => {
      chrome.storage.local.set({ qrinuxApiKey: (input.value || '').trim() }, () => {
        status.textContent = 'Saved!'
        setTimeout(() => (status.textContent = ''), 2000)
      })
    })
    clearBtn.addEventListener('click', () => {
      chrome.storage.local.remove(['qrinuxApiKey'], () => {
        input.value = ''
        status.textContent = 'Cleared.'
        status.style.color = '#dc2626'
        setTimeout(() => { status.textContent = ''; status.style.color = '#059669' }, 2000)
      })
    })
  })
})()
