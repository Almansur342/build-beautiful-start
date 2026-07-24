'use strict'
/* eslint-env browser */
/* globals chrome, Utils */

const { open, i18n, getOption, setOption, promisify, sendMessage } = Utils

const Popup = {
  async init() {
    Popup.cache = {
      url: '',
      detections: [],
    }

    const el = {
      body: document.body,
      detections: document.querySelector('.detections'),
      empty: document.querySelector('.empty'),
      loading: document.querySelector('.loading'),
      headerSwitchDisabled: document.querySelector('.header__switch--disabled'),
      headerSwitchEnabled: document.querySelector('.header__switch--enabled'),
      headerSwitches: document.querySelectorAll('.header__switch'),
      headerSettings: document.querySelector('.header__settings'),
      headerContacts: document.querySelector('.header__contacts'),
      headerHelp: document.querySelector('.header__help'),
      popupAbout: document.getElementById('popup-about'),
      headerThemeDark: document.querySelector('.header__theme--dark'),
      headerThemeLight: document.querySelector('.header__theme--light'),
      headerThemes: document.querySelectorAll('.header__theme'),
      templates: document.querySelectorAll('[data-template]'),
    }

    // Templates
    Popup.templates = Array.from(el.templates).reduce((templates, template) => {
      templates[template.dataset.template] = template.cloneNode(true)
      template.remove()
      return templates
    }, {})

    // Theme
    const theme = await getOption('theme', 'light')
    if (theme === 'dark') {
      el.body.classList.add('dark')
      el.headerThemeLight.classList.remove('header__icon--hidden')
      el.headerThemeDark.classList.add('header__icon--hidden')
    }

    el.headerThemes.forEach((headerTheme) =>
      headerTheme.addEventListener('click', async () => {
        const theme = await getOption('theme', 'light')
        el.body.classList[theme === 'dark' ? 'remove' : 'add']('dark')
        el.headerThemeDark.classList[theme === 'dark' ? 'remove' : 'add']('header__icon--hidden')
        el.headerThemeLight.classList[theme === 'dark' ? 'add' : 'remove']('header__icon--hidden')
        await setOption('theme', theme === 'dark' ? 'light' : 'dark')
      })
    )

    // Settings
    el.headerSettings.addEventListener('click', () =>
      chrome.runtime.openOptionsPage()
    )

    // Lead Vault
    el.headerContacts.addEventListener('click', () =>
      chrome.tabs.create({ url: chrome.runtime.getURL('html/contacts.html') })
    )

    // User guide
    el.headerHelp.addEventListener('click', () =>
      chrome.tabs.create({ url: chrome.runtime.getURL('html/help.html') })
    )

    // About
    el.popupAbout?.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('html/about.html') }))

    // Get current tab URL
    let url
    const tabs = await promisify(chrome.tabs, 'query', { active: true, currentWindow: true })
    if (tabs && tabs.length) {
      ;[{ url }] = tabs
    }

    // Disable/enable on domain
    let disabledDomains = await getOption('disabledDomains', [])

    if (url && url.startsWith('http')) {
      Popup.cache.url = url
      const { hostname } = new URL(url)

      const isDisabled = disabledDomains.includes(hostname)
      if (isDisabled) {
        el.headerSwitchEnabled.classList.add('header__switch--hidden')
        el.headerSwitchDisabled.classList.remove('header__switch--hidden')
      }

      el.headerSwitchDisabled.addEventListener('click', async () => {
        disabledDomains = disabledDomains.filter((h) => h !== hostname)
        await setOption('disabledDomains', disabledDomains)
        el.headerSwitchEnabled.classList.remove('header__switch--hidden')
        el.headerSwitchDisabled.classList.add('header__switch--hidden')
        Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))
      })

      el.headerSwitchEnabled.addEventListener('click', async () => {
        disabledDomains.push(hostname)
        await setOption('disabledDomains', disabledDomains)
        el.headerSwitchEnabled.classList.add('header__switch--hidden')
        el.headerSwitchDisabled.classList.remove('header__switch--hidden')
        Popup.onGetDetections([])
      })
    } else {
      el.headerSwitches.forEach((s) => s.classList.add('header__switch--hidden'))
    }

    // Show loading, then fetch detections
    el.loading.classList.remove('loading--hidden')
    el.detections.classList.add('detections--hidden')
    el.empty.classList.add('empty--hidden')

    Popup.driver('getDetections').then(Popup.onGetDetections.bind(this))

    i18n()
  },

  driver(func, args) {
    return sendMessage('popup.js', func, args)
  },

  categorise(technologies) {
    return Object.values(
      technologies
        .filter(({ confidence }) => confidence >= 50)
        .reduce((categories, technology) => {
          technology.categories.forEach((category) => {
            categories[category.id] = categories[category.id] || {
              ...category,
              technologies: [],
            }
            categories[category.id].technologies.push(technology)
          })
          return categories
        }, {})
    )
  },

  async onGetDetections(detections = []) {
    Popup.cache.detections = detections

    const el = {
      loading: document.querySelector('.loading'),
      empty: document.querySelector('.empty'),
      detections: document.querySelector('.detections'),
    }

    el.loading.classList.add('loading--hidden')

    detections = (detections || [])
      .filter(({ confidence }) => confidence >= 50)
      .filter(({ slug }) => slug !== 'cart-functionality')

    if (!detections || !detections.length) {
      el.empty.classList.remove('empty--hidden')
      el.detections.classList.add('detections--hidden')
      return
    }

    el.empty.classList.add('empty--hidden')
    el.detections.classList.remove('detections--hidden')

    // Clear existing
    while (el.detections.firstChild) {
      el.detections.removeChild(el.detections.firstChild)
    }

    const categorised = Popup.categorise(detections)

    categorised.forEach(({ id, name, technologies }) => {
      const categoryNode = Popup.templates.category.cloneNode(true)

      categoryNode.querySelector('.category__name').textContent = name

      technologies.forEach(({ name, confidence, version, icon }) => {
        const technologyNode = Popup.templates.technology.cloneNode(true)

        const iconImg = technologyNode.querySelector('.technology__icon img')
        const nameEl = technologyNode.querySelector('.technology__name')
        const versionEl = technologyNode.querySelector('.technology__version')
        const confidenceEl = technologyNode.querySelector('.technology__confidence')

        iconImg.src = `../images/icons/${icon}`
        iconImg.alt = name
        nameEl.textContent = name

        if (version) {
          versionEl.textContent = version
        } else {
          versionEl.remove()
        }

        if (confidence < 100) {
          confidenceEl.textContent = `${confidence}%`
        } else {
          confidenceEl.remove()
        }

        categoryNode.querySelector('.technologies').appendChild(technologyNode)
      })

      el.detections.appendChild(categoryNode)
    })

    i18n()
  },
}

if (document.readyState === 'complete') {
  Popup.init()
} else {
  document.addEventListener('DOMContentLoaded', Popup.init)
}
