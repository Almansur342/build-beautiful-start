'use strict'
/* globals Utils, chrome */

const { getOption, setOption, sendMessage } = Utils

const DEFAULT_PAGE_SIZE = 20
const BULK_QUEUE_SOFT_WARNING = 5000
const BULK_ACTIVITY_HISTORY_LIMIT = 750
const COUNTRY_CODES = [
  'AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM',
  'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ',
  'BM', 'BT', 'BO', 'BQ', 'BA', 'BW', 'BV', 'BR', 'IO', 'BN', 'BG', 'BF',
  'BI', 'KH', 'CM', 'CA', 'CV', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC',
  'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ',
  'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET',
  'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE',
  'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY',
  'HT', 'HM', 'VA', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE',
  'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR',
  'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO',
  'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX',
  'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP',
  'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'MK', 'MP', 'NO', 'OM',
  'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR',
  'QA', 'RE', 'RO', 'RU', 'RW', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC',
  'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI',
  'SB', 'SO', 'ZA', 'GS', 'SS', 'ES', 'LK', 'SD', 'SR', 'SJ', 'SE', 'CH',
  'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR',
  'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'UY', 'UZ', 'VU',
  'VE', 'VN', 'VG', 'VI', 'WF', 'EH', 'YE', 'ZM', 'ZW',

]

const LEADLENS_ENTERPRISE_SKIP_DOMAINS = [
  ['amazon.com', 'Amazon'], ['ebay.com', 'eBay'], ['etsy.com', 'Etsy'],
  ['nike.com', 'Nike'], ['adidas.com', 'Adidas'], ['puma.com', 'Puma'],
  ['zara.com', 'Zara'], ['uniqlo.com', 'UNIQLO'], ['hm.com', 'H&M'],
  ['lululemon.com', 'Lululemon'], ['patagonia.com', 'Patagonia'], ['thenorthface.com', 'The North Face'],
  ['warbyparker.com', 'Warby Parker'], ['bestbuy.com', 'Best Buy'], ['walmart.com', 'Walmart'],
  ['costco.com', 'Costco'], ['target.com', 'Target'], ['currys.co.uk', 'Currys'],
  ['apple.com', 'Apple'], ['microsoft.com', 'Microsoft'], ['google.com', 'Google'],
  ['github.com', 'GitHub'], ['gitlab.com', 'GitLab'], ['bitbucket.org', 'Bitbucket'],
  ['linkedin.com', 'LinkedIn'], ['facebook.com', 'Facebook'], ['meta.com', 'Meta'],
  ['instagram.com', 'Instagram'], ['x.com', 'X'], ['twitter.com', 'Twitter'],
  ['tiktok.com', 'TikTok'], ['youtube.com', 'YouTube'], ['reddit.com', 'Reddit'], ['medium.com', 'Medium'],
  ['pinterest.com', 'Pinterest'], ['whatsapp.com', 'WhatsApp'], ['web.whatsapp.com', 'WhatsApp'],
  ['shopify.com', 'Shopify'], ['wix.com', 'Wix'], ['squarespace.com', 'Squarespace'],
  ['webflow.com', 'Webflow'], ['wordpress.org', 'WordPress.org'], ['wordpress.com', 'WordPress.com'],
  ['woocommerce.com', 'WooCommerce'], ['elementor.com', 'Elementor'], ['rankmath.com', 'Rank Math'],
  ['wpbeginner.com', 'WPBeginner'], ['wpengine.com', 'WP Engine'], ['kinsta.com', 'Kinsta'],
  ['hostinger.com', 'Hostinger'], ['hostgator.com', 'HostGator'], ['bluehost.com', 'Bluehost'],
  ['godaddy.com', 'GoDaddy'], ['domain.com', 'Domain.com'], ['ionos.com', 'IONOS'], ['siteground.com', 'SiteGround'],
  ['cloudflare.com', 'Cloudflare'], ['vercel.com', 'Vercel'], ['netlify.com', 'Netlify'],
  ['heroku.com', 'Heroku'], ['aws.amazon.com', 'AWS'], ['cloud.google.com', 'Google Cloud'],
  ['azure.microsoft.com', 'Microsoft Azure'], ['firebase.google.com', 'Firebase'], ['mongodb.com', 'MongoDB'],
  ['supabase.com', 'Supabase'], ['stripe.com', 'Stripe'], ['paypal.com', 'PayPal'], ['adyen.com', 'Adyen'],
  ['klarna.com', 'Klarna'], ['afterpay.com', 'Afterpay'], ['razorpay.com', 'Razorpay'],
  ['salesforce.com', 'Salesforce'], ['hubspot.com', 'HubSpot'], ['intercom.com', 'Intercom'],
  ['zendesk.com', 'Zendesk'], ['freshworks.com', 'Freshworks'], ['zoho.com', 'Zoho'],
  ['mailchimp.com', 'Mailchimp'], ['activecampaign.com', 'ActiveCampaign'], ['klaviyo.com', 'Klaviyo'],
  ['circle.so', 'Circle'], ['mightynetworks.com', 'Mighty Networks'], ['kajabi.com', 'Kajabi'], ['thinkific.com', 'Thinkific'], ['podia.com', 'Podia'],
  ['braze.com', 'Braze'], ['pendo.io', 'Pendo'], ['gorgias.com', 'Gorgias'], ['customer.io', 'Customer.io'], ['mailgun.com', 'Mailgun'], ['postmarkapp.com', 'Postmark'],
  ['twilio.com', 'Twilio'], ['sendgrid.com', 'SendGrid'], ['posthog.com', 'PostHog'], ['heap.io', 'Heap'], ['contentsquare.com', 'Contentsquare'], ['smartlook.com', 'Smartlook'],
  ['bigcommerce.com', 'BigCommerce'], ['ecwid.com', 'Ecwid'], ['shift4shop.com', 'Shift4Shop'], ['volusion.com', 'Volusion'],
  ['siteminder.com', 'SiteMinder'], ['littlehotelier.com', 'Little Hotelier'], ['roomraccoon.com', 'RoomRaccoon'], ['cloudbeds.com', 'Cloudbeds'],
  ['hostfully.com', 'Hostfully'], ['guesty.com', 'Guesty'], ['hostaway.com', 'Hostaway'], ['lodgify.com', 'Lodgify'], ['mews.com', 'Mews'], ['hotelogix.com', 'Hotelogix'],
  ['rentmanager.com', 'Rent Manager'], ['tenantcloud.com', 'TenantCloud'], ['yardibreeze.com', 'Yardi Breeze'], ['propertyware.com', 'Propertyware'],
  ['doorloop.com', 'DoorLoop'], ['appfolio.com', 'AppFolio'], ['buildium.com', 'Buildium'], ['rentecdirect.com', 'Rentec Direct'],
  ['servicefusion.com', 'Service Fusion'], ['getservicebox.com', 'ServiceBox'], ['housecallpro.com', 'Housecall Pro'], ['servicetitan.com', 'ServiceTitan'], ['jobber.com', 'Jobber'], ['fieldpulse.com', 'FieldPulse'], ['workiz.com', 'Workiz'],
      ['owner.com', 'Owner.com'], ['spoton.com', 'SpotOn'], ['lightspeedhq.com', 'Lightspeed'], ['jolt.com', 'Jolt'], ['touchbistro.com', 'TouchBistro'], ['toasttab.com', 'Toast'], ['restaurant365.com', 'Restaurant365'], ['getmaintainx.com', 'MaintainX'], ['upkeep.com', 'UpKeep'], ['gofmx.com', 'FMX'], ['limble.com', 'Limble'], ['fiixsoftware.com', 'Fiix'], ['getflowpath.com', 'FlowPath'], ['facilitybot.co', 'FacilityBot'],
  ['owner.com', 'Owner.com'], ['spoton.com', 'SpotOn'], ['lightspeedhq.com', 'Lightspeed'], ['jolt.com', 'Jolt'], ['touchbistro.com', 'TouchBistro'], ['toasttab.com', 'Toast'], ['restaurant365.com', 'Restaurant365'], ['getmaintainx.com', 'MaintainX'], ['upkeep.com', 'UpKeep'], ['gofmx.com', 'FMX'], ['limble.com', 'Limble'], ['fiixsoftware.com', 'Fiix'], ['getflowpath.com', 'FlowPath'], ['facilitybot.co', 'FacilityBot'], ['restaurant365.com', 'Restaurant365'],
  ['notion.so', 'Notion'], ['slack.com', 'Slack'], ['figma.com', 'Figma'], ['canva.com', 'Canva'],
  ['zoom.us', 'Zoom'], ['atlassian.com', 'Atlassian'], ['dropbox.com', 'Dropbox'], ['box.com', 'Box'],
  ['airtable.com', 'Airtable'], ['asana.com', 'Asana'], ['monday.com', 'Monday.com'], ['clickup.com', 'ClickUp'],
  ['typeform.com', 'Typeform'], ['zapier.com', 'Zapier'], ['lovable.dev', 'Lovable'],
  ['livechat.com', 'LiveChat'], ['tawk.to', 'Tawk.to'], ['crisp.chat', 'Crisp'], ['hotjar.com', 'Hotjar'],
  ['salesloft.com', 'Salesloft'], ['drift.com', 'Drift'], ['wappalyzer.com', 'Wappalyzer'],
  ['booking.com', 'Booking.com'], ['airbnb.com', 'Airbnb'], ['expedia.com', 'Expedia'],
  ['ticketmaster.com', 'Ticketmaster'], ['eventbrite.com', 'Eventbrite'], ['ubereats.com', 'Uber Eats'],
  ['just-eat.co.uk', 'Just Eat'], ['deliveroo.co.uk', 'Deliveroo'], ['doordash.com', 'DoorDash'],
  ['grubhub.com', 'Grubhub'], ['zomato.com', 'Zomato'], ['foodhub.com', 'Foodhub'], ['mealzo.co.uk', 'Mealzo'],
  ['yelp.com', 'Yelp'], ['tripadvisor.com', 'Tripadvisor'], ['opentable.com', 'OpenTable'],
  ['g2.com', 'G2'], ['capterra.com', 'Capterra'], ['trustpilot.com', 'Trustpilot'], ['producthunt.com', 'Product Hunt'],
  ['linear.app', 'Linear'], ['height.app', 'Height'], ['kit.com', 'Kit / ConvertKit'], ['convertkit.com', 'ConvertKit'], ['beehiiv.com', 'beehiiv'],
  ['loom.com', 'Loom'], ['descript.com', 'Descript'], ['riverside.com', 'Riverside'], ['coda.io', 'Coda'], ['mural.co', 'Mural'], ['miro.com', 'Miro'],
  ['duolingo.com', 'Duolingo'], ['datacamp.com', 'DataCamp'], ['quizlet.com', 'Quizlet'], ['masterclass.com', 'MasterClass'], ['codecademy.com', 'Codecademy'],
  ['udemy.com', 'Udemy'], ['coursera.org', 'Coursera'], ['brilliant.org', 'Brilliant'], ['skillshare.com', 'Skillshare'],
  ['uber.com', 'Uber'], ['komoot.com', 'Komoot'], ['alltrails.com', 'AllTrails'], ['strava.com', 'Strava'], ['whoop.com', 'WHOOP'],
  ['tonal.com', 'Tonal'], ['echelonfit.com', 'Echelon'], ['onepeloton.com', 'Peloton'], ['betterhelp.com', 'BetterHelp'], ['talkspace.com', 'Talkspace'],
  ['checkatrade.com', 'Checkatrade'], ['mybuilder.com', 'MyBuilder'], ['ratedpeople.com', 'Rated People'],
  ['nvidia.com', 'NVIDIA'], ['dell.com', 'Dell'], ['hp.com', 'HP'], ['lenovo.com', 'Lenovo'], ['intel.com', 'Intel'],
  ['amd.com', 'AMD'], ['cisco.com', 'Cisco'], ['oracle.com', 'Oracle'], ['sap.com', 'SAP'], ['servicenow.com', 'ServiceNow'],
  ['workday.com', 'Workday'], ['adobe.com', 'Adobe'], ['autodesk.com', 'Autodesk'], ['ibm.com', 'IBM'], ['shop.app', 'Shop'], ['squareup.com', 'Square'],
  ['indeed.com', 'Indeed'], ['glassdoor.com', 'Glassdoor'], ['monster.com', 'Monster'], ['ziprecruiter.com', 'ZipRecruiter'],
  ['wellfound.com', 'Wellfound'], ['greenhouse.io', 'Greenhouse'], ['lever.co', 'Lever'], ['workable.com', 'Workable'],
  ['taleo.net', 'Taleo'], ['smartrecruiters.com', 'SmartRecruiters'], ['jobvite.com', 'Jobvite'],
  ['crunchbase.com', 'Crunchbase'], ['apollo.io', 'Apollo'], ['zoominfo.com', 'ZoomInfo'], ['clearbit.com', 'Clearbit'],
  ['semrush.com', 'Semrush'], ['ahrefs.com', 'Ahrefs'], ['moz.com', 'Moz'], ['similarweb.com', 'Similarweb'],
  ['yext.com', 'Yext'], ['wixstudio.com', 'Wix Studio'], ['framer.com', 'Framer'], ['bubble.io', 'Bubble'],
  ['thumbtack.com', 'Thumbtack'], ['bark.com', 'Bark'], ['yellowpages.com', 'Yellow Pages'],
  ['alibaba.com', 'Alibaba'], ['avast.com', 'Avast'], ['msi.com', 'MSI'], ['hatena.blog', 'Hatena Blog'], ['hatena.ne.jp', 'Hatena'],
  ['sapo.pt', 'SAPO'], ['livejournal.com', 'LiveJournal'], ['trip.com', 'Trip.com'], ['kayak.com', 'KAYAK'], ['kayak.co.in', 'KAYAK'],
  ['jd.com', 'JD.com'], ['netlify.app', 'Netlify hosted app'], ['appspot.com', 'Google App Engine'], ['t.me', 'Telegram'], ['telegra.ph', 'Telegraph'],
  ['buzzsprout.com', 'Buzzsprout'], ['readthedocs.com', 'Read the Docs'], ['apache.org', 'Apache Software Foundation'], ['archlinux.org', 'Arch Linux'],
  ['frontiersin.org', 'Frontiers'], ['inform.kz', 'Kazinform'], ['ria.ru', 'RIA'], ['onet.pl', 'Onet'], ['itmedia.co.jp', 'ITmedia'],
  ['err.ee', 'ERR'], ['uefa.com', 'UEFA'], ['nicovideo.jp', 'Niconico'], ['libretexts.org', 'LibreTexts'], ['diva-portal.org', 'DiVA Portal'], ['narod.ru', 'Narod hosted pages'], ['ligazakon.net', 'LigaZakon legal information platform'], ['banggood.com', 'Banggood marketplace'], ['seesaa.net', 'Seesaa Blog'], ['antaranews.com', 'ANTARA News'], ['ceskatelevize.cz', 'Czech Television'], ['linternaute.com', 'Linternaute'],
  ['sch.gr', 'Greek School Network'], ['umd.edu', 'University of Maryland'], ['ucm.es', 'Universidad Complutense de Madrid'], ['hse.ru', 'HSE University'], ['upenn.edu', 'University of Pennsylvania'], ['usu.edu', 'Utah State University'], ['nii.ac.jp', 'NII'],
  ['canada.ca', 'Government of Canada'], ['mn.gov', 'Minnesota government'], ['wa.gov', 'Washington government'], ['in.gov', 'Indiana government'],
]

const Contacts = {
  allData: [],
  filteredSites: [],
  customIndustries: [],
  expanded: new Set(),
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  toolbarCollapsed: false,
  hasLoaded: false,
  allExpanded: false,
  localAiEnabled: true,
  saveMetaTimers: {},
  domainAgePending: new Set(),
  domainAgeQueuedAt: {},
  bulkQueue: [],
  bulkRunning: new Map(),
  bulkDone: new Set(),
  bulkResults: [],
  bulkMaxConcurrent: 1,
  bulkAutoAcceptCookieConsent: true,
  bulkTotal: 0,
  bulkCancelled: false,
  bulkPaused: false,
  bulkSignature: '',
  bulkSessionStartedAt: 0,
  bulkLastStoppedAt: 0,
  bulkInitialTimeoutMs: 45000,
  bulkLoadedTimeoutMs: 90000,
  storageWarningLevel: '',
  filterTimer: null,
  listEventsBound: false,
  renderToken: 0,
  isLoadingData: false,
  bulkFocusRotationEnabled: true,
  bulkFocusTimer: null,
  bulkFocusIndex: 0,
  bulkOriginalActiveTabId: null,
  bulkOriginalWindowId: null,
  bulkWorkspaceSaveTimer: null,
  bulkPumpTimer: null,
  bulkOpenCooldownMs: 1400,
  bulkCooldownUntil: 0,
  bulkCooldownTimer: null,
  bulkBurstSize: 5,
  bulkBurstPauseMs: 5000,
  bulkLongPauseEvery: 15,
  bulkLongPauseMs: 12000,
  bulkRetryLimit: 2,
  bulkCheckpointEvery: 25,
  bulkResourceFlushEvery: 100,
  bulkStats: { scanned: 0, blocked: 0, timeout: 0, error: 0, skipped: 0 },
  dataRefreshTimer: null,
  detailCache: new Map(),
  detailLoading: new Map(),
  initialLoadWatchdogTimer: null,
  initialLoadReleased: false,

  installInitialLoadWatchdog() {
    clearTimeout(Contacts.initialLoadWatchdogTimer)
    Contacts.initialLoadWatchdogTimer = setTimeout(() => {
      if (Contacts.initialLoadReleased) return
      Contacts.releaseInitialLoading('Lead Vault opened in recovery mode. Background data is still reconnecting.', true)
      Contacts.loadData().catch((error) => console.warn('LeadLens recovery refresh failed', error))
    }, 6500)
  },

  releaseInitialLoading(message = '', notify = false) {
    if (Contacts.initialLoadReleased && !message) return
    Contacts.initialLoadReleased = true
    clearTimeout(Contacts.initialLoadWatchdogTimer)
    Contacts.initialLoadWatchdogTimer = null
    Contacts.hasLoaded = true
    document.getElementById('loading')?.classList.add('hidden')
    try {
      if (!Contacts.allData.length && !Contacts.filteredSites.length) Contacts.render()
    } catch (error) {
      console.error('LeadLens initial render recovery failed', error)
    }
    if (notify && message) Contacts.showToast(message, 'info')
  },

  async init() {
    Contacts.installInitialLoadWatchdog()
    await Contacts.applyTheme()
    Contacts.customIndustries = Contacts.toArray(
      await getOption('customIndustries', [])
    )
    Contacts.localAiEnabled = true
    Contacts.populateStaticFilters()
    try {
      await Utils.withTimeout(Contacts.initBrowserStorage(), 8000, 'Browser database initialization timed out')
    } catch (error) {
      console.error('LeadLens browser storage initialization failed', error)
      Contacts.showToast('Browser database recovery mode enabled. Lead Vault will keep loading without blocking the page.', 'error')
    }

    const bulkConcurrency = document.getElementById('bulk-concurrency')
    if (bulkConcurrency) {
      const savedBulkMax = Number(await getOption('bulkMaxConcurrent', 1))
      bulkConcurrency.value = String(Math.min(5, Math.max(1, savedBulkMax || 1)))
    }


    try {
      await Utils.withTimeout(Contacts.restoreBulkWorkspace(), 4500, 'Bulk workspace restore timed out')
    } catch (error) {
      console.warn('LeadLens bulk workspace restore skipped', error)
    }

    const bulkUrls = document.getElementById('bulk-urls')
    bulkUrls?.addEventListener('input', () => {
      Contacts.updateBulkUrlCount()
      Contacts.scheduleBulkWorkspaceSave()
    })
    document.getElementById('btn-bulk-clear-list')?.addEventListener('click', Contacts.clearBulkWorkspace)
    Contacts.updateBulkUrlCount()

    const bulkCookieConsent = document.getElementById('bulk-cookie-consent')
    Contacts.bulkAutoAcceptCookieConsent = Boolean(await getOption('leadLensAutoAcceptCookieConsent', true))
    if (bulkCookieConsent) {
      bulkCookieConsent.checked = Contacts.bulkAutoAcceptCookieConsent
      bulkCookieConsent.addEventListener('change', async () => {
        Contacts.bulkAutoAcceptCookieConsent = Boolean(bulkCookieConsent.checked)
        await setOption('leadLensAutoAcceptCookieConsent', Contacts.bulkAutoAcceptCookieConsent)
        Contacts.showToast(Contacts.bulkAutoAcceptCookieConsent ? 'Cookie-banner assist enabled.' : 'Cookie-banner assist disabled.', 'info')
      })
    }

    const bulkFocusRotation = document.getElementById('bulk-focus-rotation')
    Contacts.bulkFocusRotationEnabled = Boolean(await getOption('bulkFocusRotationEnabled', true))
    if (bulkFocusRotation) {
      bulkFocusRotation.checked = Contacts.bulkFocusRotationEnabled
      bulkFocusRotation.addEventListener('change', async () => {
        Contacts.bulkFocusRotationEnabled = Boolean(bulkFocusRotation.checked)
        await setOption('bulkFocusRotationEnabled', Contacts.bulkFocusRotationEnabled)
        if (Contacts.bulkFocusRotationEnabled) Contacts.startBulkFocusRotation()
        else Contacts.stopBulkFocusRotation(true)
        Contacts.showToast(Contacts.bulkFocusRotationEnabled ? 'Scan-tab focus rotation enabled.' : 'Scan-tab focus rotation disabled.', 'info')
      })
    }

    document.getElementById('btn-theme').addEventListener('click', async () => {
      const current = await getOption('theme', 'light')
      const next = current === 'dark' ? 'light' : 'dark'

      await setOption('theme', next)
      Contacts.setTheme(next)
      Contacts.showToast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled.`, 'info')
    })

    Contacts.pageSize = Number(await getOption('leadVaultPageSize', DEFAULT_PAGE_SIZE))
    document.getElementById('page-size').value = String(Contacts.pageSize)
    Contacts.toolbarCollapsed = Boolean(
      await getOption('leadVaultToolbarCollapsed', false)
    )
    Contacts.setToolbarCollapsed(Contacts.toolbarCollapsed)

    const searchInput = document.getElementById('search-input')
    searchInput?.addEventListener('input', () => Contacts.scheduleFilter(160))

    ;[
      'filter-type',
      'filter-status',
      'filter-lead-stage',
      'filter-priority',
      'filter-contacted',
      'filter-industry',
      'filter-country',
      'filter-pain-point',
      'filter-presence',
      'filter-score-band',
      'filter-follow-up',
      'filter-sort',
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => Contacts.scheduleFilter(0))
    })

    document.getElementById('page-size').addEventListener('change', async (event) => {
      Contacts.pageSize = Number(event.target.value) || DEFAULT_PAGE_SIZE
      await setOption('leadVaultPageSize', Contacts.pageSize)
      await Contacts.goToPage(1, 'Updating page size...')
    })

    document
      .getElementById('btn-toolbar-toggle')
      .addEventListener('click', async () => {
        Contacts.toolbarCollapsed = !Contacts.toolbarCollapsed
        await setOption('leadVaultToolbarCollapsed', Contacts.toolbarCollapsed)
        Contacts.setToolbarCollapsed(Contacts.toolbarCollapsed)
        Contacts.showToast(Contacts.toolbarCollapsed ? 'Filters hidden.' : 'Filters shown.', 'info')
      })

    document
      .getElementById('btn-copy-emails')
      .addEventListener('click', () => Contacts.copyByType('email'))
    document
      .getElementById('btn-copy-socials')
      .addEventListener('click', () => Contacts.copyByType('social'))
    document
      .getElementById('btn-copy-tech')
      .addEventListener('click', () => Contacts.copyAllTechnologies())
    document
      .getElementById('btn-copy-template')
      .addEventListener('click', () => Contacts.copyAllTemplates())
    document
      .getElementById('btn-copy-ai-prompts')
      ?.addEventListener('click', () => Contacts.copyAllAiPrompts())
    document.getElementById('btn-expand').addEventListener('click', () => {
      const start = (Contacts.page - 1) * Contacts.pageSize
      const pageSites = Contacts.filteredSites.slice(start, start + Contacts.pageSize)
      const everyOpen = pageSites.length > 0 && pageSites.every(({ host }) => Contacts.expanded.has(host))

      pageSites.forEach(({ host }) => {
        if (everyOpen) Contacts.expanded.delete(host)
        else Contacts.expanded.add(host)
      })
      Contacts.allExpanded = !everyOpen
      document.getElementById('btn-expand').textContent = everyOpen
        ? 'Expand page'
        : 'Collapse page'
      Contacts.render()
      Contacts.showToast(everyOpen ? 'Collapsed visible lead cards.' : 'Expanded visible lead cards.', 'info')
    })
    document
      .getElementById('btn-export')
      .addEventListener('click', Contacts.exportRawCsv)

    document
      .getElementById('btn-download-raw-json')
      ?.addEventListener('click', (event) => Contacts.downloadAllRawJson(event.currentTarget))

    document
      .getElementById('btn-download-compact-jsonl')
      ?.addEventListener('click', (event) => Contacts.downloadCompactJsonl(event.currentTarget))

    document
      .getElementById('btn-storage-refresh')
      ?.addEventListener('click', () => Contacts.refreshBrowserStorageStatus({ notify: true }))
    document
      .getElementById('btn-storage-backup')
      ?.addEventListener('click', Contacts.downloadBackup)
    document
      .getElementById('btn-recalculate')
      .addEventListener('click', Contacts.recalculateLeadIntelligence)
    document
      .getElementById('btn-backup-now')
      .addEventListener('click', Contacts.downloadBackup)
    document
      .getElementById('btn-backup-dismiss')
      .addEventListener('click', Contacts.dismissBackupReminder)
    document
      .getElementById('btn-bulk-import')
      .addEventListener('click', Contacts.startBulkImport)
    document
      .getElementById('btn-bulk-stop')
      ?.addEventListener('click', Contacts.stopBulkImport)

    chrome.runtime.onMessage.addListener((message, sender) => {
      if (!message || typeof message !== 'object') return
      // Phase E: reject cross-origin senders even for broadcast messages.
      if (!sender || sender.id !== chrome.runtime.id) return

      if (message.type === 'leadLensSystemReset') {
        Contacts.resetLocalUiState()
        return
      }

      if (message.type !== 'leadLensScanComplete') return
      Contacts.onBulkScanComplete(message, sender)
    })
    chrome.tabs.onUpdated.addListener(Contacts.onBulkTabUpdated)

    document.getElementById('btn-clear').addEventListener('click', () => {
      const count = Contacts.allData.length

      if (!count) {
        Contacts.showToast('There are no saved contacts to clear.', 'info')
        return
      }

      document.getElementById('confirm-count').textContent = count
      document.getElementById('confirm-overlay').classList.remove('hidden')
    })

    document.getElementById('confirm-cancel').addEventListener('click', () => {
      document.getElementById('confirm-overlay').classList.add('hidden')
    })

    document.getElementById('confirm-ok').addEventListener('click', async () => {
      document.getElementById('confirm-overlay').classList.add('hidden')
      await sendMessage('contacts.js', 'clearContacts', [])
      Contacts.allData = []
      Contacts.filteredSites = []
      Contacts.expanded.clear()
      Contacts.detailCache.clear()
      Contacts.detailLoading.clear()
      Contacts.render()
      await Contacts.refreshBrowserStorageStatus()
      Contacts.showToast('Saved contacts and related browser-database lead data cleared successfully.')
    })

    setInterval(() => {
      if (Contacts.bulkRunning.size || Contacts.bulkQueue.length || Contacts.isLoadingData) return
      Contacts.loadData().catch((error) => console.warn('LeadLens refresh skipped', error))
    }, 30000)

    await Utils.withTimeout(Contacts.loadData(), 12000, 'Initial Lead Vault loading timed out').catch((error) => {
      console.warn('LeadLens initial background loading skipped', error)
      Contacts.releaseInitialLoading('Lead Vault opened with local recovery. Background refresh will retry automatically.', true)
    })
    await Contacts.renderBackupReminder()
    await Contacts.notifyDueFollowUps()
  },

  async resetLocalUiState() {
    Contacts.stopBulkFocusRotation(false)
    if (Contacts.bulkPumpTimer) clearTimeout(Contacts.bulkPumpTimer)
    Contacts.bulkPumpTimer = null
    for (const [tabId, record] of Contacts.bulkRunning.entries()) {
      if (record?.timeoutId) clearTimeout(record.timeoutId)
      if (typeof tabId === 'number') {
        try { chrome.tabs.remove(tabId) } catch (error) { /* Ignore closed tabs. */ }
      }
    }
    Contacts.bulkQueue = []
    Contacts.bulkRunning = new Map()
    Contacts.bulkDone = new Set()
    Contacts.bulkResults = []
    Contacts.bulkStats = Contacts.normaliseBulkStats()
    Contacts.bulkTotal = 0
    Contacts.bulkPaused = false
    Contacts.bulkCancelled = false
    Contacts.allData = []
    Contacts.filteredSites = []
    Contacts.expanded.clear()
    Contacts.detailCache.clear()
    Contacts.detailLoading.clear()
    const bulkUrls = document.getElementById('bulk-urls')
    if (bulkUrls) bulkUrls.value = ''
    Contacts.hasLoaded = true
    document.getElementById('loading')?.classList.add('hidden')
    Contacts.setBulkControls(false)
    Contacts.updateBulkProgress()
    Contacts.renderBulkSummary()
    Contacts.render()
    Contacts.showToast('LeadLens was reset. All local lead data and settings were cleared.', 'info')
  },

  handleInitFailure(error) {
    console.error('LeadLens initialization failed', error)
    Contacts.releaseInitialLoading('', false)
    try { Contacts.render() } catch (renderError) { console.error(renderError) }
    Contacts.showToast(`Lead Vault recovery mode: ${String(error?.message || error)}`, 'error')
  },

  async applyTheme() {
    Contacts.setTheme(await getOption('theme', 'light'))
  },

  setTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark')
    document
      .getElementById('icon-theme-dark')
      .classList.toggle('hidden', theme === 'dark')
    document
      .getElementById('icon-theme-light')
      .classList.toggle('hidden', theme !== 'dark')
  },

  setToolbarCollapsed(collapsed) {
    const toolbar = document.getElementById('lead-vault-toolbar')
    const toggle = document.getElementById('btn-toolbar-toggle')

    if (toolbar) toolbar.classList.toggle('is-collapsed', collapsed)
    if (!toggle) return

    toggle.setAttribute('aria-expanded', String(!collapsed))
    const label = toggle.querySelector('span')
    if (label) label.textContent = collapsed ? 'Show filters' : 'Hide filters'
  },


  scheduleFilter(delay = 0) {
    clearTimeout(Contacts.filterTimer)
    Contacts.filterTimer = setTimeout(() => {
      Contacts.page = 1
      Contacts.showListLoading('Refreshing lead list...')
      requestAnimationFrame(() => Contacts.applyFilter())
    }, delay)
  },

  yieldFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()))
  },

  async goToPage(page, message = 'Loading lead page...') {
    const totalPages = Math.max(1, Math.ceil(Contacts.filteredSites.length / Contacts.pageSize))
    Contacts.page = Math.min(Math.max(Number(page) || 1, 1), totalPages)
    Contacts.showListLoading(message)
    await Contacts.yieldFrame()
    Contacts.render()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },

  showListLoading(message = 'Loading leads...') {
    const sitesWrap = document.getElementById('sites-wrap')
    const list = document.getElementById('sites-list')
    if (!sitesWrap || !list) return

    sitesWrap.classList.remove('hidden')
    list.innerHTML = `
      <div class="cf-list-loading" role="status" aria-live="polite">
        <span class="cf-list-loading__spinner" aria-hidden="true"></span>
        <strong>${Contacts.esc(message)}</strong>
        <span>Preparing the visible lead cards without removing saved data.</span>
      </div>
    `
  },

  populateStaticFilters() {
    const industryFilter = document.getElementById('filter-industry')
    const countryFilter = document.getElementById('filter-country')

    if (industryFilter) {
      industryFilter.innerHTML = Contacts.renderOptions(
        [['', 'All industries'], ...Contacts.industryOptions(false)],
        industryFilter.value
      )
    }

    if (countryFilter) {
      countryFilter.innerHTML = Contacts.renderOptions(
        [['', 'All countries'], ...Contacts.countryOptions()],
        countryFilter.value
      )
    }
  },

  normaliseIncomingRows(data = []) {
    return (data || []).map((row) => {
      const rawType = row.type || 'email'
      const rawValue = row.value || row.email || row.url || row.href || ''
      const phoneCandidate = rawType === 'phone' || Contacts.isPhoneRow({ ...row, value: rawValue })
      const type = phoneCandidate ? 'phone' : rawType
      const value = type === 'phone'
        ? Contacts.normalisePhoneContactValue(row, rawValue)
        : type === 'social'
          ? Contacts.normaliseSocialUrl(rawValue)
          : rawValue
      const platform = phoneCandidate
        ? Contacts.normalisePhonePlatform(row.platform, value || rawValue)
        : row.platform || ''

      return {
        id: row.id || `${type}:${platform}:${value}`,
        type,
        value,
        platform,
        emailKind: row.emailKind || Contacts.emailKind(row),
        emailDomain: row.emailDomain || '',
        websiteUrl: row.websiteUrl || '',
        websiteHost: row.websiteHost || Contacts.hostFromUrl(row.websiteUrl),
        pageTitle: row.pageTitle || '',
        foundAt: row.foundAt || '',
        lastSeenAt: row.lastSeenAt || row.foundAt || '',
        foundCount: row.foundCount || 1,
        status: row.status || 'found',
        sources: Contacts.toArray(row.sources),
        leadMeta: Contacts.normaliseLeadMeta(row.leadMeta),
        seoAudit: Contacts.normaliseSeoAudit(row.seoAudit),
        domainAge: Contacts.normaliseDomainAge(row.domainAge),
        technologyHistory: Contacts.normaliseTechnologyHistory(row.technologyHistory),
        technologies: Contacts.toArray(row.technologies),
        summaryOnly: Boolean(row.summaryOnly),
        summaryCounts: row.summaryCounts && typeof row.summaryCounts === 'object' ? row.summaryCounts : {},
        summarySearch: row.summarySearch || '',
        phoneRecord: phoneCandidate || Boolean(row.phoneRecord),
        originalValue: row.originalValue || rawValue,
        url: row.url || (phoneCandidate && /^tel:/i.test(value) ? value : row.url),
        href: row.href || '',
      }
    }).filter((row) => {
      if (row.type === 'email') {
        const verdict = globalThis.LeadLensIntelligence?.emailCandidate?.(row.value, {
          source: Contacts.toArray(row.sources).join(' '), siteHost: row.websiteHost,
        })
        return verdict ? verdict.valid : Boolean(row.value)
      }
      return !['social', 'phone'].includes(row.type) || Boolean(row.value)
    })
  },

  cacheDetailSite(host, site, maxEntries = 6) {
    if (!host || !site) return site
    if (Contacts.detailCache.has(host)) Contacts.detailCache.delete(host)
    Contacts.detailCache.set(host, site)
    while (Contacts.detailCache.size > maxEntries) {
      const oldest = Contacts.detailCache.keys().next().value
      if (!oldest) break
      Contacts.detailCache.delete(oldest)
    }
    return site
  },

  async hydrateExpandedPage(pageSites = []) {
    for (const { host } of pageSites) {
      if (!Contacts.expanded.has(host) || Contacts.detailCache.has(host)) continue
      const body = document.querySelector(`[data-body-host="${CSS.escape(host)}"]`)
      try {
        await Contacts.loadLeadDetails(host, body)
      } catch (error) {
        // The lead card already shows a retry control.
      }
      await Contacts.yieldToUi()
    }
  },

  async loadLeadDetails(host, body = null, options = {}) {
    if (!host) return null
    if (Contacts.detailCache.has(host) && !options.force) {
      const cached = Contacts.detailCache.get(host)
      if (body && body.isConnected) {
        body.innerHTML = Contacts.renderSiteBody(cached)
        body.dataset.hydrated = 'true'
      }
      return cached
    }
    if (Contacts.detailLoading.has(host)) return Contacts.detailLoading.get(host)

    const task = (async () => {
      try {
        const data = await Utils.withTimeout(
          sendMessage('contacts.js', 'getLeadDetails', [host]),
          12000,
          'Lead detail response timed out'
        )
        const rows = Contacts.normaliseIncomingRows(data || [])
        const site = Contacts.groupBySite(rows)[0] || Contacts.filteredSites.find((item) => item.host === host)
        if (!site) throw new Error('Website evidence was not found')
        Contacts.cacheDetailSite(host, site)
        if (body && body.isConnected && Contacts.expanded.has(host)) {
          body.innerHTML = Contacts.renderSiteBody(site)
          body.dataset.hydrated = 'true'
        }
        return site
      } catch (error) {
        if (body && body.isConnected) {
          body.innerHTML = `<div class="cf-detail-loading cf-detail-loading--error"><strong>Could not load full website evidence.</strong><span>${Contacts.esc(String(error?.message || error))}</span><button class="cf-btn cf-btn--sm cf-btn--ghost" type="button" data-action="retry-detail" data-host="${Contacts.esc(host)}">Retry</button></div>`
        }
        throw error
      } finally {
        Contacts.detailLoading.delete(host)
      }
    })()

    Contacts.detailLoading.set(host, task)
    return task
  },

  async ensureDetailedSites(sites = [], button = null) {
    const summaries = Contacts.toArray(sites)
    const missingHosts = summaries
      .map(({ host }) => host)
      .filter((host) => host && !Contacts.detailCache.has(host))

    if (missingHosts.length) {
      const chunkSize = 5
      let prepared = 0
      if (button) Contacts.setBusyButton(button, `Preparing 0/${missingHosts.length}...`)

      for (let offset = 0; offset < missingHosts.length; offset += chunkSize) {
        const chunk = missingHosts.slice(offset, offset + chunkSize)
        try {
          const rows = Contacts.normaliseIncomingRows(await Utils.withTimeout(
            sendMessage('contacts.js', 'getLeadDetailsBatch', [chunk]),
            12000,
            'Lead detail loading timed out'
          ))
          const grouped = Contacts.groupBySite(rows)
          grouped.forEach((site) => Contacts.cacheDetailSite(site.host, site, 24))
        } catch (error) {
          for (const host of chunk) {
            try { await Contacts.loadLeadDetails(host) } catch (detailError) { /* Keep summary fallback. */ }
          }
        }

        prepared = Math.min(missingHosts.length, offset + chunk.length)
        if (button) Contacts.setBusyButton(button, `Preparing ${prepared}/${missingHosts.length}...`)
        await Contacts.yieldToUi()
      }
    }

    return summaries.map((summary) => Contacts.detailCache.get(summary.host) || summary)
  },

  async getFallbackContactSummaries() {
    const safeRead = async (name, fallbackValue = {}) => {
      try {
        return await Utils.withTimeout(getOption(name, fallbackValue), 3500, `Fallback read timed out: ${name}`)
      } catch (error) {
        try {
          const legacy = await Utils.withTimeout(Utils.rawLocalGet(name), 1800, `Legacy fallback read timed out: ${name}`)
          return typeof legacy === 'undefined' ? fallbackValue : legacy
        } catch (legacyError) {
          return fallbackValue
        }
      }
    }

    const [dynamicContactSummaries, dynamicSeoSummaries, legacySummaryIndex, stored, leadMeta, legacySeoSummaries, legacySeoAudits, domainAgeLookups] = await Promise.all([
      Utils.leadDbEntries('contactSummaryByHost:').catch(() => ({})),
      Utils.leadDbEntries('seoAuditSummaryByHost:').catch(() => ({})),
      safeRead('contactSummaryIndex', {}),
      safeRead('contactItems', {}),
      safeRead('leadMeta', {}),
      safeRead('seoAuditSummaryIndex', {}),
      safeRead('seoAudits', {}),
      safeRead('domainAgeLookups', {}),
    ])
    const summaryIndex = Object.keys(dynamicContactSummaries || {}).length
      ? Object.fromEntries(Object.entries(dynamicContactSummaries).map(([key, value]) => [String(key).replace(/^contactSummaryByHost:/, ''), value]))
      : legacySummaryIndex
    const seoAuditSummaries = Object.keys(dynamicSeoSummaries || {}).length
      ? Object.fromEntries(Object.entries(dynamicSeoSummaries).map(([key, value]) => [String(key).replace(/^seoAuditSummaryByHost:/, ''), value]))
      : legacySeoSummaries
    const lightweightRows = Object.values(summaryIndex || {}).map((summary = {}) => {
      const rows = Contacts.toArray(summary.rows)
      const representative = rows.find((row) => row.type === 'site') || rows[0] || {}
      return { ...representative, summaryCounts: summary.summaryCounts || {}, summarySearch: summary.searchText || '' }
    }).filter((row) => row.websiteHost || row.websiteUrl)
    const rows = lightweightRows.length ? lightweightRows : Object.values(stored || {})
    return rows.map((item = {}) => ({
      ...item,
      technologies: Contacts.toArray(item.technologies),
      leadMeta: leadMeta?.[item.websiteHost] || {},
      technologyHistory: { latest: [], changes: [] },
      seoAudit: Contacts.normaliseSeoAudit(seoAuditSummaries?.[item.websiteHost] || legacySeoAudits?.[item.websiteHost] || null),
      domainAge: Contacts.normaliseDomainAge(domainAgeLookups?.[item.websiteHost] || null),
      summaryOnly: true,
    }))
  },

  async loadData() {
    if (Contacts.isLoadingData) return
    Contacts.isLoadingData = true

    try {
      let data
      try {
        data = await Utils.withTimeout(
          sendMessage('contacts.js', 'getContactSummaries', []),
          8500,
          'Lead database response timed out'
        )
        if (data && !Array.isArray(data) && data.error) throw new Error(data.error)
      } catch (backgroundError) {
        console.warn('LeadLens background summary request failed; using local recovery summaries', backgroundError)
        data = await Contacts.getFallbackContactSummaries()
      }

      const previousSignature = Contacts.dataSignature(Contacts.allData)
      const nextData = Contacts.normaliseIncomingRows(Array.isArray(data) ? data : [])
      const nextSignature = Contacts.dataSignature(nextData)
      const shouldRender = !Contacts.hasLoaded || previousSignature !== nextSignature

      Contacts.allData = nextData
      Contacts.hasLoaded = true

      if (shouldRender) {
        await Contacts.yieldToUi()
        Contacts.applyFilter()
      }
      Contacts.releaseInitialLoading('', false)
      Contacts.refreshBrowserStorageStatus().catch((error) => console.warn('LeadLens storage status refresh skipped', error))
    } catch (error) {
      console.error('LeadLens failed to load contacts', error)
      Contacts.hasLoaded = true
      Contacts.releaseInitialLoading('', false)
      if (!Contacts.filteredSites.length) Contacts.render()
    } finally {
      Contacts.isLoadingData = false
      Contacts.releaseInitialLoading('', false)
    }
  },


  async initBrowserStorage() {
    await Utils.migrateLeadDatabase()
    await Utils.deleteLegacyFolderAutosaveDatabase()
    await Contacts.refreshBrowserStorageStatus()
  },

  storageLevel(percent = 0) {
    if (percent >= 95) return 'critical'
    if (percent >= 85) return 'danger'
    if (percent >= 70) return 'warning'
    return 'good'
  },

  async refreshBrowserStorageStatus(options = {}) {
    const panel = document.getElementById('browser-storage-panel')
    const status = document.getElementById('browser-storage-status')
    const details = document.getElementById('browser-storage-details')
    const percentLabel = document.getElementById('browser-storage-percent')
    const meter = document.getElementById('browser-storage-meter-fill')

    if (!panel || !status || !details || !percentLabel || !meter) return null

    try {
      const stats = await Utils.getBrowserStorageStats()
      const sites = Contacts.groupBySite(Contacts.allData || []).length
      const level = Contacts.storageLevel(stats.percent)
      const usage = Utils.formatBytes(stats.usage)
      const quota = Utils.formatBytes(stats.quota)
      const databaseBytes = Utils.formatBytes(stats.databaseBytes)
      const settingsBytes = Utils.formatBytes(stats.localBytes)

      panel.dataset.level = level
      meter.style.width = `${Math.min(100, Math.max(0, stats.percent))}%`
      percentLabel.textContent = `${stats.percent}%`
      details.textContent = `${sites} saved website${sites === 1 ? '' : 's'} · Lead database ${databaseBytes} · Settings ${settingsBytes} · Available quota ${quota}`

      if (level === 'critical') {
        status.textContent = `Storage is almost full: ${usage} used. Download a backup and delete old leads before scanning a large batch.`
      } else if (level === 'danger') {
        status.textContent = `Storage usage is high: ${usage} used. Download a backup and consider cleaning old leads.`
      } else if (level === 'warning') {
        status.textContent = `Storage usage is growing: ${usage} used. Your leads are safely stored in this Chrome profile.`
      } else {
        status.textContent = `Storage healthy: ${usage} used. Leads, CRM notes, and follow-ups are stored in this Chrome profile.`
      }

      if (options.notify) {
        Contacts.showToast(`Browser database usage refreshed: ${stats.percent}% used.`, level === 'good' ? 'info' : 'error')
      } else if (level !== 'good' && Contacts.storageWarningLevel !== level) {
        Contacts.showToast(status.textContent, 'error')
      }

      Contacts.storageWarningLevel = level
      return stats
    } catch (error) {
      status.textContent = `Could not measure browser database usage: ${String(error?.message || error)}`
      panel.dataset.level = 'warning'
      return null
    }
  },

  applyFilter() {
    const query = document
      .getElementById('search-input')
      .value.trim()
      .toLowerCase()
    const typeFilter = document.getElementById('filter-type').value
    const statusFilter = document.getElementById('filter-status').value
    const leadStageFilter = document.getElementById('filter-lead-stage').value
    const priorityFilter = document.getElementById('filter-priority').value
    const contactedFilter = document.getElementById('filter-contacted').value
    const industryFilter = document.getElementById('filter-industry').value
    const countryFilter = document.getElementById('filter-country').value
    const painPointFilter = document.getElementById('filter-pain-point').value
    const presenceFilter = document.getElementById('filter-presence').value
    const scoreBandFilter = document.getElementById('filter-score-band').value
    const followUpFilter = document.getElementById('filter-follow-up').value
    const sort = document.getElementById('filter-sort').value
    const today = new Date().toISOString().slice(0, 10)

    const rows = Contacts.allData.filter((row) => {
      const haystack = [
        row.type,
        row.value,
        row.platform,
        row.emailDomain,
        row.websiteHost,
        row.websiteUrl,
        row.pageTitle,
        row.status,
        row.leadMeta?.stage || '',
        row.leadMeta?.priority || '',
        row.leadMeta?.contacted || '',
        row.leadMeta?.industry || '',
        row.leadMeta?.country || '',
        row.seoAudit?.score || '',
        Contacts.toArray(row.seoAudit?.issues).join(' '),
        Contacts.toArray(row.sources).join(' '),
        row.leadMeta?.notes || '',
        Contacts.toArray(row.leadMeta?.tags).join(' '),
        Contacts.toArray(row.technologies).map(({ name }) => name).join(' '),
        row.summarySearch || '',
      ]
        .join(' ')
        .toLowerCase()

      const site = Contacts.siteFromRow(row)
      const meta = Contacts.normaliseLeadMeta(row.leadMeta)
      const displayStage = Contacts.displayLeadStageValue(site)
      const displayPriority = Contacts.displayLeadPriorityValue(site)

      return (
        (!query || haystack.includes(query)) &&
        (!typeFilter || row.type === typeFilter ||
          (typeFilter === 'email' && Number(row.summaryCounts?.emails || 0) > 0) ||
          (typeFilter === 'social' && Number(row.summaryCounts?.socials || 0) > 0)) &&
        (!statusFilter || row.status === statusFilter) &&
        (!leadStageFilter ||
          displayStage === leadStageFilter) &&
        (!priorityFilter || displayPriority === priorityFilter) &&
        (!contactedFilter || meta.contacted === contactedFilter) &&
        (!industryFilter || Contacts.leadIndustryValue(site) === industryFilter) &&
        (!countryFilter || Contacts.marketDetection(site).country === countryFilter) &&
        (!painPointFilter ||
          Contacts.painPointLabels(site).some(({ id }) => id === painPointFilter)) &&
        Contacts.matchesPresenceFilter(site, presenceFilter) &&
        Contacts.matchesScoreBandFilter(site, scoreBandFilter) &&
        Contacts.matchesFollowUpFilter(meta, followUpFilter, today)
      )
    })

    Contacts.filteredSites = Contacts.groupBySite(rows)
    Contacts.sortSites(sort)
    Contacts.render()
  },

  groupBySite(rows) {
    const sites = new Map()

    rows.forEach((row) => {
      const host = row.websiteHost || Contacts.hostFromUrl(row.websiteUrl) || 'Unknown'

      if (!sites.has(host)) {
        sites.set(host, {
          host,
          websiteUrl: row.websiteUrl,
          pageTitle: row.pageTitle,
          latest: row.foundAt,
          lastSeenAt: row.lastSeenAt || row.foundAt,
          contacts: [],
          emails: [],
          socials: [],
          platforms: new Set(),
          technologies: new Map(),
          sources: new Set(),
          leadMeta: Contacts.normaliseLeadMeta(row.leadMeta),
          seoAudit: Contacts.normaliseSeoAudit(row.seoAudit),
          domainAge: Contacts.normaliseDomainAge(row.domainAge),
          technologyHistory: Contacts.normaliseTechnologyHistory(
            row.technologyHistory
          ),
          summaryCounts: row.summaryCounts && typeof row.summaryCounts === 'object' ? row.summaryCounts : {},
        })
      }

      const site = sites.get(host)
      if (row.summaryCounts && typeof row.summaryCounts === 'object') site.summaryCounts = row.summaryCounts
      const contactKey = `${row.type}:${String(row.value || '').toLowerCase()}`
      const existing = site.contacts.find(
        (item) => `${item.type}:${String(item.value || '').toLowerCase()}` === contactKey
      )

      if (existing) {
        existing.sources = [
          ...new Set([...Contacts.toArray(existing.sources), ...Contacts.toArray(row.sources)]),
        ]
        existing.foundCount = Math.max(existing.foundCount || 1, row.foundCount || 1)
        existing.lastSeenAt =
          new Date(row.lastSeenAt || row.foundAt) > new Date(existing.lastSeenAt || existing.foundAt || 0)
            ? row.lastSeenAt || row.foundAt
            : existing.lastSeenAt
        if (!existing.foundAt || new Date(row.foundAt) < new Date(existing.foundAt)) {
          existing.foundAt = row.foundAt
        }
        if (!existing.platform && row.platform) existing.platform = row.platform
        if (!existing.emailDomain && row.emailDomain) existing.emailDomain = row.emailDomain
      } else {
        site.contacts.push(row)
        if (row.type === 'email') site.emails.push(row)
        if (row.type === 'social') {
          site.socials.push(row)
          if (row.platform) site.platforms.add(row.platform)
        }
      }

      Contacts.toArray(row.sources).forEach((source) => site.sources.add(source))
      site.leadMeta = {
        ...site.leadMeta,
        ...(row.leadMeta || {}),
      }
      if (row.seoAudit?.score !== null) {
        site.seoAudit = Contacts.normaliseSeoAudit(row.seoAudit)
      }
      if (row.domainAge?.status && row.domainAge.status !== 'unknown') {
        site.domainAge = Contacts.normaliseDomainAge(row.domainAge)
      }
      if (Contacts.toArray(row.technologyHistory?.changes).length) {
        site.technologyHistory = Contacts.normaliseTechnologyHistory(
          row.technologyHistory
        )
      }
      Contacts.toArray(row.technologies).forEach((technology) => {
        if (technology.name && !site.technologies.has(technology.name)) {
          site.technologies.set(technology.name, technology)
        }
      })
      if (new Date(row.foundAt) > new Date(site.latest || 0)) {
        site.latest = row.foundAt
        site.websiteUrl = row.websiteUrl || site.websiteUrl
        site.pageTitle = row.pageTitle || site.pageTitle
      }
      if (new Date(row.lastSeenAt || row.foundAt) > new Date(site.lastSeenAt || 0)) {
        site.lastSeenAt = row.lastSeenAt || row.foundAt
      }
    })

    return [...sites.values()]
  },

  sortSites(sort) {
    Contacts.filteredSites.sort((a, b) => {
      if (sort === 'host') return a.host.localeCompare(b.host)
      if (sort === 'contacts') return Number(b.summaryCounts?.total ?? b.contacts.length) - Number(a.summaryCounts?.total ?? a.contacts.length)
      if (sort === 'emails') return Number(b.summaryCounts?.emails ?? b.emails.length) - Number(a.summaryCounts?.emails ?? a.emails.length)
      if (sort === 'socials') return Number(b.summaryCounts?.socials ?? Contacts.socialRows(b).length) - Number(a.summaryCounts?.socials ?? Contacts.socialRows(a).length)
      if (sort === 'opportunity') {
        return Contacts.opportunityScore(b).score - Contacts.opportunityScore(a).score
      }
      if (sort === 'seo') {
        return (b.seoAudit?.score ?? -1) - (a.seoAudit?.score ?? -1)
      }
      if (sort === 'health') {
        return Contacts.websiteHealth(b).score - Contacts.websiteHealth(a).score
      }

      return new Date(b.latest || 0) - new Date(a.latest || 0)
    })
  },

  render() {
    const totalContacts = Contacts.filteredSites.reduce(
      (sum, site) => sum + Number(site.summaryCounts?.total ?? site.contacts.length),
      0
    )
    const sitesWrap = document.getElementById('sites-wrap')
    const emptyState = document.getElementById('empty-state')
    const noResults = document.getElementById('no-results')
    const countEl = document.getElementById('result-count')

    countEl.textContent = `${Contacts.filteredSites.length} websites / ${totalContacts} contact records`

    if (!Contacts.allData.length) {
      sitesWrap.classList.add('hidden')
      noResults.classList.add('hidden')
      emptyState.classList.remove('hidden')
      document.getElementById('pagination').innerHTML = ''
      return
    }

    if (!Contacts.filteredSites.length) {
      sitesWrap.classList.add('hidden')
      emptyState.classList.add('hidden')
      noResults.classList.remove('hidden')
      document.getElementById('pagination').innerHTML = ''
      return
    }

    emptyState.classList.add('hidden')
    noResults.classList.add('hidden')
    sitesWrap.classList.remove('hidden')

    Contacts.renderSites()
    Contacts.renderPagination()
  },

  renderSites() {
    const start = (Contacts.page - 1) * Contacts.pageSize
    const pageSites = Contacts.filteredSites.slice(start, start + Contacts.pageSize)
    const list = document.getElementById('sites-list')
    const fragment = document.createDocumentFragment()

    pageSites.forEach((site) => {
      const isOpen = Contacts.expanded.has(site.host)
      const article = document.createElement('article')
      const audit = Contacts.normaliseSeoAudit(site.seoAudit)
      const domainAge = Contacts.normaliseDomainAge(site.domainAge)
      const contacts = Contacts.toArray(site.contacts)
      const socialRows = Contacts.socialRows(site)
      const phoneRows = Contacts.phoneRows(site)
      const contactCount = Number(site.summaryCounts?.total ?? contacts.length)
      const emailCount = Number(site.summaryCounts?.emails ?? site.emails.length)
      const socialCount = Number(site.summaryCounts?.socials ?? socialRows.length)
      const phoneCount = Number(site.summaryCounts?.phones ?? phoneRows.length)
      const displayStage = Contacts.displayLeadStageValue(site)
      const displayPriority = Contacts.displayLeadPriorityValue(site)
      const meta = Contacts.normaliseLeadMeta(site.leadMeta)
      const market = Contacts.marketDetection(site)
      const industry = Contacts.leadIndustryValue(site)

      article.className = `cf-site-card cf-site-card--full${isOpen ? ' is-open' : ''}`
      article.dataset.host = site.host
      article.innerHTML = `
        <button class="cf-site-card__head" data-action="toggle-site" data-host="${Contacts.esc(site.host)}" type="button" aria-expanded="${isOpen ? 'true' : 'false'}">
          <span class="cf-favicon" aria-hidden="true">
            <span class="cf-favicon__fallback">${Contacts.esc(Contacts.siteInitials(site.host))}</span>
            <img class="cf-favicon__image" src="${Contacts.esc(Contacts.faviconUrl(site))}" alt="" loading="lazy">
          </span>
          <span class="cf-site-card__main">
            <span class="cf-site-card__host">${Contacts.esc(site.host)}</span>
            <span class="cf-site-card__title">${Contacts.esc(site.pageTitle || site.websiteUrl || '')}</span>
          </span>
          <span class="cf-site-card__signals">
            <span class="cf-signal-group cf-signal-group--identity">
              <span class="cf-pill cf-pill--stage-${Contacts.cssToken(displayStage)}">${Contacts.esc(Contacts.stageLabel(displayStage))}</span>
              <span class="cf-pill cf-pill--priority-${Contacts.cssToken(displayPriority)}">${Contacts.esc(Contacts.priorityLabel(displayPriority))}</span>
              <span class="cf-pill cf-pill--contacted-${Contacts.cssToken(meta.contacted)}">${Contacts.esc(Contacts.contactedLabel(meta.contacted))}</span>
              ${industry ? `<span class="cf-pill cf-pill--industry">${Contacts.esc(Contacts.industryLabel(industry))}</span>` : ''}
              ${market.country ? `<span class="cf-country-pill">${Contacts.countryFlagImage(market.country)}<span>${Contacts.esc(Contacts.countryLabel(market.country))}</span></span>` : ''}
            </span>
            <span class="cf-signal-group cf-signal-group--scores">
              <span class="cf-pill">${Contacts.esc(contactCount)} records</span>
              <span class="cf-pill ${emailCount ? 'cf-pill--has-email' : 'cf-pill--no-email'}">${Contacts.esc(emailCount)} emails</span>
              <span class="cf-pill ${socialCount ? 'cf-pill--has-social' : 'cf-pill--no-social'}">${Contacts.esc(socialCount)} socials</span>
              <span class="cf-pill ${phoneCount ? 'cf-pill--has-phone' : 'cf-pill--no-phone'}">${Contacts.esc(phoneCount)} phones</span>
              <span class="cf-pill cf-pill--tech">${Contacts.esc(site.technologies.size)} technologies</span>
              <span class="cf-pill">${Contacts.esc(audit.wordCount || 0)} words</span>
              <span class="cf-domain-age-pill cf-domain-age-pill--${Contacts.esc(Contacts.domainAgeGrade(domainAge))}${Contacts.hasDomainAgeResult(domainAge) ? '' : ' hidden'}">${Contacts.esc(Contacts.domainAgeShortLabel(domainAge))}</span>
            </span>
          </span>
          <span class="cf-chevron">${isOpen ? 'Hide' : 'Show'}</span>
        </button>
        <div class="cf-site-card__body${isOpen ? '' : ' hidden'}" data-body-host="${Contacts.esc(site.host)}"${isOpen && Contacts.detailCache.has(site.host) ? ' data-hydrated="true"' : ''}>
          ${isOpen
            ? Contacts.detailCache.has(site.host)
              ? Contacts.renderSiteBody(Contacts.detailCache.get(site.host))
              : '<div class="cf-detail-loading"><span class="cf-list-loading__spinner"></span><strong>Loading full evidence...</strong><span>Loading saved contacts, content, technical, accessibility, SEO, technology, and CRM evidence for this website.</span></div>'
            : ''}
        </div>
      `

      const faviconImage = article.querySelector('.cf-favicon__image')
      if (faviconImage) {
        faviconImage.addEventListener('load', () => faviconImage.classList.add('is-loaded'), { once: true })
        faviconImage.addEventListener('error', () => faviconImage.remove(), { once: true })
      }

      fragment.appendChild(article)
    })

    list.replaceChildren(fragment)
    Contacts.ensureListEvents()
    Contacts.queueDomainAgeLookups(pageSites)
    Contacts.hydrateExpandedPage(pageSites).catch(() => {})
  },

  renderSiteBody(site) {
    const latestText = Contacts.formatDate(site.lastSeenAt || site.latest)
    const socialRows = Contacts.socialRows(site)
    const phoneRows = Contacts.phoneRows(site)

    return `
      <div class="cf-site-actions">
        <button class="cf-btn cf-btn--sm cf-btn--ghost cf-copy-site-emails" data-host="${Contacts.esc(site.host)}" type="button">Copy site emails</button>
        <button class="cf-btn cf-btn--sm cf-btn--ghost cf-copy-site-socials" data-host="${Contacts.esc(site.host)}" type="button">Copy site socials</button>
        <button class="cf-btn cf-btn--sm cf-btn--ghost cf-copy-site-tech" data-host="${Contacts.esc(site.host)}" type="button">Copy technologies</button>
        <button class="cf-btn cf-btn--sm cf-btn--accent cf-copy-site-template" data-host="${Contacts.esc(site.host)}" type="button">Copy review template</button>
        <button class="cf-btn cf-btn--sm cf-btn--ghost cf-copy-ai-prompt" data-host="${Contacts.esc(site.host)}" type="button">Copy analysis prompt</button>
        <button class="cf-btn cf-btn--sm cf-btn--ghost cf-download-site-raw" data-host="${Contacts.esc(site.host)}" type="button" title="Download every captured evidence field for this website as JSON">Download complete evidence</button>
        <a class="cf-btn cf-btn--sm cf-btn--ghost" href="${Contacts.esc(site.websiteUrl)}" target="_blank" rel="noopener noreferrer">Open site</a>
        <button class="cf-btn cf-btn--sm cf-btn--danger cf-delete-site" data-host="${Contacts.esc(site.host)}" type="button">Delete website</button>
      </div>
      <div class="cf-intelligence-mode-note">Verified evidence is shown separately from rule-based review aids. Manual CRM fields override suggested defaults. No local language model or paid AI API changes captured contacts, country evidence, technology detections, or measured website signals.</div>
      <section class="cf-contact-group cf-crm-management-group">
        <div class="cf-section-heading-row">
          <div>
            <h3>Manage this website</h3>
            <p class="cf-muted">Update your CRM stage, follow-up, manual industry or country, tags, and notes without scrolling through the full evidence.</p>
          </div>
          <span class="cf-auto-hint">Rule-based defaults · manual edits win</span>
        </div>
        ${Contacts.renderLeadMeta(site)}
      </section>
      ${Contacts.renderLeadSummary(site)}
      ${Contacts.renderVerifiedEvidence(site)}
      ${Contacts.renderDecisionIntelligence(site)}
      ${Contacts.renderDomainAge(site)}
      ${Contacts.renderLeadReasons(site)}
      ${Contacts.renderWebsiteHealth(site)}
      ${Contacts.renderSeoAudit(site)}
      ${Contacts.renderTechnicalEvidence(site)}
      ${Contacts.renderContactGroup('Emails', site.emails, site)}
      ${Contacts.renderContactGroup('Social links', socialRows)}
      ${Contacts.renderContactGroup('Phone / WhatsApp', phoneRows)}
      ${Contacts.renderTechnologies(site)}
      ${Contacts.isDebugView() ? Contacts.renderTechnologyHistory(site) : ''}
      <p class="cf-muted">Last seen: ${Contacts.esc(latestText)}</p>
    `
  },

  socialRows(site = {}) {
    return Contacts.uniqueContactRows([
      ...Contacts.toArray(site.socials),
      ...Contacts.toArray(site.contacts).filter((row) => row.type === 'social'),
    ])
      .filter((row) => !Contacts.isPhoneRow(row))
      .map((row) => {
        const value = Contacts.normaliseSocialUrl(row.value || row.url || row.href || '')
        return value ? { ...row, value, url: value } : { ...row, value: '' }
      })
      .filter((row) => Contacts.isLikelySocialProfileRow(row))
  },

  isLikelySocialProfileRow(row = {}) {
    const value = String(row.value || row.url || row.href || '').trim()
    if (!value || Contacts.isPhoneRow(row)) return false
    if (!Contacts.normaliseSocialUrl(value)) return false
    const lower = value.toLowerCase()
    return !/(?:widgets?\.js|button\.|follow_button|widget_iframe|sdk\.js|platform\.js|connect\.facebook|plugins\/|share\?|sharer|intent\/|\/embed\/|\/watch\?|\/status\/|\/statuses\/)/i.test(lower)
  },

  phoneRows(site = {}) {
    return Contacts.uniqueContactRows([
      ...Contacts.toArray(site.phoneRecords),
      ...Contacts.toArray(site.phones),
      ...Contacts.toArray(site.socials),
      ...Contacts.toArray(site.contacts).filter((row) => row.type === 'social' || row.type === 'phone'),
    ])
      .filter((row) => Contacts.isPhoneRow(row))
      .map((row) => Contacts.normalisePhoneRow(row))
      .filter((row) => row.value)
  },

  uniqueContactRows(rows = []) {
    const seen = new Set()
    return Contacts.toArray(rows).filter((row = {}) => {
      const key = [row.type || '', row.platform || '', row.value || row.url || row.href || row.email || ''].join(':').toLowerCase()
      if (!key.trim() || seen.has(key)) return false
      seen.add(key)
      return true
    })
  },

  normalisePhonePlatform(platform = '', value = '') {
    const text = `${platform || ''} ${value || ''}`.toLowerCase()
    if (/whatsapp|wa\.me|api\.whatsapp/.test(text)) return 'WhatsApp'
    return 'Phone'
  },

  normalisePhoneContactValue(row = {}, rawInput = '') {
    const raw = String(rawInput || row.value || row.url || row.href || '').trim()
    if (!raw) return ''
    const source = Contacts.toArray(row.sources).join(' ')
    const defaultCountry = String(row.country || row.countryCode || row.leadMeta?.country || '').toUpperCase()
    const intelligencePhone = globalThis.LeadLensIntelligence?.phoneCandidate?.(raw, {
      source,
      context: row.context || row.nearbyText || '',
      defaultCountry,
    })
    if (intelligencePhone && !intelligencePhone.possible) return ''
    const qualityPhone = globalThis.LeadLensQuality?.normalisePhone?.(raw, { defaultCountry })
    const e164 = intelligencePhone?.e164 || (qualityPhone?.possible ? qualityPhone.e164 : '')
    if (e164) {
      if (/whatsapp|wa\.me|api\.whatsapp/i.test(`${row.platform || ''} ${raw}`)) return `https://wa.me/${String(e164).replace(/\D/g, '')}`
      return `tel:${e164}`
    }
    try {
      const decoded = decodeURIComponent(raw)
      const whatsappMatch = decoded.match(/(?:https?:\/\/)?(?:api\.)?whatsapp\.com\/send\?phone=([+\d][\d\s().-]{6,})|(?:https?:\/\/)?wa\.me\/([+\d][\d\s().-]{6,})/i)
      if (whatsappMatch) {
        const digits = String(whatsappMatch[1] || whatsappMatch[2] || '').replace(/\D/g, '')
        const checked = globalThis.LeadLensIntelligence?.phoneCandidate?.(`+${digits}`, { source: 'WhatsApp link', defaultCountry })
        if (!checked || checked.possible) return `https://wa.me/${digits}`
      }
    } catch (error) { /* Keep conservative fallback. */ }
    if (intelligencePhone?.possible && intelligencePhone.national) return `tel:${intelligencePhone.national}`
    return ''
  },

  normalisePhoneRow(row = {}) {
    const value = Contacts.normalisePhoneContactValue(row)
    return {
      ...row,
      type: 'phone',
      platform: Contacts.normalisePhonePlatform(row.platform, value || row.value || row.url || row.href),
      value: value || row.value || row.url || row.href || '',
      url: row.url || (value && /^tel:/i.test(value) ? value : ''),
      phoneRecord: true,
    }
  },

  phoneDisplayValue(row = {}) {
    const value = String(row.value || row.url || row.href || '').trim()
    if (/^tel:/i.test(value)) return value.replace(/^tel:/i, '')
    if (/wa\.me\//i.test(value)) {
      const digits = value.replace(/.*wa\.me\//i, '').replace(/\D/g, '')
      return digits ? `WhatsApp: +${digits}` : value
    }
    return value
  },

  isPhoneRow(row = {}) {
    const haystack = [row.platform, row.value, row.url, row.href, ...Contacts.toArray(row.sources)].join(' ')
    return Boolean(row.phoneRecord) || /phone|tel:|telephone|call|whatsapp|wa\.me|api\.whatsapp/i.test(String(haystack || ''))
  },

  ensureListEvents() {
    if (Contacts.listEventsBound) return
    const list = document.getElementById('sites-list')
    if (!list) return

    Contacts.listEventsBound = true

    list.addEventListener('click', async (event) => {
      const target = event.target.closest('button, a')
      if (!target || !list.contains(target)) return

      if (target.matches('.cf-site-card__head')) {
        Contacts.toggleSiteCard(target)
        return
      }
      if (target.matches('[data-action="retry-detail"]')) {
        const body = target.closest('.cf-site-card__body')
        Contacts.loadLeadDetails(target.dataset.host, body, { force: true }).catch(() => {})
        return
      }
      if (target.matches('.cf-copy-site-emails')) return Contacts.copySite(target.dataset.host, 'email', target)
      if (target.matches('.cf-copy-site-socials')) return Contacts.copySite(target.dataset.host, 'social', target)
      if (target.matches('.cf-copy-site-tech')) return Contacts.copySiteTechnologies(target.dataset.host, target)
      if (target.matches('.cf-copy-site-template')) return Contacts.copySiteTemplate(target.dataset.host, target)
      if (target.matches('.cf-copy-ai-prompt')) return Contacts.copyAiPrompt(target.dataset.host, target)
      if (target.matches('.cf-download-site-raw')) return Contacts.downloadSiteRawJson(target.dataset.host, target)
      if (target.matches('.cf-copy-btn')) return Contacts.copyText(target.dataset.value, target)
      if (target.matches('.cf-delete-site')) return Contacts.deleteSite(target.dataset.host, target)
      if (target.matches('.cf-delete-btn')) return Contacts.deleteContactById(target.dataset.id, target.dataset.host, target)
    })

    list.addEventListener('input', (event) => {
      const input = event.target.closest('.cf-notes')
      if (input) Contacts.queueMetaSave(input.dataset.host)
    })

    list.addEventListener('change', (event) => {
      const input = event.target.closest('.cf-lead-field')
      if (!input) return
      if (input.dataset.field === 'country') {
        const flag = input.closest('.cf-country-select-wrap')?.querySelector('.cf-country-select-flag')
        if (flag) flag.innerHTML = input.value ? Contacts.countryFlagImage(input.value) : ''
      }
      Contacts.saveMeta(input.dataset.host, true, input.dataset.field)
    })
  },

  async toggleSiteCard(button) {
    const host = button.dataset.host
    const card = button.closest('.cf-site-card')
    const body = card?.querySelector('.cf-site-card__body')
    const chevron = button.querySelector('.cf-chevron')
    if (!card || !body || !host) return

    if (Contacts.expanded.has(host)) {
      Contacts.expanded.delete(host)
      card.classList.remove('is-open')
      body.classList.add('hidden')
      body.innerHTML = ''
      body.removeAttribute('data-hydrated')
      Contacts.detailCache.delete(host)
      button.setAttribute('aria-expanded', 'false')
      chevron.textContent = 'Show'
      return
    }

    Contacts.expanded.add(host)
    card.classList.add('is-open')
    body.classList.remove('hidden')
    button.setAttribute('aria-expanded', 'true')
    chevron.textContent = 'Hide'
    body.innerHTML = '<div class="cf-detail-loading"><span class="cf-list-loading__spinner"></span><strong>Loading full evidence...</strong><span>Loading saved contacts, content, technical, accessibility, SEO, technology, and CRM evidence for this website.</span></div>'
    body.removeAttribute('data-hydrated')

    try {
      await Contacts.loadLeadDetails(host, body)
    } catch (error) {
      Contacts.showToast(`Could not load ${host}. Retry from the expanded card.`, 'error')
    }
  },

  async deleteSite(host, button) {
    if (!host) return
    Contacts.setBusyButton(button, 'Deleting...')
    await Contacts.yieldToUi()
    try {
      await sendMessage('contacts.js', 'deleteLead', [host])
      Contacts.allData = Contacts.allData.filter((row) => row.websiteHost !== host)
      Contacts.expanded.delete(host)
      Contacts.detailCache.delete(host)
      Contacts.applyFilter()
      Contacts.showToast(`Lead deleted: ${host}`)
    } catch (error) {
      Contacts.flashButton(button, 'Delete failed')
      Contacts.showToast(`Could not delete ${host}: ${String(error?.message || error)}`, 'error')
    }
  },

  async deleteContactById(id, host, button) {
    if (!id) return
    Contacts.setBusyButton(button, '...')
    await Contacts.yieldToUi()
    try {
      await sendMessage('contacts.js', 'deleteContact', [id, host])
      Contacts.allData = Contacts.allData.filter((row) => row.id !== id)
      if (host && Contacts.detailCache.has(host)) {
        const cached = Contacts.detailCache.get(host)
        cached.contacts = Contacts.toArray(cached.contacts).filter((row) => row.id !== id)
        cached.emails = Contacts.toArray(cached.emails).filter((row) => row.id !== id)
        cached.socials = Contacts.toArray(cached.socials).filter((row) => row.id !== id)
        Contacts.rememberDetail(host, cached)
      }
      Contacts.applyFilter()
      Contacts.showToast('Contact removed successfully.')
    } catch (error) {
      Contacts.flashButton(button, 'Failed')
      Contacts.showToast(`Could not remove contact: ${String(error?.message || error)}`, 'error')
    }
  },

  renderContactGroup(title, rows, site = null) {
    if (!rows.length) {
      return `
        <section class="cf-contact-group">
          <h3>${Contacts.esc(title)}</h3>
          <p class="cf-muted">No ${Contacts.esc(title.toLowerCase())} found.</p>
        </section>
      `
    }

    return `
      <section class="cf-contact-group">
        <h3>${Contacts.esc(title)}</h3>
        ${title === 'Emails' ? Contacts.renderBestEmailPanel(site) : ''}
        <div class="cf-contact-list">
          ${rows.map((row) => Contacts.renderContact(row)).join('')}
        </div>
      </section>
    `
  },

  localSpeedProfile(site = {}) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const nav = audit.navTiming || raw.navTiming || {}
    const observed = Number(nav.load ?? nav.loadDuration ?? audit.loadDurationMs ?? raw.loadDurationMs ?? 0)
    const lcp = Number(audit.largestContentfulPaint ?? raw.largestContentfulPaint ?? 0)
    const ttfb = Number(nav.ttfb ?? 0)
    const basis = observed || lcp || ttfb || 0
    if (!basis) return { label: 'Not observed', score: null, ms: 0, note: 'Run a full scan to capture local browser speed evidence.' }
    const score = basis <= 2500 ? 95 : basis <= 4500 ? 80 : basis <= 7500 ? 60 : basis <= 15000 ? 40 : 20
    const label = score >= 85 ? 'Fast' : score >= 70 ? 'Good' : score >= 50 ? 'Moderate' : score >= 30 ? 'Slow' : 'Very slow'
    return { label, score, ms: Math.round(basis), note: 'Local observed browser timing; not a paid external speed test.' }
  },

  emailOutreachProfile(site = {}) {
    const best = Contacts.bestOutreachEmail(site)
    if (!best) return { label: 'No email', score: 0, note: 'No public outreach email was captured.' }
    const confidence = Contacts.emailConfidence(best)
    const role = Contacts.emailRoleIntent(best)
    const kind = Contacts.emailKind(best)
    let score = Number(confidence.score || 0)
    if (kind === 'direct') score += 8
    if (/outreach-friendly|decision-maker/i.test(role.label || '')) score += 5
    if (/support|privacy|legal|press/i.test(String(best.value || ''))) score -= 18
    score = Contacts.boundedScore(score)
    const label = score >= 85 ? 'Strong' : score >= 65 ? 'Usable' : score >= 45 ? 'Review first' : 'Weak'
    return {
      label,
      score,
      email: best.value,
      note: 'Local quality estimate only. Mailbox existence and delivery are not MX-verified.',
    }
  },

  freeSeoIntelligence(site = {}) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const speed = Contacts.localSpeedProfile(site)
    const totalImages = Number(audit.images ?? raw.images ?? 0)
    const imagesWithAlt = Number(audit.imagesWithAlt ?? raw.imagesWithAlt ?? 0)
    const altCoverage = totalImages ? Math.round((imagesWithAlt / totalImages) * 100) : null
    const canonical = audit.canonical || raw.canonical || ''
    const robots = audit.robots || raw.robots || ''
    const schemaTypes = Contacts.toArray(audit.schemaTypes || raw.schemaTypes)
    const indexability = /noindex/i.test(robots) ? 'Blocked by noindex' : 'Indexable signal'
    const localSignals = [audit.addressSignals, audit.mapSignals, audit.openingHourSignals, audit.hasLocalBusinessSchema].filter(Boolean).length
    return {
      indexability,
      canonical: canonical ? 'Canonical found' : 'Canonical missing',
      schema: schemaTypes.length ? `${schemaTypes.length} schema type${schemaTypes.length === 1 ? '' : 's'}` : 'Schema not found',
      images: altCoverage === null ? 'No image sample' : `${altCoverage}% image alt coverage`,
      local: `${localSignals}/4 local SEO signals`,
      speed: `${speed.label}${speed.ms ? ` · ${speed.ms} ms` : ''}`,
    }
  },

  renderBestEmailPanel(site) {
    const best = Contacts.bestOutreachEmail(site)

    if (!best) return ''

    const confidence = Contacts.emailConfidence(best)
    const outreachProfile = Contacts.emailOutreachProfile(site)

    return `
      <div class="cf-best-email">
        <span>Preferred public email</span>
        <strong>${Contacts.esc(best.value)}</strong>
        <em>${Contacts.esc(confidence.label)} rule-based quality (${Contacts.esc(confidence.score)}/100)</em>
        <small>${Contacts.esc(Contacts.emailRoleIntent(best).label)} - ${Contacts.esc(confidence.reasons.slice(0, 3).join(', '))}</small>
        <small><strong>Contact-path quality: ${Contacts.esc(outreachProfile.label)} (${Contacts.esc(outreachProfile.score)}/100)</strong> · ${Contacts.esc(outreachProfile.note)}</small>
      </div>
    `
  },

  renderLeadSummary(site) {
    const leadMeta = Contacts.normaliseLeadMeta(site.leadMeta)
    const opportunity = Contacts.opportunityScore(site)
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const decision = Contacts.decisionConfidence(site)
    const market = Contacts.marketDetection(site)
    const quality = Contacts.scanQuality(site)
    const displayStage = Contacts.displayLeadStageValue(site)
    const displayPriority = Contacts.displayLeadPriorityValue(site)
    const outreach = Contacts.outreachEligibility(site)

    return `
      <section class="cf-lead-summary">
        <div>
          <strong>${opportunity.score}/100</strong>
          <span>Improvement signal</span>
        </div>
        <div>
          <strong>${Contacts.esc(outreach.label)}</strong>
          <span>Contact-path suitability</span>
        </div>
        <div>
          <strong>${Contacts.esc(decision.label)}</strong>
          <span>Review confidence (${decision.score}/100)</span>
        </div>
        <div>
          <strong>${Contacts.esc(market.label)}</strong>
          <span>Location evidence (${market.confidence})</span>
        </div>
        <div>
          <strong>${Contacts.esc(quality.label)}</strong>
          <span>Scan quality</span>
        </div>
        <div>
          <strong>${Contacts.esc(site.emails.length ? 'Yes' : 'No')}</strong>
          <span>Email found</span>
        </div>
        <div>
          <strong>${Contacts.esc(String(site.contacts.length))}</strong>
          <span>Captured contact records</span>
        </div>
        <div>
          <strong>${Contacts.esc(Contacts.stageLabel(displayStage))}</strong>
          <span>Lead stage</span>
        </div>
        <div>
          <strong>${Contacts.esc(Contacts.priorityLabel(displayPriority))}</strong>
          <span>Priority</span>
        </div>
        <div>
          <strong>${Contacts.esc(Contacts.cleanIndustryLabel(leadMeta.industry, site))}</strong>
          <span>Industry</span>
        </div>
        <div>
          <strong>${Contacts.esc(Contacts.formatDate(site.latest))}</strong>
          <span>Last found</span>
        </div>
        <div>
          <strong>${Contacts.esc(Contacts.localSpeedProfile(site).label)}</strong>
          <span>Observed loading speed</span>
        </div>
        <div>
          <strong>${Contacts.esc(Contacts.emailOutreachProfile(site).label)}</strong>
          <span>Email contact quality</span>
        </div>
        <div>
          <strong>${Contacts.websiteHealth(site).score}</strong>
          <span>Website condition</span>
        </div>
        <div class="cf-domain-summary-card${Contacts.hasDomainAgeResult(domainAge) ? '' : ' hidden'}">
          <strong>${Contacts.esc(Contacts.domainAgeSummary(domainAge))}</strong>
          <span>Domain age</span>
        </div>
      </section>
    `
  },

  renderVerifiedEvidence(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const coverage = raw.evidenceCoverage || audit.evidenceCoverage || {}
    const mainContent = raw.mainContent || audit.mainContent || {}
    const accessibility = raw.accessibilityAudit || audit.accessibilityAudit || {}
    const explicitSignals = raw.explicitPageSignals || audit.explicitPageSignals || {}
    const dateEvidence = raw.dateEvidence || audit.dateEvidence || {}
    const validation = raw.recordValidation || audit.recordValidation || { success: true, issues: [] }
    const offerings = Contacts.toArray(explicitSignals.explicitOfferings).slice(0, 20)
    const policies = Contacts.toArray(explicitSignals.policyLinks).slice(0, 16)
    const languages = Contacts.toArray(explicitSignals.languages).slice(0, 16)
    const accessibilityIssues = Contacts.toArray(accessibility.issues).slice(0, 8)
    const validationIssues = Contacts.toArray(validation.issues).slice(0, 8)
    const machineDates = Contacts.toArray(dateEvidence.machineReadable).slice(0, 12)
    const visibleDates = Contacts.toArray(dateEvidence.visible).slice(0, 8)
    const copyrightYears = Contacts.toArray(dateEvidence.copyrightYears).slice(0, 10)
    const coverageMissing = Contacts.toArray(coverage.missing).map((value) => String(value).replace(/([a-z])([A-Z])/g, '$1 $2')).slice(0, 12)
    const mainExcerpt = String(mainContent.excerpt || '').trim()
    const mainTitle = String(mainContent.title || '').trim()
    const coverageScore = Number.isFinite(Number(coverage.score)) ? `${Math.round(Number(coverage.score))}/100` : 'Not measured'
    const validationLabel = validation.success === false ? `${validationIssues.length || 1} format warning${validationIssues.length === 1 ? '' : 's'}` : 'Passed basic format checks'

    return `
      <section class="cf-contact-group cf-verified-evidence-group">
        <div class="cf-section-heading-row">
          <div>
            <h3>Verified evidence overview</h3>
            <p class="cf-muted">Directly captured page facts and deterministic checks. This section does not qualify the lead or create business conclusions.</p>
          </div>
          <span class="cf-evidence-badge cf-evidence-badge--verified">Verified evidence</span>
        </div>
        <div class="cf-verified-evidence-grid">
          <article class="cf-verified-evidence-card">
            <span>Evidence coverage</span>
            <strong>${Contacts.esc(coverage.label || 'Not measured')} · ${Contacts.esc(coverageScore)}</strong>
            <small>${Contacts.esc(coverage.note || 'Coverage describes how much evidence was captured, not whether the website is a good prospect.')}</small>
            ${coverageMissing.length ? `<em>Not captured: ${Contacts.esc(coverageMissing.join(', '))}</em>` : ''}
          </article>
          <article class="cf-verified-evidence-card">
            <span>Main readable content</span>
            <strong>${Contacts.esc(mainTitle || 'Title not captured')}</strong>
            <small>${Contacts.esc(`${Number(mainContent.wordCount || 0)} words · ${mainContent.source || 'unknown source'}`)}</small>
            ${mainExcerpt ? `<p>${Contacts.esc(mainExcerpt)}</p>` : '<em>No readable excerpt captured.</em>'}
          </article>
          <article class="cf-verified-evidence-card">
            <span>Accessibility preflight</span>
            <strong>${Contacts.esc(`${Number(accessibility.issueCount || 0)} detected issue${Number(accessibility.issueCount || 0) === 1 ? '' : 's'}`)}</strong>
            <small>${Contacts.esc(accessibility.engine || 'Not run')} · automated preflight only</small>
            ${accessibilityIssues.length ? `<ul>${accessibilityIssues.map((issue) => `<li>${Contacts.esc(`${issue.description || issue.id}: ${issue.count || 0}`)}</li>`).join('')}</ul>` : '<em>No issue was detected by the available automated checks.</em>'}
          </article>
          <article class="cf-verified-evidence-card">
            <span>Evidence record validation</span>
            <strong>${Contacts.esc(validationLabel)}</strong>
            <small>Checks URL, host and captured email formats only; it is not deliverability verification.</small>
            ${validationIssues.length ? `<ul>${validationIssues.map((issue) => `<li>${Contacts.esc(`${issue.path || 'record'}: ${issue.message || 'Invalid value'}`)}</li>`).join('')}</ul>` : '<em>No basic format conflict detected.</em>'}
          </article>
        </div>
        <div class="cf-evidence-detail-grid">
          <div class="cf-evidence-detail-block">
            <h4>Explicit services or offerings</h4>
            ${offerings.length ? `<div class="cf-evidence-tags">${offerings.map((value) => `<span>${Contacts.esc(value)}</span>`).join('')}</div>` : '<p class="cf-muted">No explicit service or product headings were captured.</p>'}
          </div>
          <div class="cf-evidence-detail-block">
            <h4>Policy and operational links</h4>
            ${policies.length ? `<ul class="cf-evidence-link-list">${policies.map((item) => `<li><span>${Contacts.esc(item.type || 'link')}</span><a href="${Contacts.esc(item.url || '#')}" target="_blank" rel="noopener noreferrer">${Contacts.esc(item.text || item.url || 'Open page')}</a></li>`).join('')}</ul>` : '<p class="cf-muted">No matching policy or operational links were captured.</p>'}
          </div>
          <div class="cf-evidence-detail-block">
            <h4>Language evidence</h4>
            ${languages.length ? `<div class="cf-evidence-tags">${languages.map((value) => `<span>${Contacts.esc(value)}</span>`).join('')}</div>` : '<p class="cf-muted">No declared language or hreflang evidence was captured.</p>'}
          </div>
          <div class="cf-evidence-detail-block">
            <h4>Date evidence</h4>
            ${machineDates.length || visibleDates.length || copyrightYears.length
              ? `<dl class="cf-evidence-dates">
                  <div><dt>Machine-readable</dt><dd>${Contacts.esc(machineDates.join('; ') || 'None')}</dd></div>
                  <div><dt>Visible date text</dt><dd>${Contacts.esc(visibleDates.join('; ') || 'None')}</dd></div>
                  <div><dt>Copyright years</dt><dd>${Contacts.esc(copyrightYears.join(', ') || 'None')}</dd></div>
                </dl>`
              : '<p class="cf-muted">No date evidence was captured.</p>'}
          </div>
        </div>
      </section>
    `
  },

  renderDecisionIntelligence(site) {
    const market = Contacts.marketDetection(site)
    const decision = Contacts.decisionConfidence(site)
    const strategy = Contacts.outreachStrategy(site)
    const warning = Contacts.pageIntentWarning(site)
    const readiness = Contacts.outreachReadiness(site)
    const channels = Contacts.bestOutreachChannels(site)
    const conflicts = Contacts.consistencyWarnings(site)
    const duplicate = Contacts.duplicateLeadWarning(site)
    const business = strategy.business || Contacts.businessType(site)
    const size = business.size || { label: 'Small', confidence: 'Low', reasons: [] }
    const angles = strategy.angles?.length ? strategy.angles : globalThis.LeadLensIntelligence?.buildOutreachAngles?.(site, 5) || []
    const angleCards = angles.map((item, index) => `
      <article class="cf-outreach-angle-card${index === 0 ? ' cf-outreach-angle-card--primary' : ''}">
        <span>${index === 0 ? 'Primary outreach angle' : `Additional angle ${index + 1}`}</span>
        <strong>${Contacts.esc(item.title || item.id || 'Website review')}</strong>
        <p>${Contacts.esc(item.reason || '')}</p>
        ${Contacts.toArray(item.evidence).length ? `<ul>${Contacts.toArray(item.evidence).slice(0, 4).map((e) => `<li>${Contacts.esc(e)}</li>`).join('')}</ul>` : ''}
        <small>${Contacts.esc(item.confidence || 'Low')} confidence · ${Contacts.esc(item.direction || '')}</small>
      </article>
    `).join('')
    return `
      <section class="cf-contact-group">
        <h3>Business profile and outreach strategy</h3>
        <p class="cf-signal-note">Best-supported local estimates from captured evidence. Verify the company context before sending outreach; these are not external enrichment claims.</p>
        <div class="cf-pitch-grid">
          <div class="cf-pitch-card"><span>Most likely business type</span><strong>${Contacts.esc(business.label)}</strong><small>${Contacts.esc(`${business.confidence} confidence · ${(business.reasons || []).slice(0, 3).join(', ')}`)}</small></div>
          <div class="cf-pitch-card"><span>Estimated company size</span><strong>${Contacts.esc(size.label)}</strong><small>${Contacts.esc(`${size.confidence || 'Low'} confidence · exact employee count is not claimed`)}</small></div>
          <div class="cf-pitch-card"><span>Recommended approach</span><strong>${Contacts.esc(business.approach || strategy.angle)}</strong><small>${Contacts.esc(strategy.tone)}</small></div>
          <div class="cf-pitch-card"><span>Best available channel</span><strong>${Contacts.esc(strategy.channel)}</strong><small>${Contacts.esc(channels[0]?.reason || 'Use the clearest verified contact path.')}</small></div>
          <div class="cf-pitch-card"><span>Location evidence</span><strong>${Contacts.esc(market.label)}</strong><small>${Contacts.esc(`${market.confidence} confidence · ${market.reasons.join(', ')}`)}</small></div>
          <div class="cf-pitch-card"><span>Evidence confidence</span><strong>${Contacts.esc(`${decision.label} (${decision.score}/100)`)}</strong><small>${Contacts.esc(decision.reasons.slice(0, 3).join(', ') || 'Core signals captured')}</small></div>
          <div class="cf-pitch-card"><span>Contact readiness</span><strong>${Contacts.esc(`${readiness.score}/100 · ${readiness.label}`)}</strong><small>${Contacts.esc(readiness.reasons.slice(0, 3).join(', ') || 'Review captured contact paths.')}</small></div>
          <div class="cf-pitch-card"><span>Page-context caution</span><strong>${Contacts.esc(warning ? 'Use caution' : 'Usable context')}</strong><small>${Contacts.esc(warning || 'Normal business-page context was captured.')}</small></div>
          <div class="cf-pitch-card"><span>Report consistency</span><strong>${Contacts.esc(conflicts.length ? 'Check conflicts' : 'No conflict detected')}</strong><small>${Contacts.esc(conflicts.join(', ') || duplicate || 'Captured evidence is internally consistent.')}</small></div>
        </div>
        <div class="cf-outreach-angle-grid">${angleCards}</div>
      </section>
    `
  },

  renderDomainAge(site) {
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const statusLabel = Contacts.domainAgeStatusLabel(domainAge.status)

    if (!Contacts.hasDomainAgeResult(domainAge)) {
      return '<section class="cf-contact-group cf-domain-age-section hidden"></section>'
    }

    const details = [
      ['Root domain', domainAge.rootDomain || Contacts.rootDomain(site.host)],
      ['Registered', Contacts.formatDate(domainAge.registeredAt)],
      ['Updated', Contacts.formatDate(domainAge.updatedAt)],
      ['Expires', Contacts.formatDate(domainAge.expiresAt)],
      ['Registrar', domainAge.registrar],
      ['Checked', Contacts.formatDate(domainAge.checkedAt)],
    ].filter(([, value]) => value && value !== 'Unknown')

    return `
      <section class="cf-contact-group cf-domain-age-section">
        <h3>Domain age and company age signal</h3>
        <div class="cf-domain-panel cf-domain-panel--${Contacts.esc(
          Contacts.domainAgeGrade(domainAge)
        )}">
          <div class="cf-domain-scorebox">
            <strong>${Contacts.esc(Contacts.domainAgeSummary(domainAge))}</strong>
            <span>${Contacts.esc(statusLabel)}</span>
          </div>
          <div class="cf-domain-details">
            ${
              details.length
                ? details
                    .map(
                      ([label, value]) => `
                        <div class="cf-domain-detail">
                          <span>${Contacts.esc(label)}</span>
                          <strong>${Contacts.esc(value)}</strong>
                        </div>
                      `
                    )
                    .join('')
                : '<p class="cf-muted">No public domain dates are available yet.</p>'
            }
          </div>
        </div>
      </section>
    `
  },

  renderWebsiteHealth(site) {
    const exclusion = Contacts.leadExclusion(site)
    const eligibility = Contacts.prospectEligibility(site)

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      const reason = eligibility.reason || exclusion.reason || 'Manual review is required before using website improvement signals.'
      return `
        <section class="cf-contact-group">
          <h3>Website improvement signals</h3>
          <p class="cf-muted">${Contacts.esc(eligibility.status === 'excluded' || exclusion.excluded ? 'Excluded lead.' : 'Manual review required.')} ${Contacts.esc(reason)} Website redesign, SEO pitch, and sales recommendations are hidden until the real business page is verified.</p>
        </section>
      `
    }

    const health = Contacts.websiteHealth(site)
    const displaySignals = Contacts.buyerFacingHealthSignals(site)

    return `
      <section class="cf-contact-group">
        <h3>Website improvement signals</h3>
        <p class="cf-signal-note">Directional signals for lead research. Use these as clues, not as a final website audit.</p>
        <div class="cf-health-panel cf-health-panel--${Contacts.healthGrade(health.score)}">
          <div class="cf-health-scorebox">
            <strong>${Contacts.esc(health.score)}</strong>
            <span>${Contacts.esc(health.recommendation)}</span>
          </div>
          <div class="cf-health-categories">
            ${health.categories
              .map(
                ({ label, score }) => `
                  <div class="cf-health-category">
                    <span>${Contacts.esc(label)}</span>
                    <strong>${Contacts.esc(score)}</strong>
                  </div>
                `
              )
              .join('')}
          </div>
          <div class="cf-health-signals">
            ${displaySignals
              .map(
                ({ severity, label, detail }) => `
                  <div class="cf-health-signal cf-health-signal--${Contacts.esc(severity)}">
                    <strong>${Contacts.esc(label)}</strong>
                    <span>${Contacts.esc(detail)}</span>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </section>
    `
  },

  renderLeadReasons(site) {
    const verdict = Contacts.leadVerdict(site)
    const confidence = Contacts.scanConfidence(site)
    const isMinorOpportunity =
      !verdict.excluded &&
      Contacts.websiteHealth(site).score >= 75 &&
      Contacts.opportunityScore(site).score < 50
    const reasons = Contacts.leadQualityReasons(site)
    const painPoints = Contacts.painPointLabels(site)
    const opportunity = Contacts.opportunityScore(site)
    const topProblems = Contacts.uniqueTextItems(Contacts.topProblems(site))
    const services = Contacts.recommendedServices(site)
    const scoreReasons = Contacts.scoreReasons(site)

    return `
      <section class="cf-contact-group">
        <h3>Opportunity and pitch signals</h3>
        <div class="cf-pitch-grid">
          <div class="cf-pitch-card">
            <span>Pitch angle</span>
            <strong>${Contacts.esc(opportunity.pitch)}</strong>
          </div>
          <div class="cf-pitch-card">
            <span>${verdict.excluded ? 'Action' : 'Recommended service'}</span>
            <strong>${Contacts.esc(
              verdict.excluded
                ? 'Do not use for outreach'
                : services.join(', ') || 'Manual review'
            )}</strong>
          </div>
          <div class="cf-pitch-card">
            <span>${isMinorOpportunity ? 'Minor observations' : 'Top problems'}</span>
            <strong>${Contacts.esc(topProblems.join(', ') || 'No major problems detected')}</strong>
          </div>
          <div class="cf-pitch-card">
            <span>Data confidence reason</span>
            <strong>${Contacts.esc(confidence.reasons.join(', ') || 'Core signals captured')}</strong>
          </div>
          <div class="cf-pitch-card">
            <span>Reason-based score</span>
            <strong>${Contacts.esc(scoreReasons.slice(0, 3).join(', ') || 'No strong score reasons')}</strong>
            <small>${Contacts.esc(scoreReasons.slice(3).join(', ') || 'Use manual review for final judgment.')}</small>
          </div>
        </div>
        <h3>Lead quality reasons</h3>
        <div class="cf-reason-grid">
          ${reasons
            .map(
              ({ label, value, active }) => `
                <div class="cf-reason ${active ? 'cf-reason--active' : ''}">
                  <strong>${Contacts.esc(value)}</strong>
                  <span>${Contacts.esc(label)}</span>
                </div>
              `
            )
            .join('')}
        </div>
        <div class="cf-pain-list">
          ${
            painPoints.length
              ? painPoints
                  .map(
                    ({ label }) =>
                      `<span class="cf-pain-pill">${Contacts.esc(label)}</span>`
                  )
                  .join('')
              : '<span class="cf-muted">No major pain point labels detected.</span>'
          }
        </div>
      </section>
    `
  },

  renderSeoAudit(site) {
    const exclusion = Contacts.leadExclusion(site)
    const eligibility = Contacts.prospectEligibility(site)

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      return `
        <section class="cf-contact-group">
          <h3>SEO health signals</h3>
          <p class="cf-muted">SEO signals are hidden because this scan is not a normal outreach-ready website page. ${Contacts.esc(eligibility.reason || exclusion.reason || 'Verify the page first.')}</p>
        </section>
      `
    }

    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const leadMeta = Contacts.normaliseLeadMeta(site.leadMeta)
    const seoScore =
      leadMeta.seoScoreOverride !== ''
        ? Contacts.boundedScore(leadMeta.seoScoreOverride)
        : audit.score

    if (seoScore === null) {
      return `
        <section class="cf-contact-group">
          <h3>SEO health signals</h3>
          <p class="cf-muted">No SEO signal snapshot saved for this website yet. Visit the website again to scan it.</p>
        </section>
      `
    }

    return `
      <section class="cf-contact-group">
        <h3>SEO health signals</h3>
        <p class="cf-signal-note">Basic on-page signals for quick screening. This is not a full crawler audit or ranking guarantee.</p>
        <div class="cf-seo-panel cf-seo-panel--${Contacts.seoGrade(seoScore)}">
          <div class="cf-seo-panel__score">
            <strong>${Contacts.esc(seoScore)}</strong>
            <span>Signal score</span>
          </div>
          ${Contacts.renderSeoCategories(audit)}
          ${Contacts.renderSeoIssues(audit)}
          ${Contacts.renderFreeSeoIntelligence(site)}
          ${Contacts.renderSeoEvidence(audit)}
          <div class="cf-seo-checks">
            ${audit.checks
              .map(
                (check) => `
                  <div class="cf-seo-check ${
                    check.passed ? 'cf-seo-check--pass' : 'cf-seo-check--fail'
                  }" title="${Contacts.esc(Contacts.issueExplanation(check.label))}">
                    <span>${check.passed ? 'Pass' : 'Fix'}</span>
                    <strong>${Contacts.esc(check.label)}</strong>
                    <small>${Contacts.esc(check.detail || '')}</small>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </section>
    `
  },


  renderFreeSeoIntelligence(site = {}) {
    const intel = Contacts.freeSeoIntelligence(site)
    return `
      <div class="cf-free-seo-intelligence">
        <div><span>Indexability</span><strong>${Contacts.esc(intel.indexability)}</strong></div>
        <div><span>Canonical</span><strong>${Contacts.esc(intel.canonical)}</strong></div>
        <div><span>Structured data</span><strong>${Contacts.esc(intel.schema)}</strong></div>
        <div><span>Image SEO</span><strong>${Contacts.esc(intel.images)}</strong></div>
        <div><span>Local SEO coverage</span><strong>${Contacts.esc(intel.local)}</strong></div>
        <div><span>Local speed</span><strong>${Contacts.esc(intel.speed)}</strong></div>
      </div>
    `
  },

  renderSeoEvidence(audit = {}) {
    const evidence = audit.rawEvidence || {}
    const infra = audit.seoInfrastructure || {}
    const missingAlt = Math.max(0, Number(audit.images || 0) - Number(audit.imagesWithAlt || 0))
    const headingSummary = evidence.headingSummary
      ? Object.entries(evidence.headingSummary).map(([key, value]) => `${key.toUpperCase()} ${value}`).join(' · ')
      : `${audit.h1Count || 0} H1 · ${audit.headingCount || 0} headings`
    const robotsStatus = infra.robotsTxt?.checked
      ? `${infra.robotsTxt.found ? 'Found' : 'Not found'}${infra.robotsTxt.status ? ` (${infra.robotsTxt.status})` : ''}`
      : 'Not checked'
    const sitemapStatus = infra.sitemap?.checked
      ? `${infra.sitemap.found ? 'Found' : 'Not found'}${infra.sitemap.urlCount ? ` · ${infra.sitemap.urlCount} URLs` : ''}`
      : 'Not checked'
    const cards = [
      ['Title', evidence.title || audit.title || 'Not found', `${evidence.titleLength ?? String(evidence.title || audit.title || '').length} chars`],
      ['Meta description', evidence.description || 'Not found', `${evidence.descriptionLength ?? audit.descriptionLength ?? 0} chars`],
      ['Headings', headingSummary, Contacts.toArray(evidence.h1Texts).slice(0, 2).join(' | ')],
      ['Images', `${audit.images || 0} total · ${missingAlt} missing alt`, `${audit.brokenImages || 0} broken`],
      ['Links', `${audit.internalLinks || 0} internal · ${audit.externalLinks || 0} external`, `${audit.emptyLinks || 0} placeholder`],
      ['Schema', Contacts.toArray(audit.schemaTypes || evidence.schemaTypes).join(', ') || 'Not found', `${audit.jsonLdCount || 0} JSON-LD blocks`],
      ['Robots.txt', robotsStatus, Contacts.toArray(infra.robotsTxt?.sitemapUrls).slice(0, 2).join(' | ')],
      ['Sitemap', sitemapStatus, infra.sitemap?.url || ''],
      ['Local performance', `FCP ${audit.firstContentfulPaint || evidence.firstContentfulPaint || 0}ms · LCP ${audit.largestContentfulPaint || evidence.largestContentfulPaint || 0}ms`, `CLS ${audit.cumulativeLayoutShift ?? evidence.cumulativeLayoutShift ?? 0}`],
      ['Raw text', evidence.pageTextPreview ? `${evidence.pageTextPreview.length} chars preview saved` : 'Not saved', 'Used for proof only'],
    ]

    return `
      <div class="cf-seo-evidence-grid">
        ${cards.map(([label, value, detail]) => `
          <div class="cf-seo-evidence-card">
            <span>${Contacts.esc(label)}</span>
            <strong>${Contacts.esc(value)}</strong>
            <small>${Contacts.esc(detail || '')}</small>
          </div>
        `).join('')}
      </div>
    `
  },

  renderSeoCategories(audit) {
    const categories = Object.values(audit.categories || {})

    if (!categories.length) return ''

    return `
      <div class="cf-seo-categories">
        ${categories
          .map(
            ({ label, score }) => `
              <div class="cf-seo-category">
                <span>${Contacts.esc(label)}</span>
                <strong>${Contacts.esc(score)}</strong>
              </div>
            `
          )
          .join('')}
      </div>
    `
  },

  renderSeoIssues(audit) {
    const issues = Contacts.toArray(audit.issueDetails)

    if (!issues.length) {
      return `
        <div class="cf-seo-issues">
          <div class="cf-seo-issue cf-seo-issue--pass">
            <strong>No priority SEO issues found.</strong>
            <span>Core on-page checks look healthy.</span>
          </div>
        </div>
      `
    }

    return `
      <div class="cf-seo-issues">
        ${issues
          .slice(0, 8)
          .map(
            ({ label, detail, severity }) => `
              <div class="cf-seo-issue cf-seo-issue--${Contacts.esc(severity)}">
                <strong>${Contacts.esc(label)}</strong>
                <span>${Contacts.esc(detail || '')}</span>
              </div>
            `
          )
          .join('')}
      </div>
    `
  },

  renderLeadMeta(site) {
    const industryValue = Contacts.leadIndustryValue(site)
    const countryValue = Contacts.marketDetection(site).country

    return `
      <section class="cf-lead-meta">
        <label>
          <span>Lead stage</span>
          <select class="cf-lead-field" data-field="stage" data-host="${Contacts.esc(site.host)}">
            ${Contacts.renderOptions(
              [
                ['new', 'New'],
                ['qualified', 'Qualified'],
                ['contacted', 'Contacted'],
                ['follow-up', 'Follow-up'],
                ['won', 'Won'],
                ['not-needed', 'Not needed'],
                ['manual_review', 'Manual Review'],
                ['excluded', 'Excluded'],
              ],
              Contacts.displayLeadStageValue(site)
            )}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select class="cf-lead-field" data-field="priority" data-host="${Contacts.esc(site.host)}">
            ${Contacts.renderOptions(
              [
                ['normal', 'Normal'],
                ['high', 'High'],
                ['low', 'Low'],
                ['manual_review', 'Manual Review'],
                ['excluded', 'Excluded'],
              ],
              Contacts.displayLeadPriorityValue(site)
            )}
          </select>
        </label>
        <label>
          <span>Contacted?</span>
          <select class="cf-lead-field" data-field="contacted" data-host="${Contacts.esc(site.host)}">
            ${Contacts.renderOptions(
              [
                ['no', 'No'],
                ['yes', 'Yes'],
                ['later', 'Follow up later'],
              ],
              site.leadMeta?.contacted
            )}
          </select>
        </label>
        <label>
          <span>Industry</span>
          <select class="cf-lead-field" data-field="industry" data-host="${Contacts.esc(site.host)}">
            ${Contacts.renderOptions(
              [['', 'Unassigned'], ...Contacts.industryOptions(true)],
              industryValue
            )}
          </select>
        </label>
        <label>
          <span>Country</span>
          <span class="cf-country-select-wrap">
            <span class="cf-country-select-flag" aria-hidden="true">${countryValue ? Contacts.countryFlagImage(countryValue) : ''}</span>
            <select class="cf-lead-field" data-field="country" data-host="${Contacts.esc(site.host)}">
              ${Contacts.renderOptions(
                [['', 'Unassigned'], ...Contacts.countryOptions()],
                countryValue
              )}
            </select>
          </span>
        </label>
        <label>
          <span>Tags</span>
          <input class="cf-lead-field" data-field="tagsText" data-host="${Contacts.esc(site.host)}" type="text" placeholder="restaurant, uk, redesign" value="${Contacts.esc(
            Contacts.toArray(site.leadMeta?.tags).join(', ')
          )}">
        </label>
        <label>
          <span>Follow-up date</span>
          <input class="cf-lead-field" data-field="followUpDate" data-host="${Contacts.esc(site.host)}" type="date" value="${Contacts.esc(site.leadMeta?.followUpDate || '')}">
        </label>
        <label>
          <span>Manual SEO score</span>
          <input class="cf-lead-field" data-field="seoScoreOverride" data-host="${Contacts.esc(site.host)}" type="number" min="0" max="100" placeholder="Auto" value="${Contacts.esc(site.leadMeta?.seoScoreOverride ?? '')}">
        </label>
        <label>
          <span>Manual opportunity score</span>
          <input class="cf-lead-field" data-field="opportunityScoreOverride" data-host="${Contacts.esc(site.host)}" type="number" min="0" max="100" placeholder="Auto" value="${Contacts.esc(site.leadMeta?.opportunityScoreOverride ?? '')}">
        </label>
        <label>
          <span>Manual pain labels</span>
          <input class="cf-lead-field" data-field="painLabelsText" data-host="${Contacts.esc(site.host)}" type="text" placeholder="Sellable lead, weak SEO" value="${Contacts.esc(
            Contacts.toArray(site.leadMeta?.painLabels).join(', ')
          )}">
        </label>
        <label>
          <span>Notes</span>
          <textarea class="cf-notes" data-host="${Contacts.esc(site.host)}" rows="3" placeholder="Add sales notes, owner, context...">${Contacts.esc(site.leadMeta?.notes || '')}</textarea>
        </label>
      </section>
    `
  },

  queueMetaSave(host) {
    clearTimeout(Contacts.saveMetaTimers[host])

    Contacts.saveMetaTimers[host] = setTimeout(() => Contacts.saveMeta(host), 500)
  },

  async saveMeta(host, shouldRender = false, changedField = '') {
    const notesEl = document.querySelector(
      `.cf-notes[data-host="${CSS.escape(host)}"]`
    )
    if (!notesEl) return

    const site = Contacts.filteredSites.find((item) => item.host === host)
    const meta = Contacts.normaliseLeadMeta({
      ...(site?.leadMeta || {}),
      notes: notesEl.value,
    })
    const fields = document.querySelectorAll(
      `.cf-lead-field[data-host="${CSS.escape(host)}"]`
    )

    for (const field of fields) {
        if (field.dataset.field === 'tagsText') {
          meta.tags = field.value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        } else if (field.dataset.field === 'painLabelsText') {
          meta.painLabels = field.value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        } else if (
          field.dataset.field === 'seoScoreOverride' ||
          field.dataset.field === 'opportunityScoreOverride'
        ) {
          const value = Number(field.value)
          meta[field.dataset.field] =
            field.value === '' || Number.isNaN(value)
              ? ''
              : Contacts.boundedScore(value)
        } else if (
          field.dataset.field === 'industry' &&
          field.value === '__custom'
        ) {
          const industry = await Contacts.addCustomIndustry()

          if (!industry) return

          meta.industry = industry
        } else {
          meta[field.dataset.field] = field.value
        }
      }

    if (changedField === 'stage') meta.stageManual = true
    if (changedField === 'priority') meta.priorityManual = true
    if (changedField === 'industry') meta.industryManual = true
    if (changedField === 'country') meta.countryManual = true

    await sendMessage('contacts.js', 'updateLeadMeta', [host, meta])
    Contacts.allData = Contacts.allData.map((row) =>
      row.websiteHost === host ? { ...row, leadMeta: meta } : row
    )
    if (shouldRender) {
      Contacts.applyFilter()
      const labels = { stage: 'Lead stage', priority: 'Priority', contacted: 'Contact status', industry: 'Industry', country: 'Country', tagsText: 'Tags', followUpDate: 'Follow-up date', seoScoreOverride: 'Manual SEO score', opportunityScoreOverride: 'Manual opportunity score', painLabelsText: 'Pain labels' }
      Contacts.showToast(`${labels[changedField] || 'Lead details'} saved.`, 'info')
    }
  },

  renderTechnologies(site) {
    const technologies = [...site.technologies.values()]

    if (!technologies.length) {
      return `
        <section class="cf-contact-group">
          <h3>Technologies</h3>
          <p class="cf-muted">No saved technologies for this website yet.</p>
        </section>
      `
    }

    return `
      <section class="cf-contact-group">
        <h3>Technologies</h3>
        <div class="cf-tech-list">
          ${technologies
            .map(
              ({ name, version, confidence, categories, icon }) => `
                <span class="cf-tech-chip" title="${Contacts.esc(
                  (categories || []).map(({ name }) => name).join(', ')
                )}">
                  ${Contacts.renderTechnologyIcon(icon, name)}
                  ${Contacts.esc(name)}${version ? ` ${Contacts.esc(version)}` : ''}
                  ${confidence && confidence < 100 ? ` (${confidence}%)` : ''}
                </span>
              `
            )
            .join('')}
        </div>
      </section>
    `
  },

  renderContact(row) {
    const phoneRow = Contacts.isPhoneRow(row)
    const rawValue = row.value || row.url || ''
    const displayValue = phoneRow ? Contacts.phoneDisplayValue(row) : rawValue
    const phoneHref = row.url || row.href || (/^tel:/i.test(rawValue) || /wa\.me|whatsapp/i.test(rawValue) ? rawValue : `tel:${String(displayValue).replace(/[^+\d]/g, '')}`)
    const href = row.type === 'email' ? `mailto:${row.value}` : phoneRow ? phoneHref : rawValue
    const emailConfidence =
      row.type === 'email' ? Contacts.emailConfidence(row) : null
    const label =
      phoneRow
        ? row.platform || 'Phone'
        : row.type === 'social'
        ? row.platform || 'Social'
        : Contacts.emailKind(row) === 'platform'
        ? 'Platform email'
        : Contacts.emailKind(row) === 'personal'
        ? 'Personal email'
        : Contacts.emailKind(row) === 'related-domain'
        ? 'Related-domain email'
        : 'Direct email'

    return `
      <div class="cf-contact-row">
        <span class="cf-type">${Contacts.esc(label)}</span>
        <span class="cf-contact-value-wrap">
          <a class="cf-value" href="${Contacts.esc(href)}" target="_blank" rel="noopener noreferrer">${Contacts.esc(displayValue)}</a>
          ${emailConfidence ? Contacts.renderEmailVerification(emailConfidence, Contacts.emailRoleIntent(row)) : ''}
        </span>
        ${Contacts.renderStatusBadge(row)}
        ${Contacts.renderCompactSources(row)}
        <span class="cf-date">${Contacts.esc(Contacts.formatDate(row.foundAt))}</span>
        <span class="cf-contact-actions">
          <button class="cf-icon-action cf-copy-btn" data-value="${Contacts.esc(displayValue)}" type="button" title="Copy">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"></path></svg>
          </button>
          <button class="cf-icon-action cf-icon-action--danger cf-delete-btn" data-id="${Contacts.esc(row.id)}" data-host="${Contacts.esc(row.websiteHost || '')}" type="button" title="Delete">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"></path></svg>
          </button>
        </span>
      </div>
    `
  },

  renderCompactSources(row = {}) {
    const sources = Contacts.toArray(row.sources).filter(Boolean)
    if (!sources.length) return '<span class="cf-source">page</span>'
    if (sources.length <= 2) return `<span class="cf-source">${Contacts.esc(sources.join(', '))}</span>`

    return `
      <details class="cf-source-details">
        <summary>${Contacts.esc(sources.slice(0, 2).join(', '))} <strong>+${sources.length - 2} more</strong></summary>
        <span>${Contacts.esc(sources.join(', '))}</span>
      </details>
    `
  },

  renderEmailVerification(confidence, role = null) {
    const level = String(confidence.label || 'Low').toLowerCase()

    return `
      <span class="cf-email-verification cf-email-verification--${Contacts.esc(level)}" title="${Contacts.esc(confidence.reasons.join(', '))}">
        ${Contacts.esc(confidence.label)} confidence
        <span>${Contacts.esc(`${confidence.score}/100`)}</span>
      </span>
      <span class="cf-email-reasons">${Contacts.esc(
        [role?.label, ...confidence.reasons.slice(0, 2)].filter(Boolean).join(', ')
      )}</span>
    `
  },

  renderTechnologyHistory(site) {
    const changes = Contacts.toArray(site.technologyHistory?.changes).filter(
      ({ added, removed }) =>
        !(Contacts.toArray(added).length && Contacts.toArray(removed).length)
    )

    if (!changes.length) return ''

    return `
      <section class="cf-contact-group">
        <h3>Technology changes</h3>
        <div class="cf-history-list">
          ${changes
            .slice(0, 5)
            .map(
              ({ dateTime, added, removed }) => `
                <div class="cf-history-row">
                  <span>${Contacts.esc(Contacts.formatDate(dateTime))}</span>
                  <span>+ ${Contacts.esc(Contacts.toArray(added).join(', ') || 'None')}</span>
                  <span>- ${Contacts.esc(Contacts.toArray(removed).join(', ') || 'None')}</span>
                </div>
              `
            )
            .join('')}
        </div>
      </section>
    `
  },

  renderTechnologyIcon(icon, name) {
    if (!icon) return ''

    return `<img class="cf-tech-icon" src="../images/icons/${Contacts.esc(
      icon
    )}" alt="${Contacts.esc(name)}">`
  },

  renderStatusBadge(row) {
    return `<span class="cf-badge cf-badge--${Contacts.esc(
      row.status || 'found'
    )}">${Contacts.esc(Contacts.statusLabel(row.status))}</span>`
  },

  renderOptions(options, selected) {
    return options
      .map(
        ([value, label]) =>
          `<option value="${Contacts.esc(value)}"${
            (selected || '') === value ? ' selected' : ''
          }>${Contacts.esc(label)}</option>`
      )
      .join('')
  },

  industryOptions(includeCustomAction = false) {
    const base = [
      ['restaurant', 'Restaurant / food business'],
      ['legal', 'Law firm / legal services'],
      ['clinic', 'Clinic / healthcare'],
      ['ecommerce', 'Ecommerce / retail'],
      ['real-estate', 'Real estate'],
      ['hospitality', 'Hotel / hospitality'],
      ['home-services', 'Home services'],
      ['cleaning', 'Cleaning services'],
      ['salon-spa', 'Salon / spa'],
      ['fitness', 'Gym / fitness'],
      ['education', 'Education'],
      ['nonprofit', 'Nonprofit / charity'],
      ['construction', 'Construction'],
      ['portfolio', 'Portfolio / personal brand'],
      ['local-business', 'Local business'],
      ['agency', 'Agency'],
      ['other', 'Other'],
    ]
    const customs = Contacts.customIndustries
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((industry) => [industry, industry])

    return includeCustomAction
      ? [...base, ...customs, ['__custom', 'Add custom industry...']]
      : [...base, ...customs]
  },

  countryOptions() {
    const displayNames =
      typeof Intl !== 'undefined' && Intl.DisplayNames
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null

    return COUNTRY_CODES.map((code) => {
      const label = displayNames ? displayNames.of(code) : code
      return [code, label]
    }).sort((a, b) => a[1].localeCompare(b[1]))
  },

  countryLabel(code) {
    if (code === 'MULTI') return 'Multiple markets'
    if (!code) return 'Unassigned'

    const displayNames =
      typeof Intl !== 'undefined' && Intl.DisplayNames
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null

    try {
      const normalised = Contacts.normaliseCountryValue(code)

      return displayNames && normalised.length === 2
        ? displayNames.of(normalised)
        : code
    } catch (error) {
      return code
    }
  },

  countryFlag(code) {
    const value = Contacts.normaliseCountryValue(code)

    if (!/^[A-Z]{2}$/.test(value)) return ''

    return value
      .split('')
      .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
      .join('')
  },

  countryFlagImage(code) {
    const value = Contacts.normaliseCountryValue(code).toLowerCase()

    if (!/^[a-z]{2}$/.test(value)) return ''

    return `<img class="cf-country-flag" src="https://flagcdn.com/24x18/${Contacts.esc(
      value
    )}.png" alt="" loading="lazy">`
  },

  normaliseCountryValue(value) {
    const country = String(value || '').trim()
    const plainCountry = country.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '').trim()
    if (!country) return ''
    if (/^[A-Z]{2}$/i.test(country)) return country.toUpperCase()
    const match = Contacts.countryOptions().find(([code, label]) => label.toLowerCase() === country.toLowerCase() || label.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '').trim().toLowerCase() === plainCountry.toLowerCase())
    return match ? match[0] : country
  },

  async addCustomIndustry() {
    const raw = window.prompt('Enter custom industry name')
    const industry = String(raw || '').trim()

    if (!industry) return ''

    const exists = Contacts.customIndustries.some(
      (item) => item.toLowerCase() === industry.toLowerCase()
    )

    if (!exists) {
      Contacts.customIndustries = [...Contacts.customIndustries, industry].sort(
        (a, b) => a.localeCompare(b)
      )
      await setOption('customIndustries', Contacts.customIndustries)
      Contacts.populateStaticFilters()
    }

    return industry
  },

  renderPagination() {
    const totalPages = Math.ceil(Contacts.filteredSites.length / Contacts.pageSize)
    const targets = ['pagination-top', 'pagination']
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    Contacts.page = Math.min(Math.max(Contacts.page, 1), Math.max(totalPages, 1))

    targets.forEach((pagination) => {
      pagination.innerHTML = ''
      if (!Contacts.filteredSites.length) return

      const makeButton = (label, page, disabled, active, ariaLabel = '') => {
        const button = document.createElement('button')
        button.className = `cf-page-btn${active ? ' active' : ''}`
        button.textContent = label
        button.disabled = disabled
        if (ariaLabel) button.setAttribute('aria-label', ariaLabel)
        button.addEventListener('click', () => Contacts.goToPage(page))
        return button
      }

      const start = (Contacts.page - 1) * Contacts.pageSize + 1
      const end = Math.min(Contacts.page * Contacts.pageSize, Contacts.filteredSites.length)
      const summary = document.createElement('div')
      const controls = document.createElement('div')
      const jump = document.createElement('label')
      const pageInput = document.createElement('input')

      summary.className = 'cf-pagination__summary'
      summary.innerHTML = `<strong>${start}-${end}</strong><span>of ${Contacts.filteredSites.length} websites</span>`
      controls.className = 'cf-pagination__controls'
      jump.className = 'cf-pagination__jump'
      jump.appendChild(document.createTextNode('Page '))

      controls.appendChild(makeButton('«', 1, Contacts.page === 1, false, 'First page'))
      controls.appendChild(makeButton('‹', Contacts.page - 1, Contacts.page === 1, false, 'Previous page'))

      Contacts.visiblePages(totalPages).forEach((page) => {
        if (page === 'gap') {
          const gap = document.createElement('span')
          gap.className = 'cf-page-gap'
          gap.textContent = '…'
          controls.appendChild(gap)
        } else {
          controls.appendChild(makeButton(String(page), page, false, page === Contacts.page, `Page ${page}`))
        }
      })

      controls.appendChild(makeButton('›', Contacts.page + 1, Contacts.page === totalPages, false, 'Next page'))
      controls.appendChild(makeButton('»', totalPages, Contacts.page === totalPages, false, 'Last page'))

      pageInput.className = 'cf-page-input'
      pageInput.type = 'number'
      pageInput.min = '1'
      pageInput.max = String(totalPages)
      pageInput.value = String(Contacts.page)
      pageInput.addEventListener('change', () => Contacts.goToPage(pageInput.value))
      jump.appendChild(pageInput)
      jump.appendChild(document.createTextNode(` / ${totalPages}`))

      pagination.appendChild(summary)
      pagination.appendChild(controls)
      pagination.appendChild(jump)
    })
  },

  visiblePages(totalPages) {
    const pages = new Set([1, totalPages])

    for (
      let page = Math.max(1, Contacts.page - 2);
      page <= Math.min(totalPages, Contacts.page + 2);
      page += 1
    ) {
      pages.add(page)
    }

    return [...pages]
      .sort((a, b) => a - b)
      .reduce((items, page, index, sorted) => {
        if (index && page - sorted[index - 1] > 1) items.push('gap')
        items.push(page)
        return items
      }, [])
  },

  async copyByType(type) {
    const button = document.getElementById(type === 'email' ? 'btn-copy-emails' : 'btn-copy-socials')
    const values = []

    Contacts.setBusyButton(button, `Preparing 0/${Contacts.filteredSites.length}...`)
    for (let index = 0; index < Contacts.filteredSites.length; index += 1) {
      values.push(...Contacts.contactValuesForSite(Contacts.filteredSites[index], type))
      if (index % 10 === 0 || index === Contacts.filteredSites.length - 1) {
        Contacts.setBusyButton(button, `Preparing ${index + 1}/${Contacts.filteredSites.length}...`)
        await Contacts.yieldToUi()
      }
    }

    await Contacts.copyList(values, button, {
      largeTextLimit: 160000,
      largeFileName: type === 'email' ? 'leadlens-emails.txt' : 'leadlens-social-links.txt',
      largeLabel: 'Downloaded',
    })
  },

  contactValuesForSite(site, type) {
    if (!site) return []
    const sourceRows = type === 'email'
      ? [...Contacts.toArray(site.emails), ...Contacts.toArray(site.contacts).filter((row) => row.type === 'email')].filter((row) => Contacts.emailConfidence(row).label !== 'Invalid')
      : type === 'phone'
      ? Contacts.phoneRows(site)
      : Contacts.socialRows(site)

    return [...new Set(sourceRows
      .map((row) => type === 'phone' ? Contacts.phoneDisplayValue(row) : row?.value || row?.email || row?.url || row?.href || '')
      .filter(Boolean))]
  },

  async copySite(host, type, button) {
    const summary = Contacts.filteredSites.find((item) => item.host === host)
    const site = summary ? await Contacts.loadLeadDetails(host).catch(() => summary) : null
    const values = Contacts.contactValuesForSite(site, type)

    Contacts.copyList(values, button, {
      largeTextLimit: 160000,
      largeFileName: `${Contacts.safeFilename(host || 'lead')}-${type === 'email' ? 'emails' : 'socials'}.txt`,
      largeLabel: 'Downloaded',
    })
  },

  async copySiteTechnologies(host, button) {
    const summary = Contacts.filteredSites.find((item) => item.host === host)
    const site = summary ? await Contacts.loadLeadDetails(host).catch(() => summary) : null
    const values = site ? Contacts.technologyLines(site) : []
    Contacts.copyList(values, button)
  },

  async copyAllTechnologies() {
    const button = document.getElementById('btn-copy-tech')
    const values = []

    Contacts.setBusyButton(button, 'Preparing...')
    const detailedSites = await Contacts.ensureDetailedSites(Contacts.filteredSites, button)
    for (let index = 0; index < detailedSites.length; index += 1) {
      const site = detailedSites[index]
      const lines = Contacts.technologyLines(site)

      if (lines.length) values.push(`${site.host}\n${lines.join('\n')}`)
      if (button && (index % 5 === 0 || index === detailedSites.length - 1)) Contacts.setBusyButton(button, `Copying ${index + 1}/${detailedSites.length}...`)
      if (index % 5 === 0) await Contacts.yieldToUi()
    }

    await Contacts.copyList(values, button, {
      largeTextLimit: 180000,
      largeFileName: 'leadlens-technologies.txt',
      largeLabel: 'Downloaded',
    })
  },

  technologyLines(site = {}) {
    return [...(site.technologies?.values?.() || [])].map(
      ({ name, version, confidence, categories }) =>
        [
          `- ${name}${version ? ` ${version}` : ''}`,
          confidence ? `  Confidence: ${confidence}%` : '',
          Contacts.toArray(categories).length
            ? `  Categories: ${Contacts.toArray(categories)
                .map(({ name }) => name)
                .join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
    )
  },

  async copyAllTemplates() {
    const button = document.getElementById('btn-copy-template')
    const templates = []

    Contacts.setBusyButton(button, 'Preparing...')
    const detailedSites = await Contacts.ensureDetailedSites(Contacts.filteredSites, button)
    for (let index = 0; index < detailedSites.length; index += 1) {
      templates.push(Contacts.safeTemplateForSite(detailedSites[index]))
      if (button && (index % 5 === 0 || index === detailedSites.length - 1)) Contacts.setBusyButton(button, `Copying ${index + 1}/${detailedSites.length}...`)
      if (index % 5 === 0) await Contacts.yieldToUi()
    }

    await Contacts.copyText(
      templates.join('\n\n---\n\n'),
      button,
      { largeTextLimit: 180000, largeFileName: 'leadlens-lead-templates.txt', largeLabel: 'Downloaded' }
    )
  },

  async copySiteTemplate(host, button) {
    const summary = Contacts.filteredSites.find((item) => item.host === host)
    const site = summary ? await Contacts.loadLeadDetails(host).catch(() => summary) : null
    if (!site) return
    Contacts.copyText(Contacts.safeTemplateForSite(site), button)
  },

  safeTemplateForSite(site) {
    try {
      return Contacts.templateForSite(site)
    } catch (error) {
        const verdict = Contacts.leadVerdict(site)
      const strategy = Contacts.outreachStrategy(site)

      return [
        'LeadLens Lead Template',
        `Website: ${site?.host || ''}`,
        `URL: ${site?.websiteUrl || ''}`,
        `Page title: ${site?.pageTitle || ''}`,
        `Lead validation: ${verdict.label} - ${verdict.reason}`,
        `Suggested outreach angle: ${strategy.angle}`,
        `Best outreach channel: ${strategy.channel}`,
        `Template note: Full template generation failed, so LeadLens copied a safe fallback template.`,
      ].join('\n')
    }
  },

  async copyAiPrompt(host, button) {
    const summary = Contacts.filteredSites.find((item) => item.host === host)
    const site = summary ? await Contacts.loadLeadDetails(host).catch(() => summary) : null
    if (!site) return
    Contacts.copyText(Contacts.aiPromptForSite(site), button)
  },

  async copyAllAiPrompts() {
    const button = document.getElementById('btn-copy-ai-prompts')
    const prompts = []

    Contacts.setBusyButton(button, 'Preparing...')
    const detailedSites = await Contacts.ensureDetailedSites(Contacts.filteredSites, button)
    for (let index = 0; index < detailedSites.length; index += 1) {
      const site = detailedSites[index]
      prompts.push(`Website: ${site.host}
${Contacts.aiPromptForSite(site)}`)
      if (button && (index % 5 === 0 || index === detailedSites.length - 1)) Contacts.setBusyButton(button, `Copying ${index + 1}/${detailedSites.length}...`)
      if (index % 5 === 0) await Contacts.yieldToUi()
    }

    await Contacts.copyText(
      prompts.join('\n\n---\n\n'),
      button,
      { largeTextLimit: 180000, largeFileName: 'leadlens-chatgpt-raw-data.txt', largeLabel: 'Downloaded' }
    )
  },

  aiPromptForSite(site) {
    return Contacts.rawAiPromptForSite(site)
  },

  templateForSite(site) {
    const leadMeta = Contacts.normaliseLeadMeta(site.leadMeta)
    const seoAudit = Contacts.normaliseSeoAudit(site.seoAudit)
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const health = Contacts.websiteHealth(site)
    const opportunity = Contacts.opportunityScore(site)
    const recommendedServices = Contacts.recommendedServices(site)
    const topProblems = Contacts.uniqueTextItems(Contacts.topProblems(site))
    const expectations = Contacts.siteExpectations(site)
    const verdict = Contacts.leadVerdict(site)
    const confidence = Contacts.scanConfidence(site)
    const quality = Contacts.scanQuality(site)
    const technologies = [...site.technologies.values()]
    const market = Contacts.marketDetection(site)
    const decision = Contacts.decisionConfidence(site)
    const strategy = Contacts.outreachStrategy(site)
    const pageWarning = Contacts.pageIntentWarning(site)
    const displayStage = Contacts.displayLeadStageValue(site)
    const displayPriority = Contacts.displayLeadPriorityValue(site)
    const reasonCard = Contacts.opportunityReasonCard(site)
    const readiness = Contacts.outreachReadiness(site)
    const channels = Contacts.bestOutreachChannels(site)
    const checklist = Contacts.manualReviewChecklist(site)
    const conflicts = Contacts.consistencyWarnings(site)
    const guard = Contacts.finalReportGuard(site)
    const duplicate = Contacts.duplicateLeadWarning(site)
    const section = (title, lines) => {
      const values = Contacts.toArray(lines).filter(Boolean)

      return values.length ? `${title}\n${values.join('\n')}` : `${title}\n- None`
    }
    const phoneLines = Contacts.phoneRows(site).map((phone) => `- ${Contacts.phoneDisplayValue(phone)}${Contacts.toArray(phone.sources).length ? ` | Sources: ${Contacts.toArray(phone.sources).join(', ')}` : ''}`)
    const contactLines = site.contacts.map((contact) =>
      [
        `- ${Contacts.statusLabel(contact.status)} ${Contacts.isPhoneRow(contact) ? 'phone' : contact.type}: ${Contacts.isPhoneRow(contact) ? Contacts.phoneDisplayValue(contact) : contact.value}`,
        contact.platform ? `  Platform: ${contact.platform}` : '',
        contact.type === 'email' ? `  Email type: ${Contacts.emailKind(contact)}` : '',
        contact.type === 'email'
          ? `  Role intent: ${Contacts.emailRoleIntent(contact).label}`
          : '',
        contact.type === 'email'
          ? `  Email confidence: ${Contacts.emailConfidence(contact).label} (${Contacts.emailConfidence(contact).score}/100) - ${Contacts.emailConfidence(contact).reasons.join(', ')}`
          : '',
        contact.emailDomain ? `  Email domain: ${contact.emailDomain}` : '',
        Contacts.toArray(contact.sources).length
          ? `  Sources: ${Contacts.toArray(contact.sources).join(', ')}`
          : '',
        contact.foundAt ? `  Found at: ${Contacts.formatDate(contact.foundAt)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
    const technologyLines = technologies.map(
      ({ name, version, confidence, categories }) =>
        [
          `- ${name}${version ? ` ${version}` : ''}${
            confidence ? ` (${confidence}%)` : ''
          }`,
          Contacts.toArray(categories).length
            ? `  Categories: ${Contacts.toArray(categories)
                .map(({ name }) => name)
                .join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
    )
    const seoLines =
      seoAudit.score === null
        ? ['- SEO audit not available yet']
        : [
            `- Score: ${seoAudit.score}`,
            Contacts.toArray(seoAudit.issues).length
              ? `- Issues: ${Contacts.toArray(seoAudit.issues).join(', ')}`
              : '- Issues: None',
            ...Contacts.toArray(seoAudit.checks).map(
              (check) =>
                `- ${check.passed ? 'Pass' : 'Fix'}: ${check.label}${
                  check.detail ? ` (${check.detail})` : ''
                }`
            ),
          ]
    return [
      `LeadLens Full Lead Template`,
      `Website: ${site.host}`,
      `URL: ${site.websiteUrl || ''}`,
      `Page title: ${site.pageTitle || ''}`,
      `Contact readiness: ${Contacts.leadScore(site)}/100`,
      `Improvement signal: ${opportunity.score}/100`,
      `Suggested pitch angle: ${opportunity.pitch}`,
      `Contact-path suitability: ${Contacts.outreachEligibility(site).label} - ${Contacts.outreachEligibility(site).reason}`,
      `Location evidence: ${market.label} (${market.confidence}) - ${market.reasons.join(', ')}`,
      `Review confidence: ${decision.label} (${decision.score}/100) - ${decision.reasons.join(', ') || 'Core signals captured'}`,
      `Suggested outreach angle: ${strategy.angle}`,
      `Best outreach channel: ${strategy.channel}`,
      `Available contact channels ranked: ${channels.map((item) => `${item.type}: ${item.value} (${item.reason})`).join(' | ')}`,
      `Suggested tone: ${strategy.tone}`,
      `Contact readiness: ${readiness.score}/100 - ${readiness.label} - ${readiness.reasons.join(', ')}`,
      `Why this website may need review: ${reasonCard.why}`,
      `Why not high priority: ${reasonCard.whyNotHigh}`,
      `What to offer first: ${reasonCard.offerFirst}`,
      `Manual review checklist: ${checklist.join('; ') || 'None'}`,
      `Report consistency warnings: ${conflicts.join('; ') || 'None'}`,
      `Final report guard: ${guard.suppressed ? 'Outreach suppressed' : 'Outreach allowed'}${guard.warnings.length ? ` - ${guard.warnings.join('; ')}` : ''}`,
      `Duplicate warning: ${duplicate || 'None'}`,
      `Clean URL: ${Contacts.cleanUrl(site.websiteUrl || '')}`,
      pageWarning ? `Page intent warning: ${pageWarning}` : '',
      `Lead validation: ${verdict.label} - ${verdict.reason}`,
      `Data confidence: ${confidence.label} (${confidence.score}/100) - ${confidence.reasons.join(', ') || 'Core signals captured'}`,
      `Scan quality: ${quality.label} - ${quality.detail}`,
      `Recommended services: ${recommendedServices.join(', ') || (verdict.excluded ? 'Do not use for outreach' : 'Manual review')}`,
      `${health.score >= 75 && opportunity.score < 50 ? 'Minor observations' : 'Top problems'}: ${Contacts.uniqueTextItems(topProblems).join('; ') || 'No major problems detected'}`,
      `Website improvement signal score: ${health.score}/100`,
      `Website improvement recommendation: ${health.recommendation}`,
      `Domain age: ${Contacts.domainAgeSummary(domainAge)}`,
      `Domain age status: ${Contacts.domainAgeStatusLabel(domainAge.status)}`,
      domainAge.registeredAt
        ? `Domain registered: ${Contacts.formatDate(domainAge.registeredAt)}`
        : '',
      domainAge.updatedAt ? `Domain updated: ${Contacts.formatDate(domainAge.updatedAt)}` : '',
      domainAge.expiresAt ? `Domain expires: ${Contacts.formatDate(domainAge.expiresAt)}` : '',
      domainAge.registrar ? `Domain registrar: ${domainAge.registrar}` : '',
      domainAge.message ? `Domain age note: ${domainAge.message}` : '',
      `Lead stage: ${Contacts.stageLabel(displayStage)}`,
      `Priority: ${Contacts.priorityLabel(displayPriority)}`,
      `Contacted: ${Contacts.contactedLabel(leadMeta.contacted)}`,
      `Industry: ${Contacts.cleanIndustryLabel(leadMeta.industry, site)}`,
      `Country: ${Contacts.cleanCountryLabel(leadMeta.country, site)}`,
      `Follow-up date: ${leadMeta.followUpDate || ''}`,
      `Latest found: ${Contacts.formatDate(site.latest)}`,
      `Notes: ${leadMeta.notes || ''}`,
      `Tags: ${Contacts.toArray(leadMeta.tags).join(', ') || ''}`,
      '',
      section('Reason-based scoring', Contacts.scoreReasons(site).map((reason) => `- ${reason}`)),
      '',
      section('Outreach strategy', [
        `- First message: ${strategy.firstMessage}`,
        `- Follow-up: ${strategy.followUp}`,
      ]),
      '',
      section(
        'Lead quality reasons',
        Contacts.leadQualityReasons(site).map(
          ({ label, value }) => `- ${label}: ${value}`
        )
      ),
      '',
      section(
        'Pain point labels',
        Contacts.painPointLabels(site).map(({ label }) => `- ${label}`)
      ),
      '',
      section('Contacts', contactLines),
      '',
      section(
        'Emails',
        site.emails.map((email) => `- ${email.value}`)
      ),
      '',
      section(
        'Social links',
        Contacts.socialRows(site).map((social) => `- ${social.platform || 'Social'}: ${social.value}`)
      ),
      '',
      section('Phone / WhatsApp', phoneLines),
      '',
      section('Technologies', technologyLines),
      '',
      section('SEO health signals', seoLines),
      '',
      section('Relevant SEO and conversion signals', [
        `- Search intent keywords: ${Contacts.toArray(seoAudit.intentKeywords).join(', ') || 'Not detected'}`,
        expectations.localSeo ? `- Address signal: ${seoAudit.addressSignals ? 'Yes' : 'No'}` : '',
        expectations.localSeo ? `- Map signal: ${seoAudit.mapSignals ? 'Yes' : 'No'}` : '',
        expectations.localSeo ? `- Opening hours signal: ${seoAudit.openingHourSignals ? 'Yes' : 'No'}` : '',
        expectations.localSeo ? `- Local business schema: ${seoAudit.hasLocalBusinessSchema ? 'Yes' : 'No'}` : '',
        `- About page links: ${seoAudit.aboutPageLinks || 0}`,
        `- Reviews/testimonials signal: ${seoAudit.reviewSignals ? 'Yes' : 'No'}`,
        `- Team/owner signal: ${seoAudit.teamSignals ? 'Yes' : 'No'}`,
        `- Above-fold CTA count: ${seoAudit.aboveFoldCtaCount || 0}`,
        `- Contact forms: ${seoAudit.contactForms || 0}`,
        `- Booking/order links: ${seoAudit.bookingPageLinks || 0}`,
      ]),
      '',
      section(
        'Website improvement and redesign signals',
        [
          `- Score: ${health.score}`,
          `- Recommendation: ${health.recommendation}`,
          ...health.categories.map(
            ({ label, score }) => `- ${label}: ${score}`
          ),
          ...Contacts.buyerFacingHealthSignals(site).map(
            ({ severity, label, detail }) =>
              `- ${severity.toUpperCase()}: ${label}${detail ? ` - ${detail}` : ''}`
          ),
        ]
      ),
    ].join('\n')
  },



  // Preserved evidence helpers. Full Lead Intelligence renderers above remain active.
  rawSeoValue(audit, path, fallback = '') {
    try {
      return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), audit) ?? fallback
    } catch (error) {
      return fallback
    }
  },

  renderRawBestEmailPanel() {
    return ''
  },

  renderRawLeadSummary(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const sources = [...site.sources].filter(Boolean)
    const missingAlt = Math.max(0, Number(audit.images || 0) - Number(audit.imagesWithAlt || 0))
    const infra = audit.seoInfrastructure || {}

    return `
      <section class="cf-lead-summary cf-lead-summary--raw">
        <div><strong>${Contacts.esc(site.host || '')}</strong><span>Scanned host</span></div>
        <div><strong>${Contacts.esc(site.websiteUrl || '')}</strong><span>Scanned URL</span></div>
        <div><strong>${Contacts.esc(site.pageTitle || audit.rawEvidence?.title || audit.title || '')}</strong><span>Page title found</span></div>
        <div><strong>${Contacts.esc(site.contacts.length || 0)}</strong><span>Total contact records</span></div>
        <div><strong>${Contacts.esc(site.emails.length || 0)}</strong><span>Email records</span></div>
        <div><strong>${Contacts.esc(site.socials.length || 0)}</strong><span>Social records</span></div>
        <div><strong>${Contacts.esc(site.technologies.size || 0)}</strong><span>Technology records</span></div>
        <div><strong>${Contacts.esc(sources.length || 0)}</strong><span>Source labels</span></div>
        <div><strong>${Contacts.esc(audit.wordCount || 0)}</strong><span>Visible word count</span></div>
        <div><strong>${Contacts.esc(audit.h1Count || 0)} / ${Contacts.esc(audit.headingCount || 0)}</strong><span>H1 / total headings</span></div>
        <div><strong>${Contacts.esc(audit.images || 0)} / ${Contacts.esc(missingAlt)}</strong><span>Images / missing alt</span></div>
        <div><strong>${Contacts.esc(audit.internalLinks || 0)} / ${Contacts.esc(audit.externalLinks || 0)}</strong><span>Internal / external links</span></div>
        <div><strong>${Contacts.esc(Contacts.toArray(audit.schemaTypes || audit.rawEvidence?.schemaTypes).length || 0)}</strong><span>Schema type count</span></div>
        <div><strong>${Contacts.esc(infra.robotsTxt?.checked ? (infra.robotsTxt.found ? 'Found' : 'Not found') : 'Not checked')}</strong><span>robots.txt</span></div>
        <div><strong>${Contacts.esc(infra.sitemap?.checked ? (infra.sitemap.found ? 'Found' : 'Not found') : 'Not checked')}</strong><span>sitemap.xml</span></div>
        <div class="cf-domain-summary-card${Contacts.hasDomainAgeResult(domainAge) ? '' : ' hidden'}"><strong>${Contacts.esc(Contacts.domainAgeSummary(domainAge))}</strong><span>Domain age evidence</span></div>
      </section>
    `
  },

  renderRawDecisionIntelligence() {
    return ''
  },

  renderRawLeadReasons() {
    return ''
  },

  renderRawLeadMeta() {
    return ''
  },

  renderTechnicalEvidence(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const resourceBreakdown = audit.resourceBreakdown || {}
    const navTiming = audit.navTiming || audit.rawEvidence?.navTiming || {}
    const cards = [
      ['DOM elements', audit.domNodeCount ?? ''],
      ['Script files', audit.scriptCount ?? audit.rawEvidence?.scriptCount ?? ''],
      ['Stylesheets', audit.stylesheetCount ?? audit.rawEvidence?.stylesheetCount ?? ''],
      ['Loaded resources', audit.resources ?? ''],
      ['Inline styles', audit.inlineStyleCount ?? audit.rawEvidence?.inlineStyleCount ?? ''],
      ['Small tap targets', audit.smallTapTargets ?? audit.rawEvidence?.smallTapTargets ?? ''],
      ['Empty headings', audit.emptyHeadingCount ?? ''],
      ['Form fields without labels', audit.unlabeledControls ?? ''],
      ['FCP local ms', audit.firstContentfulPaint || audit.rawEvidence?.firstContentfulPaint || ''],
      ['LCP local ms', audit.largestContentfulPaint || audit.rawEvidence?.largestContentfulPaint || ''],
      ['CLS local', audit.cumulativeLayoutShift ?? audit.rawEvidence?.cumulativeLayoutShift ?? ''],
      ['TTFB local ms', navTiming.ttfb || ''],
    ]

    return `
      <section class="cf-contact-group">
        <h3>Raw technical and UX data</h3>
        <p class="cf-signal-note">Factual browser-side measurements only. No redesign score or sales recommendation is generated here.</p>
        <div class="cf-seo-evidence-grid">
          ${cards.map(([label, value]) => `
            <div class="cf-seo-evidence-card">
              <span>${Contacts.esc(label)}</span>
              <strong>${Contacts.esc(value === '' || value === null || typeof value === 'undefined' ? 'Not captured' : value)}</strong>
            </div>
          `).join('')}
          <div class="cf-seo-evidence-card">
            <span>Resource breakdown</span>
            <strong>${Contacts.esc(Object.entries(resourceBreakdown).map(([key, value]) => `${key}:${value}`).join('; ') || 'Not captured')}</strong>
          </div>
        </div>
      </section>
    `
  },

  renderRawContactSnapshot(site) {
    const contacts = Contacts.toArray(site.contacts)
    const phones = Contacts.phoneRows(site)
    const sources = [...new Set(contacts.flatMap((row) => Contacts.toArray(row.sources)))].filter(Boolean)

    return `
      <section class="cf-contact-group">
        <h3>Raw contact snapshot</h3>
        <div class="cf-seo-evidence-grid">
          <div class="cf-seo-evidence-card"><span>Emails found</span><strong>${Contacts.esc(site.emails.map((row) => row.value).join('; ') || 'None')}</strong></div>
          <div class="cf-seo-evidence-card"><span>Social links found</span><strong>${Contacts.esc(Contacts.socialRows(site).map((row) => `${row.platform || 'Social'}: ${row.value}`).join('; ') || 'None')}</strong></div>
          <div class="cf-seo-evidence-card"><span>Phone / WhatsApp-like records</span><strong>${Contacts.esc(phones.map((row) => Contacts.phoneDisplayValue(row)).join('; ') || 'None')}</strong></div>
          <div class="cf-seo-evidence-card"><span>Source labels</span><strong>${Contacts.esc(sources.join('; ') || 'None')}</strong></div>
        </div>
      </section>
    `
  },

  renderRawSeoAudit(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)

    if (audit.score === null && !audit.hasSnapshot) {
      return `
        <section class="cf-contact-group">
          <h3>Raw SEO data</h3>
          <p class="cf-muted">No SEO snapshot saved for this website yet. Visit the website again to scan it.</p>
        </section>
      `
    }

    return `
      <section class="cf-contact-group">
        <h3>Raw SEO data</h3>
        <p class="cf-signal-note">Raw on-page facts only. Pass/fix labels are hidden from the main decision flow; use these facts for later analysis.</p>
        <div class="cf-seo-panel cf-seo-panel--raw">
          ${Contacts.renderSeoEvidence(audit)}
          <div class="cf-seo-checks">
            ${Contacts.toArray(audit.checks)
              .map(
                (check) => `
                  <div class="cf-seo-check ${check.passed ? 'cf-seo-check--pass' : 'cf-seo-check--fail'}">
                    <span>${check.passed ? 'Found' : 'Missing/weak'}</span>
                    <strong>${Contacts.esc(check.label)}</strong>
                    <small>${Contacts.esc(check.detail || '')}</small>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </section>
    `
  },

  contactRecordLabel(row = {}) {
    if (Contacts.isPhoneRow(row)) return 'phone'
    if (row.type === 'email') return 'email'
    if (row.type === 'social') return 'social'
    return row.type || 'contact'
  },

  contactRecordValue(row = {}) {
    if (Contacts.isPhoneRow(row)) return Contacts.phoneDisplayValue(row)
    return row.value || row.email || row.url || row.href || ''
  },

  formatSources(row = {}) {
    const sources = Contacts.toArray(row.sources).filter(Boolean)
    return sources.length ? sources.join(', ') : 'Source not captured'
  },

  rawContactRecordLine(row = {}) {
    const label = Contacts.contactRecordLabel(row)
    const value = Contacts.contactRecordValue(row)
    return [
      `- ${label}: ${value}`,
      row.platform ? `  Platform: ${row.platform}` : '',
      `  Sources: ${Contacts.formatSources(row)}`,
      row.type === 'email' ? `  Email type: ${Contacts.emailKind(row)}` : '',
      row.type === 'email' ? `  Email confidence: ${Contacts.emailConfidence(row).label} (${Contacts.emailConfidence(row).score}/100) - ${Contacts.emailConfidence(row).reasons.join(', ')}` : '',
      Contacts.isPhoneRow(row) ? `  Normalized call link: ${row.value && /^tel:/i.test(row.value) ? row.value : row.url || row.href || ''}` : '',
      row.foundAt ? `  Found at: ${Contacts.formatDate(row.foundAt)}` : '',
    ].filter(Boolean).join('\n')
  },

  rawEmailLine(email = {}) {
    const confidence = Contacts.emailConfidence(email)
    return [
      `- ${email.value}`,
      `  Type: ${Contacts.emailKind(email)}`,
      `  Confidence: ${confidence.label} (${confidence.score}/100) - ${confidence.reasons.join(', ')}`,
      `  Sources: ${Contacts.formatSources(email)}`,
    ].join('\n')
  },

  rawSocialLine(social = {}) {
    return [
      `- ${social.platform || 'Social'}: ${social.value}`,
      `  Sources: ${Contacts.formatSources(social)}`,
    ].join('\n')
  },

  rawPhoneLine(phone = {}) {
    return [
      `- ${Contacts.normalisePhonePlatform(phone.platform, phone.value)}: ${Contacts.phoneDisplayValue(phone)}`,
      `  Sources: ${Contacts.formatSources(phone)}`,
      phone.value && /^tel:/i.test(phone.value) ? `  Call link: ${phone.value}` : '',
      phone.value && /wa\.me|whatsapp/i.test(phone.value) ? `  WhatsApp link: ${phone.value}` : '',
    ].filter(Boolean).join('\n')
  },

  contactSourceDetails(rows = []) {
    return Contacts.toArray(rows)
      .map((row) => `${Contacts.contactRecordLabel(row)}:${Contacts.contactRecordValue(row)} [${Contacts.formatSources(row)}]`)
      .filter(Boolean)
      .join('; ')
  },

  rawTemplateForSite(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const contacts = Contacts.toArray(site.contacts)
    const emails = contacts.filter((row) => row.type === 'email')
    const socials = Contacts.socialRows(site)
    const phones = Contacts.phoneRows(site)
    const infra = audit.seoInfrastructure || {}
    const evidence = audit.rawEvidence || {}
    const techLines = [...site.technologies.values()].map(({ name, version, confidence, categories }) => {
      const cats = Contacts.toArray(categories).map((item) => item.name).join(', ')
      return `- ${name}${version ? ` ${version}` : ''}${confidence ? ` (${confidence}%)` : ''}${cats ? ` | ${cats}` : ''}`
    })
    const section = (title, lines) => {
      const values = Contacts.toArray(lines).filter(Boolean)
      return `${title}\n${values.length ? values.join('\n') : '- None'}`
    }

    return [
      'LeadLens Raw Data Template',
      'Mode: Raw evidence snapshot. The old browser-side AI decision layer has been removed; use this evidence for external review and final decision making.',
      `Website: ${site.host || ''}`,
      `URL: ${site.websiteUrl || ''}`,
      `Clean URL: ${Contacts.cleanUrl(site.websiteUrl || '')}`,
      `Page title: ${site.pageTitle || evidence.title || audit.title || ''}`,
      `Latest found: ${Contacts.formatDate(site.latest)}`,
      `Last seen: ${Contacts.formatDate(site.lastSeenAt || site.latest)}`,
      '',
      section('Contact records with source references', contacts.map((contact) => Contacts.rawContactRecordLine(contact))),
      '',
      section('Emails with confidence and sources', emails.map((email) => Contacts.rawEmailLine(email))),
      '',
      section('Clean social profile links with sources', socials.map((social) => Contacts.rawSocialLine(social))),
      '',
      section('Phone / WhatsApp records with sources', phones.map((phone) => Contacts.rawPhoneLine(phone))),
      '',
      section('Technologies', techLines),
      '',
      section('Raw SEO metadata', [
        `- Title: ${evidence.title || audit.title || site.pageTitle || ''}`,
        `- Title length: ${evidence.titleLength ?? String(evidence.title || audit.title || site.pageTitle || '').length}`,
        `- Meta description: ${evidence.description || ''}`,
        `- Meta description length: ${evidence.descriptionLength ?? audit.descriptionLength ?? ''}`,
        `- Canonical URL: ${audit.canonical || evidence.canonical || ''}`,
        `- Robots meta: ${audit.robots || evidence.robots || ''}`,
        `- HTML lang: ${audit.lang || evidence.lang || ''}`,
        `- Viewport: ${audit.viewport || evidence.viewport || ''}`,
        `- H1 count: ${audit.h1Count || 0}`,
        `- H1 texts: ${Contacts.toArray(evidence.h1Texts).join(' | ')}`,
        `- Heading count: ${audit.headingCount || 0}`,
        `- Heading summary: ${evidence.headingSummary ? Object.entries(evidence.headingSummary).map(([key, value]) => `${key}:${value}`).join('; ') : ''}`,
        `- Word count: ${audit.wordCount || 0}`,
        `- Internal links: ${audit.internalLinks || 0}`,
        `- External links: ${audit.externalLinks || 0}`,
        `- Empty/placeholder links: ${audit.emptyLinks || 0}`,
        `- Images: ${audit.images || 0}`,
        `- Images with alt: ${audit.imagesWithAlt || 0}`,
        `- Broken images: ${audit.brokenImages || 0}`,
        `- Lazy images: ${audit.lazyImages || 0}`,
        `- JSON-LD blocks: ${audit.jsonLdCount || 0}`,
        `- Schema types: ${Contacts.toArray(audit.schemaTypes || evidence.schemaTypes).join('; ')}`,
      ]),
      '',
      section('Robots and sitemap facts', [
        `- robots.txt checked: ${infra.robotsTxt?.checked ? 'Yes' : 'No'}`,
        `- robots.txt found: ${infra.robotsTxt?.found ? 'Yes' : 'No'}`,
        `- robots.txt status: ${infra.robotsTxt?.status || ''}`,
        `- robots.txt sitemap URLs: ${Contacts.toArray(infra.robotsTxt?.sitemapUrls).join('; ')}`,
        `- sitemap checked: ${infra.sitemap?.checked ? 'Yes' : 'No'}`,
        `- sitemap found: ${infra.sitemap?.found ? 'Yes' : 'No'}`,
        `- sitemap status: ${infra.sitemap?.status || ''}`,
        `- sitemap URL count: ${infra.sitemap?.urlCount ?? ''}`,
        `- sitemap sample URLs: ${Contacts.toArray(infra.sitemap?.sampleUrls).join('; ')}`,
      ]),
      '',
      section('Raw social preview facts', [
        `- Open Graph: ${evidence.og ? Object.entries(evidence.og).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ') : ''}`,
        `- Twitter/X card: ${evidence.twitter ? Object.entries(evidence.twitter).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ') : ''}`,
      ]),
      '',
      section('Raw local/contact/conversion facts', [
        `- Address signal: ${audit.addressSignals ? 'Yes' : 'No'}`,
        `- Map signal: ${audit.mapSignals ? 'Yes' : 'No'}`,
        `- Opening hours signal: ${audit.openingHourSignals ? 'Yes' : 'No'}`,
        `- Local/organization schema: ${audit.hasLocalBusinessSchema ? 'Yes' : 'No'}`,
        `- About page links: ${audit.aboutPageLinks || 0}`,
        `- Contact path links: ${audit.contactPageLinks || 0}`,
        `- Contact forms: ${audit.contactForms || 0}`,
        `- Trust/privacy links: ${audit.privacyLinks || 0}`,
        `- Terms links: ${audit.termsLinks || 0}`,
        `- Review/testimonial signal: ${audit.reviewSignals ? 'Yes' : 'No'}`,
        `- Team/owner signal: ${audit.teamSignals ? 'Yes' : 'No'}`,
        `- Above-fold CTA count: ${audit.aboveFoldCtaCount || 0}`,
        `- Booking/order links: ${audit.bookingPageLinks || 0}`,
        `- WhatsApp links: ${audit.whatsAppLinks || 0}`,
        `- Messenger links: ${audit.messengerLinks || 0}`,
      ]),
      '',
      section('Raw technical/performance facts', [
        `- DOM elements: ${audit.domNodeCount ?? ''}`,
        `- Script count: ${audit.scriptCount ?? evidence.scriptCount ?? ''}`,
        `- Stylesheet count: ${audit.stylesheetCount ?? evidence.stylesheetCount ?? ''}`,
        `- Resource count: ${audit.resources ?? ''}`,
        `- Resource breakdown: ${audit.resourceBreakdown ? Object.entries(audit.resourceBreakdown).map(([key, value]) => `${key}:${value}`).join('; ') : ''}`,
        `- Inline style count: ${audit.inlineStyleCount ?? evidence.inlineStyleCount ?? ''}`,
        `- Small tap targets: ${audit.smallTapTargets ?? evidence.smallTapTargets ?? ''}`,
        `- Empty headings: ${audit.emptyHeadingCount ?? ''}`,
        `- Inputs without labels: ${audit.unlabeledControls ?? ''}`,
        `- FCP local ms: ${audit.firstContentfulPaint || evidence.firstContentfulPaint || ''}`,
        `- LCP local ms: ${audit.largestContentfulPaint || evidence.largestContentfulPaint || ''}`,
        `- CLS local: ${audit.cumulativeLayoutShift ?? evidence.cumulativeLayoutShift ?? ''}`,
        `- TTFB local ms: ${audit.navTiming?.ttfb ?? evidence.navTiming?.ttfb ?? ''}`,
      ]),
      '',
      section('Domain age facts', [
        `- Root domain: ${domainAge.rootDomain || Contacts.rootDomain(site.host)}`,
        `- Domain age: ${Contacts.domainAgeSummary(domainAge)}`,
        `- Registered: ${Contacts.formatDate(domainAge.registeredAt)}`,
        `- Updated: ${Contacts.formatDate(domainAge.updatedAt)}`,
        `- Expires: ${Contacts.formatDate(domainAge.expiresAt)}`,
        `- Registrar: ${domainAge.registrar || ''}`,
        `- Status: ${Contacts.domainAgeStatusLabel(domainAge.status)}`,
      ]),
      '',
      section('Raw text chunks', [
        (evidence.rawTextChunks?.hero || audit.rawTextChunks?.hero) ? `- Hero/header: ${evidence.rawTextChunks?.hero || audit.rawTextChunks?.hero}` : '',
        (evidence.rawTextChunks?.services || audit.rawTextChunks?.services) ? `- Services/products/menu: ${evidence.rawTextChunks?.services || audit.rawTextChunks?.services}` : '',
        (evidence.rawTextChunks?.about || audit.rawTextChunks?.about) ? `- About/team/story: ${evidence.rawTextChunks?.about || audit.rawTextChunks?.about}` : '',
        (evidence.rawTextChunks?.contact || audit.rawTextChunks?.contact) ? `- Contact/location/address: ${evidence.rawTextChunks?.contact || audit.rawTextChunks?.contact}` : '',
        (evidence.rawTextChunks?.trust || audit.rawTextChunks?.trust) ? `- Reviews/testimonials/portfolio: ${evidence.rawTextChunks?.trust || audit.rawTextChunks?.trust}` : '',
        (evidence.rawTextChunks?.footer || audit.rawTextChunks?.footer) ? `- Footer: ${evidence.rawTextChunks?.footer || audit.rawTextChunks?.footer}` : '',
      ]),
      '',
      section('Raw page text preview', [evidence.pageTextPreview || audit.pageTextPreview || '']),
    ].join('\n')
  },

  rawSafeTemplateForSite(site) {
    return Contacts.rawTemplateForSite(site)
  },

  rawTemplateTextForSite(site) {
    return Contacts.rawTemplateForSite(site)
  },

  rawAiPromptForSite(site) {
    return [
      'You are reviewing Qrinux LeadLens raw website evidence. The Chrome extension did not make the final outreach decision.',
      'Use the captured facts below to decide whether this is a real SMB/local-business opportunity, a research-only record, or an excluded/non-prospect website.',
      '',
      'Important decision rules:',
      '- Do not recommend SEO/redesign outreach to web design agencies, SEO agencies, digital agencies, software companies, SaaS platforms, marketplaces, directories, job boards, large enterprise brands, universities, government pages, or blocked/challenge/error pages unless there is a clear partnership/research reason.',
      '- Do not punish a website for missing industry-specific fields unless the detected industry makes them relevant. For example, reservation/menu/opening-hours matter for restaurants or local walk-in businesses, but not every sector.',
      '- Separate website-improvement opportunity from outreach readiness. A website can have SEO/redesign issues but still be unsafe or low priority for outreach if the business type or contact channel is wrong.',
      '- Use domain age, technology stack, page evidence, contacts, phone, social profiles, SEO metadata, trust/conversion signals, blocked-page status, and raw page text only from this evidence.',
      '- Do not guess missing facts. If a contact, phone, social link, or issue is used in your conclusion, mention the captured source/reference when available.',
      '- Treat non-profile widget/script/social asset URLs as noise and ignore them; only use clean social profile links shown in the clean social profile section.',
      '',
      'Return a concise result with: final status, lead type, industry guess, country/market guess, outreach readiness score, website opportunity score, top evidence, warnings, and recommended next action.',
      '',
      Contacts.rawTemplateForSite(site),
    ].join('\n')
  },

  async exportRawCsv() {
    const button = document.getElementById('btn-export')
    const summarySites = Contacts.filteredSites.length ? Contacts.filteredSites : Contacts.groupBySite(Contacts.allData)

    if (!summarySites.length) {
      Contacts.flashButton(button, 'No data')
      return
    }

    if (button) Contacts.setBusyButton(button, `Preparing 0/${summarySites.length}...`)
    let sites
    try {
      sites = await Contacts.ensureDetailedSites(summarySites, button)
    } catch (error) {
      console.error('Evidence detail loading failed', error)
      Contacts.showToast('Could not load full lead details for export.', 'error')
      if (button) Contacts.restoreBusyButton(button)
      return
    }

    const headers = [
      'Website', 'URL', 'Clean URL', 'Page Title', 'Latest Found', 'Last Seen',
      'All Emails', 'Direct/Visible Emails', 'Social Links', 'Phone WhatsApp Records', 'Contact Sources', 'Email Source Details', 'Social Source Details', 'Phone Source Details',
      'Technology Count', 'Technologies', 'Tech Categories',
      'Raw Title', 'Title Length', 'Raw Meta Description', 'Meta Description Length', 'Canonical URL', 'Robots Meta', 'HTML Lang', 'Viewport Meta',
      'H1 Count', 'H1 Texts', 'Heading Count', 'Heading Summary', 'Word Count',
      'Internal Links', 'External Links', 'Empty Links', 'Safe External Tabs Missing Noopener',
      'Image Count', 'Images With Alt', 'Images Missing Alt', 'Broken Images', 'Lazy Images',
      'JSON-LD Count', 'Schema Types', 'Open Graph Data', 'Twitter Data',
      'robots.txt Checked', 'robots.txt Found', 'robots.txt Status', 'robots.txt Sitemap URLs',
      'Sitemap Checked', 'Sitemap Found', 'Sitemap Status', 'Sitemap URL Count', 'Sitemap Sample URLs',
      'Address Signal', 'Map Signal', 'Opening Hours Signal', 'Local/Organization Schema',
      'About Links', 'Contact Path Links', 'Contact Forms', 'Privacy Links', 'Terms Links', 'Review Signal', 'Team/Owner Signal', 'Above Fold CTA Count', 'Booking/Order Links', 'WhatsApp Links', 'Messenger Links',
      'DOM Elements', 'Script Count', 'Stylesheet Count', 'Resource Count', 'Resource Breakdown', 'Inline Style Count', 'Small Tap Targets', 'Empty Headings', 'Inputs Without Labels',
      'FCP Local ms', 'LCP Local ms', 'CLS Local', 'TTFB Local ms',
      'Domain Age', 'Domain Registered', 'Domain Updated', 'Domain Expires', 'Domain Registrar', 'Domain Age Status',
      'Raw Page Text Preview', 'Hero/Header Text', 'Services/Product Text', 'About/Team Text', 'Contact/Location Text', 'Trust/Review Text', 'Footer Text', 'Original Notes', 'Original Tags', 'Scan Status',
      'Business Names', 'Legal Business Names', 'Business Schema Types', 'Structured Addresses', 'Geo Coordinates', 'Opening Hours', 'Price Range', 'Currencies Accepted', 'Payment Accepted', 'Area Served', 'Founders',
      'Address Country Evidence', 'Locale and Hreflang Evidence', 'Currency Evidence', 'Page Published At', 'Page Modified At', 'Copyright Years', 'Feed Links', 'Web Manifest',
      'Contact Form Details', 'Unnamed Buttons', 'Unnamed Links', 'HTTP Status', 'Final Response URL', 'Response Content Type', 'Server Header', 'X-Powered-By', 'Missing Security Headers', 'Related Page Evidence',
      'Quality Runtime Version', 'Evidence Coverage Score', 'Evidence Coverage Label', 'Evidence Coverage Missing',
      'Main Content Title', 'Main Content Word Count', 'Main Content Source', 'Main Content Excerpt',
      'Accessibility Preflight Engine', 'Accessibility Preflight Issue Count', 'Accessibility Preflight Issues',
      'Explicit Offerings', 'Policy and Operational Links', 'Declared Languages',
      'Machine Readable Dates', 'Visible Date Evidence', 'Record Validation Passed', 'Record Validation Issues'
    ]

    const rows = sites.map((site) => {
      const audit = Contacts.normaliseSeoAudit(site.seoAudit)
      const evidence = audit.rawEvidence || {}
      const infra = audit.seoInfrastructure || {}
      const contacts = Contacts.toArray(site.contacts)
      const emails = contacts.filter((row) => row.type === 'email')
      const socials = Contacts.socialRows(site)
      const phones = Contacts.phoneRows(site)
      const domainAge = Contacts.normaliseDomainAge(site.domainAge)
      const techs = [...site.technologies.values()]
      const leadMeta = Contacts.normaliseLeadMeta(site.leadMeta)

      return [
        site.host, site.websiteUrl || '', Contacts.cleanUrl(site.websiteUrl || ''), site.pageTitle || evidence.title || audit.title || '', Contacts.formatDate(site.latest), Contacts.formatDate(site.lastSeenAt || site.latest),
        emails.map((row) => row.value).join('; '), emails.filter((row) => Contacts.emailKind(row) === 'direct').map((row) => row.value).join('; '), socials.map((row) => `${row.platform || 'Social'}: ${row.value}`).join('; '), phones.map((row) => Contacts.phoneDisplayValue(row)).join('; '), [...new Set(contacts.flatMap((row) => Contacts.toArray(row.sources)))].join('; '), Contacts.contactSourceDetails(emails), Contacts.contactSourceDetails(socials), Contacts.contactSourceDetails(phones),
        techs.length, techs.map(({ name, version }) => version ? `${name} ${version}` : name).join('; '), [...new Set(techs.flatMap(({ categories }) => Contacts.toArray(categories).map((item) => item.name)))].join('; '),
        evidence.title || audit.title || site.pageTitle || '', evidence.titleLength ?? String(evidence.title || audit.title || site.pageTitle || '').length, evidence.description || '', evidence.descriptionLength ?? audit.descriptionLength ?? '', audit.canonical || evidence.canonical || '', audit.robots || evidence.robots || '', audit.lang || evidence.lang || '', audit.viewport || evidence.viewport || '',
        audit.h1Count || 0, Contacts.toArray(evidence.h1Texts).join(' | '), audit.headingCount || 0, evidence.headingSummary ? Object.entries(evidence.headingSummary).map(([key, value]) => `${key}:${value}`).join('; ') : '', audit.wordCount || 0,
        audit.internalLinks || 0, audit.externalLinks || 0, audit.emptyLinks || 0, audit.unsafeExternalLinks || 0,
        audit.images || 0, audit.imagesWithAlt || 0, Math.max(0, Number(audit.images || 0) - Number(audit.imagesWithAlt || 0)), audit.brokenImages || 0, audit.lazyImages || 0,
        audit.jsonLdCount || 0, Contacts.toArray(audit.schemaTypes || evidence.schemaTypes).join('; '), evidence.og ? Object.entries(evidence.og).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ') : '', evidence.twitter ? Object.entries(evidence.twitter).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ') : '',
        infra.robotsTxt?.checked ? 'Yes' : 'No', infra.robotsTxt?.found ? 'Yes' : 'No', infra.robotsTxt?.status || '', Contacts.toArray(infra.robotsTxt?.sitemapUrls).join('; '),
        infra.sitemap?.checked ? 'Yes' : 'No', infra.sitemap?.found ? 'Yes' : 'No', infra.sitemap?.status || '', infra.sitemap?.urlCount ?? '', Contacts.toArray(infra.sitemap?.sampleUrls).join('; '),
        audit.addressSignals ? 'Yes' : 'No', audit.mapSignals ? 'Yes' : 'No', audit.openingHourSignals ? 'Yes' : 'No', audit.hasLocalBusinessSchema ? 'Yes' : 'No',
        audit.aboutPageLinks || 0, audit.contactPageLinks || 0, audit.contactForms || 0, audit.privacyLinks || 0, audit.termsLinks || 0, audit.reviewSignals ? 'Yes' : 'No', audit.teamSignals ? 'Yes' : 'No', audit.aboveFoldCtaCount || 0, audit.bookingPageLinks || 0, audit.whatsAppLinks || 0, audit.messengerLinks || 0,
        audit.domNodeCount ?? evidence.domNodeCount ?? evidence.domNodes ?? '', audit.scriptCount ?? evidence.scriptCount ?? '', audit.stylesheetCount ?? evidence.stylesheetCount ?? '', audit.resources ?? evidence.resources ?? evidence.resourceCount ?? '', audit.resourceBreakdown ? Object.entries(audit.resourceBreakdown).map(([key, value]) => `${key}:${value}`).join('; ') : '', audit.inlineStyleCount ?? evidence.inlineStyleCount ?? '', audit.smallTapTargets ?? evidence.smallTapTargets ?? '', audit.emptyHeadingCount ?? evidence.emptyHeadingCount ?? evidence.emptyHeadings ?? '', audit.unlabeledControls ?? evidence.unlabeledControls ?? evidence.inputsWithoutLabels ?? '',
        audit.firstContentfulPaint || evidence.firstContentfulPaint || '', audit.largestContentfulPaint || evidence.largestContentfulPaint || '', audit.cumulativeLayoutShift ?? evidence.cumulativeLayoutShift ?? '', audit.navTiming?.ttfb ?? evidence.navTiming?.ttfb ?? '',
        Contacts.domainAgeSummary(domainAge), Contacts.formatDate(domainAge.registeredAt), Contacts.formatDate(domainAge.updatedAt), Contacts.formatDate(domainAge.expiresAt), domainAge.registrar || '', Contacts.domainAgeStatusLabel(domainAge.status),
        evidence.pageTextPreview || '', evidence.rawTextChunks?.hero || '', evidence.rawTextChunks?.services || '', evidence.rawTextChunks?.about || '', evidence.rawTextChunks?.contact || '', evidence.rawTextChunks?.trust || '', evidence.rawTextChunks?.footer || '', leadMeta.notes || '', Contacts.toArray(leadMeta.tags).join('; '), Contacts.scanQuality(site).label,
        Contacts.toArray(evidence.businessIdentity?.names).join('; '), Contacts.toArray(evidence.businessIdentity?.legalNames).join('; '), Contacts.toArray(evidence.businessIdentity?.entityTypes).join('; '), JSON.stringify(Contacts.toArray(evidence.businessIdentity?.addresses)), JSON.stringify(Contacts.toArray(evidence.businessIdentity?.geo)), Contacts.toArray(evidence.businessIdentity?.openingHours).join('; '), Contacts.toArray(evidence.businessIdentity?.priceRanges).join('; '), Contacts.toArray(evidence.businessIdentity?.currenciesAccepted).join('; '), Contacts.toArray(evidence.businessIdentity?.paymentAccepted).join('; '), Contacts.toArray(evidence.businessIdentity?.areaServed).join('; '), Contacts.toArray(evidence.businessIdentity?.founders).join('; '),
        Contacts.toArray(evidence.geographyEvidence?.addressCountries).join('; '), Contacts.toArray(evidence.geographyEvidence?.localeValues).join('; '), Contacts.toArray(evidence.geographyEvidence?.currencyCodes).join('; '), evidence.contentDates?.publishedAt || '', evidence.contentDates?.modifiedAt || '', Contacts.toArray(evidence.contentDates?.copyrightYears).join('; '), JSON.stringify(Contacts.toArray(evidence.feedLinks)), evidence.webManifest || '',
        JSON.stringify(Contacts.toArray(evidence.formDetails)), evidence.accessibilitySignals?.unnamedButtons ?? '', evidence.accessibilitySignals?.unnamedLinks ?? '', infra.pageResponse?.status ?? '', infra.pageResponse?.finalUrl || '', infra.pageResponse?.contentType || '', infra.pageResponse?.server || '', infra.pageResponse?.poweredBy || '', Contacts.toArray(infra.pageResponse?.missingSecurityHeaders).join('; '), JSON.stringify(Contacts.toArray(evidence.relatedPageEvidence)),
        evidence.qualityRuntimeVersion || '', evidence.evidenceCoverage?.score ?? '', evidence.evidenceCoverage?.label || '', Contacts.toArray(evidence.evidenceCoverage?.missing).join('; '),
        evidence.mainContent?.title || '', evidence.mainContent?.wordCount ?? '', evidence.mainContent?.source || '', evidence.mainContent?.excerpt || '',
        evidence.accessibilityAudit?.engine || '', evidence.accessibilityAudit?.issueCount ?? '', JSON.stringify(Contacts.toArray(evidence.accessibilityAudit?.issues)),
        Contacts.toArray(evidence.explicitPageSignals?.explicitOfferings).join('; '), JSON.stringify(Contacts.toArray(evidence.explicitPageSignals?.policyLinks)), Contacts.toArray(evidence.explicitPageSignals?.languages).join('; '),
        Contacts.toArray(evidence.dateEvidence?.machineReadable).join('; '), Contacts.toArray(evidence.dateEvidence?.visible).join('; '), evidence.recordValidation?.success === false ? 'No' : 'Yes', JSON.stringify(Contacts.toArray(evidence.recordValidation?.issues)),
      ]
    })

    const date = new Date().toISOString().slice(0, 10)
    const blob = sites.length >= 80 ? Contacts.toCsvBlob(headers, rows) : Contacts.toXlsxBlob(headers, rows)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `qrinux-leadlens-evidence-${date}.${sites.length >= 80 ? 'csv' : 'xlsx'}`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    Contacts.flashButton(button, sites.length >= 80 ? 'Raw CSV exported' : 'Raw XLSX exported')
  },

  isDebugView() {
    return new URLSearchParams(window.location.search).get('debug') === '1'
  },

  async copyList(values, button, options = {}) {
    const unique = [...new Set(values)].filter(Boolean)

    if (!unique.length) {
      Contacts.flashButton(button, 'No data')
      return
    }

    await Contacts.copyText(unique.join('\n'), button, options)
  },

  async copyText(text, button, options = {}) {
    const finish = (label) => Contacts.flashButton(button, label)
    const largeTextLimit = options.largeTextLimit || 900000
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea')

      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)

      let ok = false

      try {
        ok = document.execCommand('copy')
      } catch (error) {
        ok = false
      }

      textarea.remove()

      finish(ok ? 'Copied' : 'Copy failed — use Export XLSX when you need a file')
    }

    if (!text) {
      finish('No data')
      return
    }

    await Contacts.yieldToUi()

    // Copy actions always target the clipboard. File creation is reserved for
    // explicit Export XLSX and Download backup buttons.
    if (!navigator.clipboard?.writeText) {
      fallbackCopy()
      return
    }

    navigator.clipboard.writeText(text).then(() => finish('Copied')).catch(fallbackCopy)
  },

  yieldToUi() {
    return new Promise((resolve) => setTimeout(resolve, 0))
  },

  setBusyButton(button, label) {
    if (!button) return
    button.dataset.originalHtml = button.dataset.originalHtml || button.innerHTML
    button.disabled = true
    button.textContent = label
  },

  restoreBusyButton(button) {
    if (!button) return
    button.disabled = false
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml
      delete button.dataset.originalHtml
    }
  },

  downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  },

  async recalculateLeadIntelligence() {
    const button = document.getElementById('btn-recalculate')

    if (!button) return

    const original = button.innerHTML

    button.disabled = true
    button.textContent = 'Rebuilding evidence...'

    try {
      const result = await sendMessage('contacts.js', 'normalizeStoredContacts', [])

      await Contacts.loadData()
      Contacts.applyFilter()
      button.textContent = `Updated ${result?.changed || 0}`
      Contacts.showToast(`Evidence index rebuilt. Updated ${result?.changed || 0} record(s).`)
      setTimeout(() => {
        button.innerHTML = original
        button.disabled = false
      }, 1600)
    } catch (error) {
      button.textContent = 'Rebuild failed'
      Contacts.showToast(`Evidence rebuild failed: ${String(error?.message || error)}`, 'error')
      setTimeout(() => {
        button.innerHTML = original
        button.disabled = false
      }, 1800)
    }
  },

  flashButton(button, label) {
    if (!button) return

    const original = button.dataset.originalHtml || button.innerHTML
    const lower = String(label || '').toLowerCase()
    const type = /failed|error|no data/.test(lower) ? 'error' : 'success'

    button.disabled = false
    button.textContent = label
    Contacts.showToast(label, type)
    setTimeout(() => {
      button.innerHTML = original
      delete button.dataset.originalHtml
    }, 1400)
  },

  ensureToastRegion() {
    let region = document.getElementById('cf-toast-region')

    if (!region) {
      region = document.createElement('div')
      region.id = 'cf-toast-region'
      region.className = 'cf-toast-region'
      region.setAttribute('aria-live', 'polite')
      document.body.appendChild(region)
    }

    return region
  },

  showToast(message, type = 'success') {
    const region = Contacts.ensureToastRegion()
    const toast = document.createElement('div')
    const symbols = { success: '✓', error: '!', info: 'i' }

    toast.className = `cf-toast cf-toast--${type}`
    toast.innerHTML = `
      <span class="cf-toast__icon" aria-hidden="true">${symbols[type] || '✓'}</span>
      <span class="cf-toast__message">${Contacts.esc(message)}</span>
      <span class="cf-toast__progress" aria-hidden="true"></span>
    `
    region.appendChild(toast)
    requestAnimationFrame(() => toast.classList.add('is-visible'))
    setTimeout(() => {
      toast.classList.remove('is-visible')
      setTimeout(() => toast.remove(), 220)
    }, 3000)
  },

  async exportCsv() {
    const summarySites = Contacts.filteredSites
    const button = document.getElementById('btn-export')
    const sites = summarySites.length ? await Contacts.ensureDetailedSites(summarySites, button) : []

    if (!sites.length) {
      Contacts.showToast('There are no visible leads to export.', 'error')
      return
    }

    Contacts.setBusyButton(button, 'Exporting...')
    await Contacts.yieldToUi()

    const headers = [
      'Website Host',
      'Scanned URL',
      'Clean URL',
      'Page Title',
      'Emails',
      'Direct Emails',
      'Platform Emails',
      'Email Confidence',
      'Email Risk Notes',
      'Best Outreach Email',
      'Best Email Confidence',
      'Best Email Reason',
      'Best Email Send Confidence',
      'Mailbox Verification Note',
      'All Emails',
      'Risky Emails',
      'Social Links',
      'Phones',
      'Contact Sources',
      'Market',
      'Market Confidence',
      'Decision Confidence',
      'Decision Reasons',
      'Best Outreach Channel',
      'Best Outreach Channels Ranked',
      'Best Outreach Tone',
      'Best Outreach Strategy',
      'Outreach Readiness',
      'Why This Lead Matters Summary',
      'Why Not High Priority',
      'What To Offer First',
      'Manual Review Checklist',
      'Report Consistency Warnings',
      'Duplicate Warning',
      'First Message',
      'Follow-up Message',
      'Page Intent Warning',
      'Reason-Based Scoring',
      'Lead Status',
      'Status Reason',
      'Evidence Confidence',
      'Scan Result',
      'Domain Age',
      'Domain Registered',
      'Domain Updated',
      'Domain Expires',
      'Domain Registrar',
      'Domain Age Status',
      'Lead Score',
      'Opportunity Score',
      'Opportunity Pitch',
      'Recommended Services',
      'Top Problems',
      'Pain Points',
      'Why This Lead Matters',
      'SEO Signal Score',
      'SEO Issues',
      'Raw Title',
      'Title Length',
      'Raw Meta Description',
      'Meta Description Length',
      'Canonical URL',
      'Robots Meta',
      'HTML Lang',
      'Viewport Meta',
      'H1 Texts',
      'Heading Summary',
      'Word Count',
      'Internal Links',
      'External Links',
      'Images Missing Alt',
      'Broken Images',
      'Schema Types',
      'Open Graph Data',
      'Twitter Data',
      'Robots.txt Status',
      'Robots.txt Sitemaps',
      'Sitemap Status',
      'Sitemap URL Count',
      'Sitemap Sample URLs',
      'Observed Load Speed',
      'Observed Load ms',
      'FCP Local ms',
      'LCP Local ms',
      'CLS Local',
      'TTFB Local ms',
      'Resource Breakdown',
      'Raw Page Text Preview',
      'Search Intent Keywords',
      'Local SEO Signals',
      'Trust Conversion Signals',
      'Website Signal Score',
      'Website Signal Recommendation',
      'Website Issues',
      'Lead Stage',
      'Priority',
      'Contacted',
      'Country',
      'Follow-up Date',
      'Sources',
      'Notes',
      'Tags',
      'Technologies',
      'Status',
      'First Found',
      'Last Seen',
    ]
    const buildExportRow = (site) => {
      const contacts = Contacts.toArray(site.contacts)
      const emails = contacts.filter((row) => row.type === 'email')
      const socials = Contacts.socialRows(site)
      const directEmails = emails.filter((row) => Contacts.emailKind(row) === 'direct')
      const platformEmails = emails.filter((row) => Contacts.emailKind(row) === 'platform')
      const emailAssessments = emails.map((row) => Contacts.emailConfidence(row))
      const bestEmail = Contacts.bestOutreachEmail(site)
      const bestEmailConfidence = bestEmail ? Contacts.emailConfidence(bestEmail) : null
      const emailOutreach = Contacts.emailOutreachProfile(site)
      const speedProfile = Contacts.localSpeedProfile(site)
      const riskyEmails = emails.filter((row) =>
        ['Risky', 'Invalid'].includes(Contacts.emailConfidence(row).label)
      )
      const phoneContacts = Contacts.phoneRows(site)
      const domainAge = Contacts.normaliseDomainAge(site.domainAge)
      const opportunity = Contacts.opportunityScore(site)
      const health = Contacts.websiteHealth(site)
      const audit = Contacts.normaliseSeoAudit(site.seoAudit)
      const expectations = Contacts.siteExpectations(site)
        const verdict = Contacts.leadVerdict(site)
        const confidence = Contacts.scanConfidence(site)
      const decision = Contacts.decisionConfidence(site)
      const quality = Contacts.scanQuality(site)
        const market = Contacts.marketDetection(site)
      const strategy = Contacts.outreachStrategy(site)
      const displayStage = Contacts.displayLeadStageValue(site)
      const displayPriority = Contacts.displayLeadPriorityValue(site)
      const readiness = Contacts.outreachReadiness(site)
      const reasonCard = Contacts.opportunityReasonCard(site)
      const channels = Contacts.bestOutreachChannels(site)
      const checklist = Contacts.manualReviewChecklist(site)
      const conflicts = Contacts.consistencyWarnings(site)
      const duplicate = Contacts.duplicateLeadWarning(site)

      return [
        site.host,
        site.websiteUrl || (site.host ? `https://${site.host}` : ''),
        Contacts.cleanUrl(site.websiteUrl || (site.host ? `https://${site.host}` : '')),
        site.pageTitle || site.host || '',
        emails.map((row) => row.value).join('; '),
        directEmails.map((row) => row.value).join('; '),
        platformEmails.map((row) => row.value).join('; '),
        emailAssessments
          .map((item, index) => `${emails[index]?.value}: ${item.label} (${item.score}/100)`)
          .join('; '),
        emailAssessments
          .map((item, index) => `${emails[index]?.value}: ${item.reasons.join(', ')}`)
          .join('; '),
        bestEmail?.value || '',
        bestEmailConfidence
          ? `${bestEmailConfidence.label} (${bestEmailConfidence.score}/100)`
          : '',
        bestEmailConfidence
          ? `${Contacts.emailRoleIntent(bestEmail).label}: ${bestEmailConfidence.reasons.join(', ')}`
          : '',
        `${emailOutreach.label} (${emailOutreach.score}/100)`,
        emailOutreach.note,
        emails.map((row) => row.value).join('; '),
        riskyEmails.map((row) => row.value).join('; '),
        socials.map((row) => `${row.platform || 'Social'}: ${row.value}`).join('; '),
        phoneContacts.map((row) => Contacts.phoneDisplayValue(row)).join('; '),
        [...new Set(contacts.flatMap((row) => Contacts.toArray(row.sources)))].join('; '),
        market.label,
        `${market.confidence}: ${market.reasons.join('; ')}`,
        `${decision.label} (${decision.score}/100)`,
        decision.reasons.join('; ') || 'Core signals captured',
        strategy.channel,
        channels.map((item) => `${item.type}: ${item.value} (${item.reason})`).join(' | '),
        strategy.tone,
        strategy.angle,
        `${readiness.score}/100 - ${readiness.label}: ${readiness.reasons.join('; ')}`,
        reasonCard.why,
        reasonCard.whyNotHigh,
        reasonCard.offerFirst,
        checklist.join('; '),
        conflicts.join('; '),
        duplicate,
        strategy.firstMessage,
        strategy.followUp,
        Contacts.pageIntentWarning(site),
        Contacts.scoreReasons(site).join('; '),
        verdict.label,
        verdict.reason,
        `${confidence.label} (${confidence.score}/100): ${confidence.reasons.join('; ') || 'Core signals captured'}`,
        `${quality.label}: ${quality.detail}`,
        Contacts.domainAgeSummary(domainAge),
        Contacts.formatDate(domainAge.registeredAt),
        Contacts.formatDate(domainAge.updatedAt),
        Contacts.formatDate(domainAge.expiresAt),
        domainAge.registrar,
        Contacts.domainAgeStatusLabel(domainAge.status),
        Contacts.leadScore(site),
        opportunity.score,
        opportunity.pitch,
        Contacts.recommendedServices(site).join('; ') ||
          (verdict.excluded ? 'Do not use for outreach' : ''),
        Contacts.uniqueTextItems(Contacts.topProblems(site)).join('; '),
        Contacts.painPointLabels(site)
          .map(({ label }) => label)
          .join('; '),
        Contacts.leadQualityReasons(site)
          .map(({ label, value }) => `${label}: ${value}`)
          .join('; '),
        audit.score ?? '',
        Contacts.toArray(audit.issues).join('; '),
        audit.rawEvidence?.title || audit.title || site.pageTitle || '',
        audit.rawEvidence?.titleLength ?? (audit.title ? String(audit.title).length : ''),
        audit.rawEvidence?.description || '',
        audit.rawEvidence?.descriptionLength ?? audit.descriptionLength ?? '',
        audit.canonical || audit.rawEvidence?.canonical || '',
        audit.robots || audit.rawEvidence?.robots || '',
        audit.lang || audit.rawEvidence?.lang || '',
        audit.viewport || audit.rawEvidence?.viewport || '',
        Contacts.toArray(audit.rawEvidence?.h1Texts).join(' | '),
        audit.rawEvidence?.headingSummary ? Object.entries(audit.rawEvidence.headingSummary).map(([key, value]) => `${key}:${value}`).join('; ') : '',
        audit.wordCount ?? '',
        audit.internalLinks ?? '',
        audit.externalLinks ?? '',
        Math.max(0, Number(audit.images || 0) - Number(audit.imagesWithAlt || 0)),
        audit.brokenImages ?? '',
        Contacts.toArray(audit.schemaTypes || audit.rawEvidence?.schemaTypes).join('; '),
        audit.rawEvidence?.og ? Object.entries(audit.rawEvidence.og).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ') : '',
        audit.rawEvidence?.twitter ? Object.entries(audit.rawEvidence.twitter).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ') : '',
        audit.seoInfrastructure?.robotsTxt?.checked ? `${audit.seoInfrastructure.robotsTxt.found ? 'Found' : 'Not found'} (${audit.seoInfrastructure.robotsTxt.status || 'n/a'})${audit.seoInfrastructure.robotsTxt.error ? ` - ${audit.seoInfrastructure.robotsTxt.error}` : ''}` : '',
        Contacts.toArray(audit.seoInfrastructure?.robotsTxt?.sitemapUrls).join('; '),
        audit.seoInfrastructure?.sitemap?.checked ? `${audit.seoInfrastructure.sitemap.found ? 'Found' : 'Not found'} (${audit.seoInfrastructure.sitemap.status || 'n/a'})${audit.seoInfrastructure.sitemap.error ? ` - ${audit.seoInfrastructure.sitemap.error}` : ''}` : '',
        audit.seoInfrastructure?.sitemap?.urlCount ?? '',
        Contacts.toArray(audit.seoInfrastructure?.sitemap?.sampleUrls).join('; '),
        speedProfile.label,
        speedProfile.ms || '',
        audit.firstContentfulPaint || audit.rawEvidence?.firstContentfulPaint || '',
        audit.largestContentfulPaint || audit.rawEvidence?.largestContentfulPaint || '',
        audit.cumulativeLayoutShift ?? audit.rawEvidence?.cumulativeLayoutShift ?? '',
        audit.navTiming?.ttfb ?? audit.rawEvidence?.navTiming?.ttfb ?? '',
        audit.resourceBreakdown ? Object.entries(audit.resourceBreakdown).map(([key, value]) => `${key}:${value}`).join('; ') : '',
        audit.rawEvidence?.pageTextPreview || '',
        Contacts.toArray(audit.intentKeywords).join('; '),
        expectations.localSeo
          ? [
              `Address: ${audit.addressSignals ? 'yes' : 'no'}`,
              `Map: ${audit.mapSignals ? 'yes' : 'no'}`,
              `Hours: ${audit.openingHourSignals ? 'yes' : 'no'}`,
              `Local schema: ${audit.hasLocalBusinessSchema ? 'yes' : 'no'}`,
            ].join('; ')
          : 'Not scored for this page',
        [
          `About: ${audit.aboutPageLinks || 0}`,
          `Reviews: ${audit.reviewSignals ? 'yes' : 'no'}`,
          `Above-fold CTA: ${audit.aboveFoldCtaCount || 0}`,
          `Forms: ${audit.contactForms || 0}`,
          `Booking links: ${audit.bookingPageLinks || 0}`,
        ].join('; '),
        health.score,
        health.recommendation,
        Contacts.buyerFacingHealthSignals(site).map(({ label, detail }) => `${label}${detail ? `: ${detail}` : ''}`).join('; '),
        Contacts.stageLabel(displayStage),
        Contacts.priorityLabel(displayPriority),
        site.leadMeta?.contacted || '',
        `${Contacts.countryFlag(market.country)} ${market.label}`.trim(),
        site.leadMeta?.followUpDate || '',
        [...new Set(contacts.flatMap((row) => Contacts.toArray(row.sources)))].join('; '),
        site.leadMeta?.notes || '',
        Contacts.toArray(site.leadMeta?.tags).join('; '),
        Contacts.toArray(site.technologies)
          .map(({ name, version }) => (version ? `${name} ${version}` : name))
          .join('; '),
        quality.label,
        site.firstFoundAt ? new Date(site.firstFoundAt).toLocaleString() : '',
        site.lastFoundAt ? new Date(site.lastFoundAt).toLocaleString() : '',
      ]
    }
    const exportRows = []

    for (let index = 0; index < sites.length; index += 1) {
      exportRows.push(buildExportRow(sites[index]))
      if (index % 15 === 0) {
        if (button) button.textContent = `Exporting ${index + 1}/${sites.length}`
        await Contacts.yieldToUi()
      }
    }

    const date = new Date().toISOString().slice(0, 10)
    const useFastCsv = sites.length >= 80
    const blob = useFastCsv
      ? Contacts.toCsvBlob(headers, exportRows)
      : Contacts.toXlsxBlob(headers, exportRows)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `qrinux-leadlens-export-${date}.${useFastCsv ? 'csv' : 'xlsx'}`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    Contacts.flashButton(button, useFastCsv ? 'CSV exported' : 'XLSX exported')
  },

  toCsvBlob(headers, rows) {
    const escapeCell = (value) => {
      const raw = String(value ?? '').replace(/\r?\n/g, ' ').trim()
      const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(','))
      .join('\n')

    return new Blob([csv], { type: 'text/csv;charset=utf-8' })
  },

  toXlsxBlob(headers, rows) {
    const allRows = [headers, ...rows]
    const sharedStrings = []
    const stringMap = new Map()
    let sharedStringUses = 0
    const scoreColumns = new Set([
      'Lead Score',
      'Opportunity Score',
      'SEO Signal Score',
      'Website Signal Score',
    ])
    const statusColumns = new Set([
      'Lead Status',
      'Evidence Confidence',
      'Scan Result',
      'Email Type',
      'Domain Age Status',
    ])
    const addString = (value) => {
      const text = String(value ?? '').replace(/\r?\n/g, ' ').trim()

      if (!stringMap.has(text)) {
        stringMap.set(text, sharedStrings.length)
        sharedStrings.push(text)
      }

      return stringMap.get(text)
    }
    const columnName = (index) => {
      let name = ''
      let value = index + 1

      while (value > 0) {
        const remainder = (value - 1) % 26

        name = String.fromCharCode(65 + remainder) + name
        value = Math.floor((value - 1) / 26)
      }

      return name
    }
    const statusStyle = (header, value) => {
      const text = String(value || '').toLowerCase()

      if (scoreColumns.has(header)) {
        const number = Number(value)

        if (!Number.isNaN(number) && number >= 70) return 2
        if (!Number.isNaN(number) && number >= 45) return 3
        if (!Number.isNaN(number)) return 4
      }
      if (!statusColumns.has(header)) return 1
      if (/exclude|low|failed|timeout|unavailable|blocked|weak|not found/.test(text)) return 4
      if (/manual|medium|partial|pending|review|platform/.test(text)) return 3
      if (/high|full|found|sellable|active|registered/.test(text)) return 2

      return 1
    }
    const widths = headers.map((header, index) => {
      const longest = Math.max(
        String(header).length,
        ...rows.map((row) => String(row[index] ?? '').length)
      )

      return Math.max(12, Math.min(45, longest + 2))
    })
    const sheetRows = allRows
      .map((row, rowIndex) => {
        const cells = headers
          .map((header, columnIndex) => {
            const ref = `${columnName(columnIndex)}${rowIndex + 1}`
            const style = rowIndex === 0 ? 5 : statusStyle(header, row[columnIndex])
            const normalizedValue = String(row[columnIndex] ?? '').replace(/\r?\n/g, ' ').trim()
            if (!normalizedValue) return `<c r="${ref}" s="${style}"/>`
            const stringIndex = addString(normalizedValue)
            sharedStringUses += 1

            return `<c r="${ref}" t="s" s="${style}"><v>${stringIndex}</v></c>`
          })
          .join('')

        return `<row r="${rowIndex + 1}">${cells}</row>`
      })
      .join('')
    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('')}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${columnName(headers.length - 1)}${allRows.length}"/>
</worksheet>`
    const sharedStringXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStringUses}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map((value) => `<si><t>${Contacts.xmlEsc(value)}</t></si>`).join('')}
</sst>`
    const files = {
      '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
      '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
      'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="LeadLens Export" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
      'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
      'xl/styles.xml': Contacts.xlsxStyles(),
      'xl/worksheets/sheet1.xml': worksheet,
      'xl/sharedStrings.xml': sharedStringXml,
    }

    return Contacts.zipBlob(files)
  },

  xmlEsc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  },

  xlsxStyles() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
  <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDFBE7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3C4"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE1E1"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
  },

  zipBlob(files) {
    const encoder = new TextEncoder()
    const chunks = []
    const central = []
    let offset = 0
    const write16 = (array, value) => {
      array.push(value & 255, (value >>> 8) & 255)
    }
    const write32 = (array, value) => {
      array.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255)
    }

    Object.entries(files).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name)
      const data = encoder.encode(content)
      const crc = Contacts.crc32(data)
      const local = []

      write32(local, 0x04034b50)
      write16(local, 20)
      write16(local, 0)
      write16(local, 0)
      write16(local, 0)
      write16(local, 0)
      write32(local, crc)
      write32(local, data.length)
      write32(local, data.length)
      write16(local, nameBytes.length)
      write16(local, 0)
      chunks.push(new Uint8Array(local), nameBytes, data)

      const directory = []
      write32(directory, 0x02014b50)
      write16(directory, 20)
      write16(directory, 20)
      write16(directory, 0)
      write16(directory, 0)
      write16(directory, 0)
      write16(directory, 0)
      write32(directory, crc)
      write32(directory, data.length)
      write32(directory, data.length)
      write16(directory, nameBytes.length)
      write16(directory, 0)
      write16(directory, 0)
      write16(directory, 0)
      write16(directory, 0)
      write32(directory, 0)
      write32(directory, offset)
      central.push(new Uint8Array(directory), nameBytes)
      offset += local.length + nameBytes.length + data.length
    })

    const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0)
    const end = []

    write32(end, 0x06054b50)
    write16(end, 0)
    write16(end, 0)
    write16(end, Object.keys(files).length)
    write16(end, Object.keys(files).length)
    write32(end, centralSize)
    write32(end, offset)
    write16(end, 0)

    return new Blob([...chunks, ...central, new Uint8Array(end)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  },

  crc32(data) {
    if (!Contacts.crcTable) {
      Contacts.crcTable = Array.from({ length: 256 }, (_, index) => {
        let value = index

        for (let bit = 0; bit < 8; bit += 1) {
          value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
        }

        return value >>> 0
      })
    }

    let crc = 0xffffffff

    data.forEach((byte) => {
      crc = Contacts.crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
    })

    return (crc ^ 0xffffffff) >>> 0
  },

  async downloadBackup() {
    const snapshot = await Utils.exportAllData()
    const data = {
      exportedAt: new Date().toISOString(),
      product: 'Qrinux LeadLens',
      version: chrome.runtime.getManifest().version,
      ...snapshot,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `qrinux-leadlens-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    await setOption('lastBackupAt', new Date().toISOString())
    document.getElementById('backup-reminder').classList.add('hidden')
    await Contacts.refreshBrowserStorageStatus()
    Contacts.showToast('Backup downloaded successfully.')
  },

  serialiseSiteForExport(site) {
    if (!site || typeof site !== 'object') return site
    const plain = (value) => {
      if (value instanceof Set) return [...value]
      if (value instanceof Map) return [...value.values()]
      if (Array.isArray(value)) return value.map(plain)
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]))
      return value
    }
    const compactContact = (row = {}) => ({
      id: row.id || '', type: Contacts.isPhoneRow(row) ? 'phone' : row.type || '',
      value: Contacts.isPhoneRow(row) ? Contacts.normalisePhoneContactValue(row) : row.value || row.email || row.url || row.href || '',
      platform: row.platform || '', emailKind: row.emailKind || '', emailDomain: row.emailDomain || '',
      status: row.status || 'found', sources: Contacts.toArray(row.sources),
      foundAt: row.foundAt || '', lastSeenAt: row.lastSeenAt || '', foundCount: row.foundCount || 1,
      originalValue: row.originalValue || '',
    })
    const contacts = Contacts.uniqueContactRows([
      ...Contacts.toArray(site.contacts), ...Contacts.toArray(site.emails), ...Contacts.toArray(site.socials), ...Contacts.toArray(site.phones),
    ]).map(compactContact).filter((row) => {
      if (!row.value) return false
      if (row.type !== 'email') return true
      const verdict = globalThis.LeadLensIntelligence?.emailCandidate?.(row.value, {
        source: Contacts.toArray(row.sources).join(' '), siteHost: site.host || Contacts.hostFromUrl(site.websiteUrl || ''),
      })
      return verdict ? verdict.valid : true
    })
    const classification = Contacts.businessType(site)
    const angles = globalThis.LeadLensIntelligence?.buildOutreachAngles?.(site, 5) || []
    const eligibility = Contacts.prospectEligibility(site)
    const verdict = Contacts.leadVerdict(site)
    const readiness = Contacts.outreachReadiness(site)
    const opportunity = Contacts.opportunityScore(site)
    return {
      host: site.host || Contacts.hostFromUrl(site.websiteUrl || ''), websiteUrl: site.websiteUrl || '', pageTitle: site.pageTitle || '',
      latest: site.latest || '', lastSeenAt: site.lastSeenAt || '', scanQuality: Contacts.scanQuality(site),
      contacts,
      allEmails: [...new Set(contacts.filter((row) => row.type === 'email').map((row) => row.value))],
      allSocials: [...new Set(contacts.filter((row) => row.type === 'social').map((row) => row.value))],
      allPhones: [...new Set(contacts.filter((row) => row.type === 'phone').map((row) => row.value))],
      sources: [...new Set(contacts.flatMap((row) => row.sources || []))],
      leadMeta: plain(Contacts.normaliseLeadMeta(site.leadMeta)),
      seoAudit: plain(Contacts.normaliseSeoAudit(site.seoAudit)),
      domainAge: plain(Contacts.normaliseDomainAge(site.domainAge)),
      technologies: plain(site.technologies instanceof Map ? [...site.technologies.values()] : Contacts.toArray(site.technologies)),
      technologyHistory: plain(Contacts.normaliseTechnologyHistory(site.technologyHistory)),
      rejectedContacts: plain(Contacts.toArray(site.rejectedContacts)),
      businessIntelligence: {
        classification: plain(classification),
        eligibility: plain(eligibility),
        verdict: plain(verdict),
        outreachReadiness: plain(readiness),
        websiteOpportunity: plain(opportunity),
        outreachAngles: plain(angles),
      },
      summaryCounts: plain(site.summaryCounts || {}),
    }
  },

  compactSiteEvidence(site) {
    const audit = Contacts.normaliseSeoAudit(site?.seoAudit)
    const evidence = audit.rawEvidence || {}
    const infrastructure = audit.seoInfrastructure || {}
    const contacts = Contacts.toArray(site?.contacts)
    const emails = contacts.filter((row) => row?.type === 'email').map((row) => ({
      value: row.value || '',
      kind: Contacts.emailKind(row),
      sources: Contacts.toArray(row.sources),
    })).filter(({ value, sources }) => {
      if (!value) return false
      const verdict = globalThis.LeadLensIntelligence?.emailCandidate?.(value, {
        source: Contacts.toArray(sources).join(' '), siteHost: site?.host || Contacts.hostFromUrl(site?.websiteUrl || ''),
      })
      return verdict ? verdict.valid : true
    })
    const socials = Contacts.socialRows(site).map((row) => ({
      platform: row.platform || 'Social',
      value: row.value || '',
      sources: Contacts.toArray(row.sources),
    })).filter(({ value }) => value)
    const phones = Contacts.phoneRows(site).map((row) => ({
      platform: row.platform || 'Phone',
      value: Contacts.phoneDisplayValue(row),
      sources: Contacts.toArray(row.sources),
    })).filter(({ value }) => value)
    const technologies = [...(site?.technologies instanceof Map ? site.technologies.values() : Contacts.toArray(site?.technologies))]
      .map(({ name = '', version = '', confidence = 0, categories = [] } = {}) => ({
        name, version, confidence, categories: Contacts.toArray(categories).map((item) => item?.name || item).filter(Boolean),
      }))
      .filter(({ name }) => name)

    return {
      schemaVersion: 'leadlens-evidence-v5',
      siteId: site?.host || Contacts.hostFromUrl(site?.websiteUrl || ''),
      url: site?.websiteUrl || '',
      pageTitle: site?.pageTitle || evidence.title || audit.title || '',
      capturedAt: site?.lastSeenAt || site?.latest || audit.auditedAt || '',
      scanStatus: Contacts.scanQuality(site).label,
      contacts: { emails, socials, phones },
      technologies,
      page: {
        title: evidence.title || audit.title || '',
        description: evidence.description || '',
        canonical: audit.canonical || evidence.canonical || '',
        robots: audit.robots || evidence.robots || '',
        language: audit.lang || evidence.lang || '',
        direction: evidence.direction || '',
        viewport: audit.viewport || evidence.viewport || '',
        charset: evidence.charset || '',
        generator: audit.generator || evidence.generator || '',
        hreflang: Contacts.toArray(evidence.hreflangLinks),
        feeds: Contacts.toArray(evidence.feedLinks),
        manifest: evidence.webManifest || '',
        publishedAt: evidence.contentDates?.publishedAt || '',
        modifiedAt: evidence.contentDates?.modifiedAt || '',
        copyrightYears: Contacts.toArray(evidence.contentDates?.copyrightYears),
      },
      businessIdentity: evidence.businessIdentity || {},
      geographyEvidence: evidence.geographyEvidence || {},
      commerceEvidence: evidence.commerceEvidence || {},
      forms: {
        total: audit.formCount || 0,
        contactForms: audit.contactForms || 0,
        withoutSubmit: audit.formsWithoutSubmit || 0,
        details: Contacts.toArray(evidence.formDetails),
      },
      seo: {
        score: audit.score,
        h1Count: audit.h1Count || 0,
        h1Texts: Contacts.toArray(evidence.h1Texts),
        headingCount: audit.headingCount || 0,
        headingSummary: evidence.headingSummary || {},
        wordCount: audit.wordCount || 0,
        internalLinks: audit.internalLinks || 0,
        externalLinks: audit.externalLinks || 0,
        emptyLinks: audit.emptyLinks || 0,
        images: audit.images || 0,
        imagesWithAlt: audit.imagesWithAlt || 0,
        brokenImages: audit.brokenImages || 0,
        schemaTypes: Contacts.toArray(audit.schemaTypes || evidence.schemaTypes),
        issues: Contacts.toArray(audit.issues),
      },
      accessibility: evidence.accessibilitySignals || {
        unlabeledControls: audit.unlabeledControls || 0,
        emptyHeadings: audit.emptyHeadingCount || 0,
      },
      performance: {
        firstContentfulPaintMs: audit.firstContentfulPaint || null,
        largestContentfulPaintMs: audit.largestContentfulPaint || null,
        cumulativeLayoutShift: audit.cumulativeLayoutShift ?? null,
        ttfbMs: audit.navTiming?.ttfb ?? null,
        loadTimeMs: audit.loadTime || null,
        domReadyTimeMs: audit.domReadyTime || null,
        domElements: audit.domNodeCount ?? null,
        resources: audit.resources ?? null,
        resourceBreakdown: audit.resourceBreakdown || evidence.resourceBreakdown || {},
      },
      securityAndInfrastructure: {
        protocol: audit.protocol || '',
        mixedContentResources: audit.mixedContentResources || 0,
        insecureForms: audit.insecureForms || 0,
        pageResponse: infrastructure.pageResponse || {},
        robotsTxt: infrastructure.robotsTxt || {},
        sitemap: infrastructure.sitemap || {},
      },
      conversionAndTrust: {
        addressSignal: Boolean(audit.addressSignals),
        mapSignal: Boolean(audit.mapSignals),
        openingHoursSignal: Boolean(audit.openingHourSignals),
        localBusinessSchema: Boolean(audit.hasLocalBusinessSchema),
        reviewSignal: Boolean(audit.reviewSignals),
        teamSignal: Boolean(audit.teamSignals),
        contactPageLinks: audit.contactPageLinks || 0,
        aboutPageLinks: audit.aboutPageLinks || 0,
        bookingLinks: audit.bookingPageLinks || 0,
        aboveFoldCtaCount: audit.aboveFoldCtaCount || 0,
      },
      textEvidence: {
        mainContent: evidence.mainContent || {},
        preview: evidence.pageTextPreview || audit.pageTextPreview || '',
        chunks: evidence.rawTextChunks || audit.rawTextChunks || {},
        relatedPages: Contacts.toArray(evidence.relatedPageEvidence),
      },
      deterministicQuality: {
        runtimeVersion: evidence.qualityRuntimeVersion || '',
        evidenceCoverage: evidence.evidenceCoverage || null,
        recordValidation: evidence.recordValidation || { success: true, issues: [] },
        accessibilityPreflight: evidence.accessibilityAudit || null,
        explicitPageSignals: evidence.explicitPageSignals || {},
        dateEvidence: evidence.dateEvidence || {},
        note: 'Deterministic evidence only. No local language model or paid AI verdict was applied.',
      },
      domain: Contacts.normaliseDomainAge(site?.domainAge),
      businessIntelligence: {
        classification: Contacts.businessType(site),
        eligibility: Contacts.prospectEligibility(site),
        verdict: Contacts.leadVerdict(site),
        outreachReadiness: Contacts.outreachReadiness(site),
        websiteOpportunity: Contacts.opportunityScore(site),
        outreachAngles: globalThis.LeadLensIntelligence?.buildOutreachAngles?.(site, 5) || [],
      },
    }
  },

  async downloadCompactJsonl(button) {
    try {
      const summaries = Contacts.filteredSites.length ? Contacts.filteredSites : Contacts.groupBySite(Contacts.allData)
      if (!summaries.length) {
        Contacts.flashButton(button, 'No data')
        return
      }
      if (button) Contacts.setBusyButton(button, `Preparing 0/${summaries.length}...`)
      const sites = await Contacts.ensureDetailedSites(summaries, button)
      const lines = []
      for (let index = 0; index < sites.length; index += 1) {
        lines.push(JSON.stringify(Contacts.compactSiteEvidence(sites[index])))
        if (button && (index % 10 === 0 || index === sites.length - 1)) {
          Contacts.setBusyButton(button, `Normalizing ${index + 1}/${sites.length}...`)
          await Contacts.yieldToUi()
        }
      }
      const blob = new Blob([lines.join('\n') + '\n'], { type: 'application/x-ndjson;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `qrinux-leadlens-compact-evidence-${new Date().toISOString().slice(0, 10)}.jsonl`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      Contacts.flashButton(button, `JSONL: ${sites.length} sites`)
      Contacts.showToast(`Downloaded compact evidence for ${sites.length} site(s).`)
    } catch (error) {
      console.error('downloadCompactJsonl failed', error)
      Contacts.showToast('Could not prepare compact evidence.', 'error')
      if (button) Contacts.restoreBusyButton(button)
    }
  },

  async downloadAllRawJson(button) {
    try {
      if (button) Contacts.setBusyButton(button, 'Collecting raw data...')
      const detailedSites = await Contacts.ensureDetailedSites(Contacts.filteredSites || [], button)
      const payload = {
        exportedAt: new Date().toISOString(),
        product: 'Qrinux LeadLens',
        version: chrome.runtime.getManifest().version,
        scope: 'normalized-complete-evidence-v1',
        note: 'Complete unique website evidence in a normalized structure. Repeated site-level audits and technologies are stored once rather than copied into every contact. Use Download backup for a restore-ready internal storage archive.',
        totalSites: detailedSites.length,
        sites: detailedSites.map((site) => Contacts.serialiseSiteForExport(site)),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `qrinux-leadlens-raw-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      Contacts.showToast(`Downloaded raw data for ${detailedSites.length} site(s).`)
    } catch (error) {
      console.error('downloadAllRawJson failed', error)
      Contacts.showToast('Could not prepare raw data download.', 'error')
    } finally {
      if (button) Contacts.restoreBusyButton(button)
    }
  },

  async downloadSiteRawJson(host, button) {
    try {
      if (button) Contacts.setBusyButton(button, 'Preparing...')
      const summary = (Contacts.filteredSites || []).find((item) => item.host === host)
        || (Contacts.allSites || []).find((item) => item.host === host)
      const site = summary ? await Contacts.loadLeadDetails(host).catch(() => summary) : null
      if (!site) {
        Contacts.showToast('No raw data found for this lead.', 'error')
        return
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        product: 'Qrinux LeadLens',
        version: chrome.runtime.getManifest().version,
        scope: 'single-site-raw-data',
        host,
        site: Contacts.serialiseSiteForExport(site),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `qrinux-leadlens-raw-${host.replace(/[^a-z0-9.-]+/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      Contacts.showToast(`Downloaded raw data for ${host}.`)
    } catch (error) {
      console.error('downloadSiteRawJson failed', error)
      Contacts.showToast('Could not download raw data for this lead.', 'error')
    } finally {
      if (button) Contacts.restoreBusyButton(button)
    }
  },

  async renderBackupReminder() {
    const lastBackupAt = await getOption('lastBackupAt', '')
    const dismissedAt = await getOption('backupReminderDismissedAt', '')
    const reference = lastBackupAt || dismissedAt
    const daysSince = reference
      ? (Date.now() - new Date(reference).getTime()) / 86400000
      : Infinity

    document
      .getElementById('backup-reminder')
      .classList.toggle('hidden', daysSince < 14 || !Contacts.allData.length)
  },

  async dismissBackupReminder() {
    await setOption('backupReminderDismissedAt', new Date().toISOString())
    document.getElementById('backup-reminder').classList.add('hidden')
    Contacts.showToast('Backup reminder dismissed.', 'info')
  },

  async notifyDueFollowUps() {
    if (!chrome.notifications) return

    const notified = await getOption('followUpNotifications', {})
    const today = new Date().toISOString().slice(0, 10)
    const dueSites = Contacts.groupBySite(Contacts.allData).filter((site) => {
      const meta = Contacts.normaliseLeadMeta(site.leadMeta)

      return (
        meta.followUpDate &&
        meta.followUpDate <= today &&
        meta.contacted !== 'yes' &&
        notified[`${site.host}:${meta.followUpDate}`] !== true
      )
    })

    if (!dueSites.length) return

    dueSites.slice(0, 5).forEach((site) => {
      const meta = Contacts.normaliseLeadMeta(site.leadMeta)

      chrome.notifications.create(`leadlens-followup-${site.host}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('images/icon_128.png'),
        title: 'LeadLens follow-up due',
        message: `${site.host} follow-up is due today.`,
      })
      notified[`${site.host}:${meta.followUpDate}`] = true
    })

    await setOption('followUpNotifications', notified)
  },

  enterpriseSkipMatchFromUrl(url = '') {
    let host = ''

    try {
      host = Contacts.normaliseHost(Contacts.hostFromUrl(url) || new URL(url).hostname)
    } catch (error) {
      host = Contacts.normaliseHost(Contacts.hostFromUrl(url))
    }

    if (!host) return null
    const root = Contacts.rootDomain(host)

    return LEADLENS_ENTERPRISE_SKIP_DOMAINS.find(([domain]) => {
      const normal = Contacts.normaliseHost(domain)
      return host === normal || host.endsWith(`.${normal}`) || root === Contacts.rootDomain(normal)
    }) || null
  },

  shouldSkipBulkUrl(url = '') {
    if (/\.(pdf|docx?|xlsx?|pptx?|csv|zip|rar|7z|png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(String(url))) {
      return { skip: true, reason: 'File/document URL skipped' }
    }

    // Known SaaS, enterprise, marketplace, hosted-profile, and social domains
    // are not normal SMB redesign prospects. Skipping them before opening a tab
    // protects long bulk sessions and prevents misleading timeout placeholders.
    const enterprise = Contacts.enterpriseSkipMatchFromUrl(url)
    if (enterprise) {
      return { skip: true, reason: `Known non-prospect: ${enterprise[1] || enterprise[0]}` }
    }

    return { skip: false, reason: '' }
  },

  parseBulkInput(text = '') {
    const source = String(text || '')
    const found = new Set()
    // 1) Extract every explicit http(s) URL anywhere in the pasted text,
    //    even if it sits on the same line as other noise.
    const urlPattern = /\bhttps?:\/\/[^\s<>"'(){}\[\]]+/gi
    let match
    while ((match = urlPattern.exec(source)) !== null) {
      const cleaned = Contacts.normaliseImportUrl(match[0])
      if (cleaned) found.add(cleaned)
    }
    // 2) Fall back: per line, if no protocol but the line looks like a
    //    bare domain (single token with a dot and a TLD), accept it.
    source.split(/\r?\n|,|;|\t/).forEach((line) => {
      const trimmed = String(line || '').trim()
      if (!trimmed || /^https?:\/\//i.test(trimmed)) return
      // Reject prose: anything with spaces, quotes, or sentence punctuation.
      if (/[\s"'<>(){}\[\]]/.test(trimmed)) return
      // Must look like a domain: at least one dot, valid TLD-ish suffix.
      if (!/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(trimmed)) return
      const cleaned = Contacts.normaliseImportUrl(trimmed)
      if (cleaned) found.add(cleaned)
    })
    return [...found]
  },

  updateBulkUrlCount() {
    const textarea = document.getElementById('bulk-urls')
    const counter = document.getElementById('bulk-url-count')
    const urls = [...new Set(Contacts.parseBulkInput(textarea?.value || ''))]
    const largeQueue = urls.length >= BULK_QUEUE_SOFT_WARNING
    if (textarea) {
      textarea.dataset.overLimit = 'false'
      textarea.dataset.largeQueue = largeQueue ? 'true' : 'false'
    }
    if (counter) {
      counter.textContent = `${urls.length.toLocaleString()} unique website${urls.length === 1 ? '' : 's'} queued${largeQueue ? ' · Large queue will scan gradually' : ''}`
      counter.dataset.level = largeQueue ? 'warning' : 'good'
    }
    return { count: urls.length, largeQueue, urls }
  },

  scheduleBulkWorkspaceSave(delay = 220) {
    clearTimeout(Contacts.bulkWorkspaceSaveTimer)
    Contacts.bulkWorkspaceSaveTimer = setTimeout(() => {
      Contacts.persistBulkWorkspace().catch((error) => {
        console.warn('LeadLens could not save the bulk workspace', error)
      })
    }, delay)
  },

  serialiseBulkWorkspace() {
    const textarea = document.getElementById('bulk-urls')
    const inputText = textarea?.value || ''
    const activeUrls = [...Contacts.bulkRunning.values()]
      .map((record) => record?.url)
      .filter(Boolean)
    const remaining = [...new Set([...activeUrls, ...Contacts.bulkQueue])]
      .filter((url) => !Contacts.bulkDone.has(url))

    return {
      version: 2,
      inputText,
      signature: Contacts.bulkSignature || Contacts.bulkInputSignature(
        inputText.split(/\n|,/).map((value) => Contacts.normaliseImportUrl(value)).filter(Boolean)
      ),
      remaining,
      done: [...Contacts.bulkDone],
      results: Contacts.bulkResults.slice(-BULK_ACTIVITY_HISTORY_LIMIT),
      stats: Contacts.bulkResultSummary(),
      completedCount: Contacts.bulkDone.size,
      total: Contacts.bulkTotal,
      paused: Boolean(remaining.length) && !Contacts.bulkCancelled,
      maxConcurrent: Contacts.bulkMaxConcurrent,
      sessionStartedAt: Contacts.bulkSessionStartedAt || 0,
      updatedAt: Date.now(),
    }
  },

  async persistBulkWorkspace() {
    clearTimeout(Contacts.bulkWorkspaceSaveTimer)
    Contacts.bulkWorkspaceSaveTimer = null
    const snapshot = Contacts.serialiseBulkWorkspace()
    await Promise.all([
      setOption('bulkDraftText', snapshot.inputText),
      setOption('bulkResumeState', snapshot),
    ])
    return snapshot
  },

  async restoreBulkWorkspace() {
    const textarea = document.getElementById('bulk-urls')
    const status = document.getElementById('bulk-import-status')
    const draft = String(await getOption('bulkDraftText', '') || '')
    const saved = await getOption('bulkResumeState', null)

    if (textarea) textarea.value = draft || String(saved?.inputText || '')
    Contacts.updateBulkUrlCount()
    if (!saved || typeof saved !== 'object') return

    const restoredQueue = Contacts.toArray(saved.remaining)
      .map((value) => Contacts.normaliseImportUrl(value))
      .filter(Boolean)
    Contacts.bulkQueue = [...new Set(restoredQueue)]
    Contacts.bulkDone = new Set(Contacts.toArray(saved.done).filter(Boolean))
    Contacts.bulkResults = Contacts.toArray(saved.results).filter((row) => row?.url).slice(-BULK_ACTIVITY_HISTORY_LIMIT)
    Contacts.bulkStats = Contacts.normaliseBulkStats(saved.stats || Contacts.rebuildBulkStats(Contacts.bulkResults))
    Contacts.bulkTotal = Number(saved.total || 0) || Contacts.bulkQueue.length + Contacts.bulkResults.length
    Contacts.bulkSignature = String(saved.signature || '')
    Contacts.bulkPaused = Boolean(Contacts.bulkQueue.length)
    Contacts.bulkCancelled = false
    Contacts.bulkCooldownUntil = 0
    Contacts.bulkSessionStartedAt = Number(saved.sessionStartedAt || 0)
    Contacts.bulkMaxConcurrent = Math.min(5, Math.max(1, Number(saved.maxConcurrent || Contacts.bulkMaxConcurrent) || 1))

    const concurrency = document.getElementById('bulk-concurrency')
    if (concurrency) concurrency.value = String(Contacts.bulkMaxConcurrent)
    Contacts.setBulkControls(false)
    Contacts.updateBulkProgress()
    Contacts.renderBulkSummary()

    if (status && Contacts.bulkQueue.length) {
      status.textContent = `Saved scan workspace restored. ${Contacts.bulkQueue.length.toLocaleString()} website${Contacts.bulkQueue.length === 1 ? '' : 's'} remain. Click Resume scan when ready.`
    } else if (status && (textarea?.value || '').trim()) {
      status.textContent = 'Saved URL list restored. Start scan when ready.'
    }
  },

  async clearBulkWorkspace() {
    const textarea = document.getElementById('bulk-urls')
    const status = document.getElementById('bulk-import-status')

    if (Contacts.bulkRunning.size && !window.confirm('A scan is running. Stop it and clear the saved URL list?')) return
    if (Contacts.bulkRunning.size || Contacts.bulkQueue.length) Contacts.stopBulkImport()

    Contacts.bulkQueue = []
    Contacts.bulkRunning = new Map()
    Contacts.bulkDone = new Set()
    Contacts.bulkResults = []
    Contacts.bulkStats = Contacts.normaliseBulkStats()
    Contacts.bulkTotal = 0
    Contacts.bulkPaused = false
    Contacts.bulkCancelled = false
    Contacts.bulkSignature = ''
    if (textarea) textarea.value = ''
    Contacts.updateBulkUrlCount()
    await Promise.all([
      setOption('bulkDraftText', ''),
      setOption('bulkResumeState', null),
    ])
    Contacts.setBulkControls(false)
    Contacts.updateBulkProgress()
    Contacts.renderBulkSummary()
    if (status) status.textContent = 'URL list cleared. Paste websites when you are ready to start a new scan.'
    Contacts.showToast('Saved bulk URL list cleared.', 'info')
  },

  bulkInputSignature(urls = []) {
    return urls.join('\n')
  },

  bulkIsResumeCandidate(unique = []) {
    const signature = Contacts.bulkInputSignature(unique)
    return (
      Contacts.bulkPaused &&
      Contacts.bulkSignature &&
      Contacts.bulkSignature === signature &&
      Contacts.bulkTotal > 0 &&
      (Contacts.bulkQueue.length > 0 || Contacts.bulkResults.length > 0)
    )
  },

  async startBulkImport() {
    const textarea = document.getElementById('bulk-urls')
    const status = document.getElementById('bulk-import-status')
    const concurrencySelect = document.getElementById('bulk-concurrency')
    const { urls, largeQueue, count } = Contacts.updateBulkUrlCount()
    if (largeQueue) {
      Contacts.showToast(`${count.toLocaleString()} websites queued. LeadLens will process them gradually with browser-safe checkpoints.`, 'info')
    }
    const rawUnique = urls
    const skippedBeforeScan = []
    const unique = []

    rawUnique.forEach((url) => {
      const skip = Contacts.shouldSkipBulkUrl(url)
      if (skip.skip) skippedBeforeScan.push({ url, reason: skip.reason })
      else unique.push(url)
    })

    if (!unique.length && !skippedBeforeScan.length) {
      if (status) status.textContent = 'Add URLs first.'
      Contacts.updateBulkProgress()
      Contacts.showToast('Add URLs before starting a bulk scan.', 'error')
      return
    }

    const storageStats = await Contacts.refreshBrowserStorageStatus()
    if (storageStats && storageStats.percent >= 98) {
      if (status) {
        status.textContent = 'Browser database is almost full. Download a backup and delete old leads before starting a new batch.'
      }
      Contacts.updateBulkProgress()
      Contacts.showToast('Browser database is almost full. Back up and clean old leads before scanning more websites.', 'error')
      return
    }

    const selectedLimit = Math.min(
      5,
      Math.max(1, Number(concurrencySelect?.value || 1) || 1)
    )
    Contacts.bulkMaxConcurrent = selectedLimit
    await setOption('bulkMaxConcurrent', Contacts.bulkMaxConcurrent)

    const isResume = Contacts.bulkIsResumeCandidate(unique)

    if (!isResume) {
      Contacts.bulkQueue = unique
      Contacts.bulkRunning = new Map()
      Contacts.bulkDone = new Set()
      Contacts.bulkResults = []
      Contacts.bulkStats = Contacts.normaliseBulkStats()
      Contacts.bulkTotal = unique.length + skippedBeforeScan.length
      Contacts.bulkSignature = Contacts.bulkInputSignature(unique)
      Contacts.bulkSessionStartedAt = Date.now()
      Contacts.bulkCooldownUntil = 0
    } else {
      const completedUrls = new Set(Contacts.bulkResults.map((item) => item.url))
      Contacts.bulkDone = new Set([...Contacts.bulkDone, ...completedUrls])
      Contacts.bulkQueue = Contacts.bulkQueue.filter((url) => !Contacts.bulkDone.has(url))
      Contacts.bulkTotal = unique.length + skippedBeforeScan.length
    }

    for (const { url, reason } of skippedBeforeScan) {
      await Contacts.recordBulkResult(url, 'skipped-enterprise', reason)
      Contacts.bulkDone.add(url)
      await Contacts.yieldToUi()
    }

    if (!unique.length && skippedBeforeScan.length) {
      Contacts.bulkPaused = false
      Contacts.setBulkControls(false)
      Contacts.updateBulkProgress()
      Contacts.renderBulkSummary()
      if (status) status.textContent = `Skipped ${skippedBeforeScan.length} excluded enterprise or directory URLs. Nothing left to scan.`
      return
    }

    Contacts.bulkPaused = false
    Contacts.bulkCancelled = false
    await Contacts.captureBulkOriginalTab()
    Contacts.startBulkFocusRotation()
    Contacts.setBulkControls(true)
    Contacts.renderBulkSummary()
    Contacts.updateBulkProgress()

    if (status) {
      status.textContent = isResume
        ? `Resuming scan. ${Contacts.bulkQueue.length} websites remaining. Opening up to ${Contacts.bulkMaxConcurrent} at once.`
        : `Queued ${unique.length} websites${skippedBeforeScan.length ? `, skipped ${skippedBeforeScan.length} excluded enterprise or directory URLs` : ''}. Opening up to ${Contacts.bulkMaxConcurrent} at once.`
    }
    Contacts.showToast(isResume ? 'Bulk scan resumed.' : 'Bulk scan started.', 'info')
    await Contacts.persistBulkWorkspace()
    Contacts.bulkPump()
  },

  stopBulkImport() {
    if (!Contacts.bulkRunning.size && !Contacts.bulkQueue.length) {
      Contacts.setBulkControls(false)
      return
    }

    const activeUrls = []

    for (const [tabId, record] of Contacts.bulkRunning.entries()) {
      if (record?.url && !Contacts.bulkDone.has(record.url)) activeUrls.push(record.url)
      if (record?.timeoutId) clearTimeout(record.timeoutId)
      if (typeof tabId === 'number') {
        try {
          chrome.tabs.remove(tabId)
        } catch (e) {
          // Ignore closed tabs.
        }
      }
    }

    Contacts.bulkRunning = new Map()
    Contacts.bulkQueue = [...activeUrls, ...Contacts.bulkQueue].filter(
      (url, index, list) => !Contacts.bulkDone.has(url) && list.indexOf(url) === index
    )
    if (Contacts.bulkPumpTimer) clearTimeout(Contacts.bulkPumpTimer)
    Contacts.bulkPumpTimer = null
    Contacts.bulkPaused = true
    Contacts.bulkCancelled = false
    Contacts.bulkCooldownUntil = 0
    Contacts.bulkLastStoppedAt = Date.now()
    Contacts.stopBulkFocusRotation(true)
    Contacts.setBulkControls(false)
    Contacts.updateBulkProgress()
    Contacts.renderBulkSummary()

    const status = document.getElementById('bulk-import-status')
    if (status) {
      status.textContent = Contacts.bulkQueue.length
        ? `Paused. ${Contacts.bulkQueue.length} websites remaining. Click Start scan to resume from the next website.`
        : 'Paused. All opened websites were already processed.'
    }
    Contacts.showToast('Bulk scan paused.', 'info')
    Contacts.persistBulkWorkspace().catch(() => {})
  },

  scheduleDataRefresh(delay = 2200) {
    clearTimeout(Contacts.dataRefreshTimer)
    Contacts.dataRefreshTimer = setTimeout(() => {
      Contacts.dataRefreshTimer = null
      if (Contacts.isLoadingData || Contacts.bulkRunning.size) return Contacts.scheduleDataRefresh(1800)
      Contacts.loadData().catch((error) => console.warn('LeadLens refresh skipped', error))
    }, Math.max(250, Number(delay || 0)))
  },

  bulkCooldownRemaining() {
    return Math.max(0, Number(Contacts.bulkCooldownUntil || 0) - Date.now())
  },

  beginBulkCooldownIfNeeded() {
    if (!Contacts.bulkQueue.length) return 0
    const completed = Contacts.bulkResults.length
    if (!completed) return 0
    const delay = completed % Contacts.bulkLongPauseEvery === 0
      ? Contacts.bulkLongPauseMs
      : completed % Contacts.bulkBurstSize === 0
      ? Contacts.bulkBurstPauseMs
      : 0
    if (!delay) return 0
    Contacts.bulkCooldownUntil = Math.max(Contacts.bulkCooldownUntil || 0, Date.now() + delay)
    const status = document.getElementById('bulk-import-status')
    if (status) status.textContent = `Cooling down for ${Math.ceil(delay / 1000)} seconds after ${completed} completed scans. Remaining ${Contacts.bulkQueue.length}.`
    Contacts.renderBulkSummary()
    return delay
  },

  scheduleBulkPump(delay = Contacts.bulkOpenCooldownMs) {
    if (Contacts.bulkPumpTimer || Contacts.bulkPaused || Contacts.bulkCancelled) return
    const cooldown = Contacts.bulkCooldownRemaining()
    Contacts.bulkPumpTimer = setTimeout(() => {
      Contacts.bulkPumpTimer = null
      Contacts.bulkPump()
    }, Math.max(120, Number(delay || 0), cooldown))
  },

  bulkPump() {
    if (Contacts.bulkCooldownRemaining() > 0) {
      Contacts.scheduleBulkPump(Contacts.bulkCooldownRemaining())
      return
    }
    if (Contacts.bulkCancelled || Contacts.bulkPaused) {
      Contacts.setBulkControls(false)
      Contacts.updateBulkProgress()
      Contacts.renderBulkSummary()
      return
    }

    if (!Contacts.bulkQueue.length && !Contacts.bulkRunning.size) {
      const status = document.getElementById('bulk-import-status')

      if (status) status.textContent = `Bulk scan complete.`
      Contacts.showToast('Bulk scan completed successfully.')
      Contacts.bulkPaused = false
      Contacts.stopBulkFocusRotation(true)
      Contacts.setBulkControls(false)
      Contacts.updateBulkProgress()
      Contacts.renderBulkSummary()
      Contacts.persistBulkWorkspace().catch(() => {})
      return
    }

    if (
      Contacts.bulkQueue.length &&
      Contacts.bulkRunning.size < Contacts.bulkMaxConcurrent
    ) {
      const url = Contacts.bulkQueue.shift()
      const status = document.getElementById('bulk-import-status')

      if (Contacts.bulkDone.has(url)) {
        Contacts.scheduleBulkPump(0)
        return
      }

      const pendingKey = `pending:${url}`
      Contacts.bulkRunning.set(pendingKey, { url, pending: true, startedAt: Date.now() })
      Contacts.updateBulkProgress()
      Contacts.renderBulkSummary()
      if (status) {
        status.textContent = `Opening ${Contacts.bulkRunning.size} tab${Contacts.bulkRunning.size === 1 ? '' : 's'} · Remaining ${Contacts.bulkQueue.length}`
      }

      sendMessage('contacts.js', 'beginPageScan', [url, 'bulk']).catch(() => {})

      chrome.tabs.create({ active: false, url }, (tab) => {
        Contacts.bulkRunning.delete(pendingKey)

        if (Contacts.bulkPaused || Contacts.bulkCancelled) {
          if (tab?.id) {
            try { chrome.tabs.remove(tab.id) } catch (e) { /* Ignore */ }
          }
          return
        }

        if (chrome.runtime.lastError || !tab?.id) {
          Contacts.recordBulkResult(url, 'error', chrome.runtime.lastError?.message || 'Tab did not open')
          Contacts.scheduleBulkPump()
          return
        }

        Contacts.bulkRunning.set(tab.id, {
          url,
          startedAt: Date.now(),
          loadedAt: 0,
          timeoutId: Contacts.createBulkTimeout(
            tab.id,
            url,
            Contacts.bulkInitialTimeoutMs,
            'load-timeout'
          ),
        })
        if (status) {
          status.textContent = `Scanning ${Contacts.bulkRunning.size} website${Contacts.bulkRunning.size === 1 ? '' : 's'} · Remaining ${Contacts.bulkQueue.length}`
        }
        Contacts.updateBulkProgress()
        Contacts.renderBulkSummary()
        Contacts.startBulkFocusRotation()
        Contacts.persistBulkWorkspace().catch(() => {})
        Contacts.scheduleBulkPump()
      })
      Contacts.scheduleBulkPump()
    }
  },

  async captureBulkOriginalTab() {
    try {
      const [tab] = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []))
      })
      Contacts.bulkOriginalActiveTabId = tab?.id || null
      Contacts.bulkOriginalWindowId = tab?.windowId || null
    } catch (error) {
      Contacts.bulkOriginalActiveTabId = null
      Contacts.bulkOriginalWindowId = null
    }
  },

  startBulkFocusRotation() {
    if (!Contacts.bulkFocusRotationEnabled || Contacts.bulkPaused || Contacts.bulkCancelled) return
    if (Contacts.bulkFocusTimer) return

    Contacts.bulkFocusTimer = setInterval(() => Contacts.focusNextBulkTab(), 1800)
    setTimeout(() => Contacts.focusNextBulkTab(), 400)
  },

  stopBulkFocusRotation(restoreOriginal = true) {
    if (Contacts.bulkFocusTimer) clearInterval(Contacts.bulkFocusTimer)
    Contacts.bulkFocusTimer = null
    Contacts.bulkFocusIndex = 0

    if (!restoreOriginal || !Contacts.bulkOriginalActiveTabId) return
    const tabId = Contacts.bulkOriginalActiveTabId
    setTimeout(() => {
      try {
        chrome.tabs.update(tabId, { active: true }, () => void chrome.runtime.lastError)
      } catch (error) {
        // The original tab may have been closed.
      }
    }, 250)
  },

  focusNextBulkTab() {
    if (!Contacts.bulkFocusRotationEnabled || Contacts.bulkPaused || Contacts.bulkCancelled) return
    const tabIds = [...Contacts.bulkRunning.keys()].filter((tabId) => typeof tabId === 'number')
    if (!tabIds.length) return

    Contacts.bulkFocusIndex = Contacts.bulkFocusIndex % tabIds.length
    const tabId = tabIds[Contacts.bulkFocusIndex]
    Contacts.bulkFocusIndex = (Contacts.bulkFocusIndex + 1) % tabIds.length

    try {
      chrome.tabs.update(tabId, { active: true }, () => void chrome.runtime.lastError)
    } catch (error) {
      // Ignore tabs that completed between rotation ticks.
    }
  },

  createBulkTimeout(tabId, url, delay, reason) {
    return setTimeout(() => {
      Contacts.handleBulkTimeout(tabId, url, reason)
    }, delay)
  },

  handleBulkTimeout(tabId, url, reason) {
    const record = Contacts.bulkRunning.get(tabId)
    if (!record) return
    const retryCount = Number(record.retryCount || 0)
    if (retryCount < Contacts.bulkRetryLimit) {
      if (record.timeoutId) clearTimeout(record.timeoutId)
      record.retryCount = retryCount + 1
      record.loadedAt = 0
      record.scanStartSent = false
      record.timeoutId = Contacts.createBulkTimeout(tabId, url, Contacts.bulkInitialTimeoutMs, 'load-timeout')
      Contacts.bulkRunning.set(tabId, record)
      const status = document.getElementById('bulk-import-status')
      if (status) status.textContent = `Retry ${record.retryCount}/${Contacts.bulkRetryLimit}: ${Contacts.hostFromUrl(url) || url}`
      if (record.retryCount >= 2) {
        try { chrome.tabs.update(tabId, { active: true }, () => void chrome.runtime.lastError) } catch (error) { /* Ignore */ }
      }
      try {
        chrome.tabs.reload(tabId, { bypassCache: record.retryCount >= 2 }, () => {
          if (chrome.runtime.lastError) Contacts.finishBulkTab(tabId, url, reason, chrome.runtime.lastError.message)
        })
      } catch (error) {
        Contacts.finishBulkTab(tabId, url, reason, String(error?.message || error))
      }
      return
    }
    Contacts.finishBulkTab(tabId, url, reason, `Retry limit reached after ${retryCount} attempts`)
  },

  sendBulkTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        if (response?.error) return reject(new Error(String(response.error)))
        resolve(response)
      })
    })
  },

  executeBulkContentScript(tabId) {
    return new Promise((resolve, reject) => {
      if (!chrome.scripting?.executeScript) return reject(new Error('Scripting fallback is unavailable'))
      chrome.scripting.executeScript({ target: { tabId }, files: ['js/content.js'] }, () => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        resolve(true)
      })
    })
  },

  onBulkTabUpdated(tabId, changeInfo, tab) {
    const record = Contacts.bulkRunning.get(tabId)

    if (!record || record.pending) return

    if (changeInfo.url && changeInfo.url.startsWith('chrome-error://')) {
      Contacts.finishBulkTab(tabId, record.url, 'load-error', 'Chrome could not open this website')
      return
    }

    if (tab?.url && tab.url.startsWith('chrome-error://')) {
      Contacts.finishBulkTab(tabId, record.url, 'load-error', 'Chrome could not open this website')
      return
    }

    if (changeInfo.status === 'complete') {
      clearTimeout(record.timeoutId)
      record.loadedAt = Date.now()
      record.timeoutId = Contacts.createBulkTimeout(
        tabId,
        record.url,
        Contacts.bulkLoadedTimeoutMs,
        'scan-timeout'
      )
      if (!record.scanStartSent) {
        record.scanStartSent = true
        Contacts.triggerBulkContentScan(tabId, record.url)
      }
      Contacts.bulkRunning.set(tabId, record)

      const status = document.getElementById('bulk-import-status')

      if (status) {
        status.textContent = `Loaded ${Contacts.hostFromUrl(record.url) || record.url}. Waiting for scan data...`
      }
      Contacts.updateBulkProgress()
      Contacts.renderBulkSummary()
    }
  },

  async triggerBulkContentScan(tabId, url, attempt = 0) {
    try {
      const ping = await Contacts.sendBulkTabMessage(tabId, { source: 'contacts.js', func: 'ping', args: [] })
      if (!ping?.ready && ping?.ok === false) throw new Error(ping.error || ping.status || 'Content script not ready')
      const response = await Contacts.sendBulkTabMessage(tabId, { source: 'contacts.js', func: 'startLeadLensScan', args: ['bulk'] })
      if (response?.ok === false) {
        if (response.status === 'disabled-domain') {
          Contacts.finishBulkTab(tabId, url, 'skipped-enterprise', 'Known non-prospect or excluded domain')
          return false
        }
        if (response.status === 'already-running') return true
        throw new Error(response.error || response.status || 'Scan did not start')
      }
      return true
    } catch (firstError) {
      if (attempt === 0) {
        try {
          await Contacts.executeBulkContentScript(tabId)
          await new Promise((resolve) => setTimeout(resolve, 550))
          return await Contacts.triggerBulkContentScan(tabId, url, 1)
        } catch (injectError) {
          // Continue into a controlled reload retry below.
        }
      }
      if (attempt < 2) {
        setTimeout(() => Contacts.triggerBulkContentScan(tabId, url, attempt + 1), 1300 + attempt * 900)
        return false
      }
      const record = Contacts.bulkRunning.get(tabId)
      if (record) Contacts.handleBulkTimeout(tabId, url, 'content-script-unavailable')
      return false
    }
  },

  onBulkScanComplete(message, sender = {}) {
    const senderTabId = sender.tab?.id

    if (senderTabId && Contacts.bulkRunning.has(senderTabId)) {
      const record = Contacts.bulkRunning.get(senderTabId)

      Contacts.finishBulkTab(
        senderTabId,
        record.url,
        message.ok ? 'ok' : 'error'
      )
      return
    }

    const hostname = String(message.hostname || '')

    for (const [tabId, record] of Contacts.bulkRunning.entries()) {
      if (typeof tabId !== 'number' || record.pending) continue
      try {
        const recordHost = new URL(record.url).hostname

        if (recordHost === hostname) {
          Contacts.finishBulkTab(tabId, record.url, message.ok ? 'ok' : 'error')
          break
        }
      } catch (e) {
        // Ignore malformed URLs.
      }
    }
  },

  finishBulkTab(tabId, url, reason, detail = '') {
    const record = Contacts.bulkRunning.get(tabId)

    if (!record) return

    if (record.timeoutId) clearTimeout(record.timeoutId)
    Contacts.bulkRunning.delete(tabId)
    Contacts.bulkDone.add(url)
    Contacts.recordBulkResult(url, reason, detail)
    sendMessage('contacts.js', 'releaseScanResources', [url]).catch(() => {})
    Contacts.beginBulkCooldownIfNeeded()
    Contacts.scheduleDataRefresh(reason === 'ok' ? 2600 : 3600)

    if (typeof tabId === 'number') {
      try {
        chrome.tabs.remove(tabId)
      } catch (e) {
        // Ignore closed tabs.
      }
    }

    const status = document.getElementById('bulk-import-status')

    if (status) {
      status.textContent = `Finished ${Contacts.bulkReasonLabel(reason)} · Remaining ${Contacts.bulkQueue.length}`
    }
    Contacts.updateBulkProgress()
    Contacts.renderBulkSummary()
    const completed = Contacts.bulkDone.size
    if (completed && completed % Contacts.bulkCheckpointEvery === 0) {
      Contacts.persistBulkWorkspace().catch(() => {})
    } else {
      Contacts.scheduleBulkWorkspaceSave(420)
    }
    if (completed && completed % Contacts.bulkResourceFlushEvery === 0) {
      sendMessage('contacts.js', 'releaseScanResources', ['*']).catch(() => {})
      Contacts.showToast(`Checkpoint saved after ${completed.toLocaleString()} websites. Continuing safely.`, 'info')
    }
    Contacts.scheduleBulkPump()
  },

  normaliseBulkStats(stats = {}) {
    return {
      scanned: Math.max(0, Number(stats.scanned || 0)),
      blocked: Math.max(0, Number(stats.blocked || 0)),
      timeout: Math.max(0, Number(stats.timeout || 0)),
      error: Math.max(0, Number(stats.error || 0)),
      skipped: Math.max(0, Number(stats.skipped || 0)),
    }
  },

  bulkStatsKey(reason = '') {
    const value = String(reason || '')
    if (value === 'ok') return 'scanned'
    if (value === 'skipped-enterprise') return 'skipped'
    if (/blocked|challenge/i.test(value)) return 'blocked'
    if (/timeout/i.test(value)) return 'timeout'
    return 'error'
  },

  rebuildBulkStats(rows = []) {
    return Contacts.toArray(rows).reduce((stats, item = {}) => {
      const key = Contacts.bulkStatsKey(item.reason)
      stats[key] += 1
      return stats
    }, Contacts.normaliseBulkStats())
  },

  async recordBulkResult(url, reason, detail = '') {
    const existingIndex = Contacts.bulkResults.findIndex((item) => item.url === url)
    const previous = existingIndex >= 0 ? Contacts.bulkResults[existingIndex] : null
    const next = { url, reason, detail, finishedAt: Date.now() }

    Contacts.bulkStats = Contacts.normaliseBulkStats(Contacts.bulkStats)
    if (previous) {
      const previousKey = Contacts.bulkStatsKey(previous.reason)
      Contacts.bulkStats[previousKey] = Math.max(0, Contacts.bulkStats[previousKey] - 1)
    }
    Contacts.bulkStats[Contacts.bulkStatsKey(reason)] += 1

    if (existingIndex >= 0) Contacts.bulkResults.splice(existingIndex, 1, next)
    else Contacts.bulkResults.push(next)
    if (Contacts.bulkResults.length > BULK_ACTIVITY_HISTORY_LIMIT) {
      Contacts.bulkResults.splice(0, Contacts.bulkResults.length - BULK_ACTIVITY_HISTORY_LIMIT)
    }

    Contacts.renderBulkSummary()
    Contacts.scheduleBulkWorkspaceSave(420)

    if (reason !== 'ok' && reason !== 'skipped-enterprise') {
      await sendMessage('contacts.js', 'saveScanPlaceholder', [
        url,
        Contacts.hostFromUrl(url) || url,
        reason.includes('timeout') ? 'timeout' : 'error',
      ])
      Contacts.scheduleDataRefresh(3200)
    }
  },

  setBulkControls(isRunning) {
    const start = document.getElementById('btn-bulk-import')
    const stop = document.getElementById('btn-bulk-stop')
    const textarea = document.getElementById('bulk-urls')
    const concurrency = document.getElementById('bulk-concurrency')

    if (start) {
      start.classList.toggle('hidden', Boolean(isRunning))
      start.disabled = false
      start.textContent = Contacts.bulkPaused && Contacts.bulkQueue.length ? 'Resume scan' : 'Start scan'
    }
    if (stop) {
      stop.classList.toggle('hidden', !isRunning)
      stop.disabled = !isRunning
    }
    if (textarea) textarea.disabled = Boolean(isRunning)
    if (concurrency) concurrency.disabled = Boolean(isRunning)
  },

  updateBulkProgress() {
    const bar = document.getElementById('bulk-progress-bar')
    const progress = document.getElementById('bulk-summary-progress')
    const total = Contacts.bulkTotal || Contacts.bulkResults.length + Contacts.bulkQueue.length + Contacts.bulkRunning.size
    const done = Contacts.bulkDone.size
    const active = Contacts.bulkRunning.size
    const remaining = Contacts.bulkQueue.length
    const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0

    if (bar) bar.style.width = `${percent}%`
    if (progress) progress.textContent = Contacts.bulkPaused
      ? `Paused · ${done}/${total || 0}`
      : active
        ? `${done}/${total || 0} · ${active} active`
        : `${percent}%`

    const textarea = document.getElementById('bulk-urls')
    if (textarea && Contacts.bulkPaused && Contacts.bulkSignature) {
      textarea.dataset.resumeAvailable = String(Boolean(remaining))
    }
  },

  renderBulkSummary() {
    const wrap = document.getElementById('bulk-summary')
    const stats = document.getElementById('bulk-summary-stats')
    const list = document.getElementById('bulk-summary-list')
    const running = Contacts.bulkRunning.size
    const total = Contacts.bulkTotal || Contacts.bulkResults.length + Contacts.bulkQueue.length + running
    const paused = Contacts.bulkPaused && Contacts.bulkQueue.length > 0

    if (!wrap || !stats || !list) return

    wrap.classList.toggle('hidden', !Contacts.bulkResults.length && !Contacts.bulkQueue.length && !Contacts.bulkRunning.size)
    wrap.classList.toggle('cf-bulk-summary--paused', Boolean(paused))
    const grouped = Contacts.bulkResultSummary()
    stats.innerHTML = `
      <span class="cf-bulk-summary__item cf-bulk-summary__item--ok">Full scanned ${grouped.scanned}</span>
      <span class="cf-bulk-summary__item cf-bulk-summary__item--running">Active ${running}</span>
      <span class="cf-bulk-summary__item">Done ${Contacts.bulkDone.size}/${total || 0}</span>
      <span class="cf-bulk-summary__item">Remaining ${Contacts.bulkQueue.length}</span>
      <span class="cf-bulk-summary__item">Blocked ${grouped.blocked}</span>
      <span class="cf-bulk-summary__item">Timeout ${grouped.timeout}</span>
      <span class="cf-bulk-summary__item">Error ${grouped.error}</span>
      <span class="cf-bulk-summary__item">Skipped ${grouped.skipped}</span>
      <span class="cf-bulk-summary__item">Active-tab limit ${Contacts.bulkMaxConcurrent}</span>
      <span class="cf-bulk-summary__item">Checkpoint every ${Contacts.bulkCheckpointEvery}</span>
      <span class="cf-bulk-summary__item">Focus rotation ${Contacts.bulkFocusRotationEnabled ? 'on' : 'off'}</span>
      ${Contacts.bulkCooldownRemaining() ? `<span class="cf-bulk-summary__item cf-bulk-summary__item--paused">Cooldown ${Math.ceil(Contacts.bulkCooldownRemaining() / 1000)}s</span>` : ''}
      ${paused ? '<span class="cf-bulk-summary__item cf-bulk-summary__item--paused">Paused - resume ready</span>' : ''}
    `

    const runningItems = [...Contacts.bulkRunning.values()]
      .filter((record) => record?.url)
      .slice(0, 10)
      .map(
        ({ url, loadedAt }) =>
          `<span class="cf-bulk-summary__item cf-bulk-summary__item--running">${loadedAt ? 'Scanning' : 'Opening'}: ${Contacts.esc(Contacts.hostFromUrl(url) || url)}</span>`
      )

    const resultItems = Contacts.bulkResults
      .slice(-30)
      .reverse()
      .map(
        ({ url, reason, detail }) =>
          `<span class="cf-bulk-summary__item cf-bulk-summary__item--${Contacts.esc(
            reason
          )}">${Contacts.esc(Contacts.bulkReasonLabel(reason))}: ${Contacts.esc(
            Contacts.hostFromUrl(url) || url
          )}${detail ? ` - ${Contacts.esc(detail)}` : ''}</span>`
      )

    list.innerHTML = [...runningItems, ...resultItems].join('')
    Contacts.updateBulkProgress()
  },

  bulkResultSummary() {
    return Contacts.normaliseBulkStats(Contacts.bulkStats)
  },

  bulkReasonLabel(reason) {
    const labels = {
      ok: 'Scanned',
      error: 'Scan error',
      'load-error': 'Website not reachable',
      'load-timeout': 'Did not load',
      'scan-timeout': 'Loaded but no scan result',
      timeout: 'Timeout',
      'skipped-enterprise': 'Skipped by guard',
    }

    return labels[reason] || reason
  },

  normaliseImportUrl(value) {
    const raw = String(value || '').trim()

    if (!raw) return ''

    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)

      if (!/^https?:$/.test(url.protocol)) return ''

      return url.href
    } catch (error) {
      return ''
    }
  },

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  queueDomainAgeLookups(sites = []) {
    sites.forEach((site) => {
      const domainAge = Contacts.normaliseDomainAge(site.domainAge)
      const shouldLookup =
        site.host &&
        !Contacts.hasFreshDomainAge(domainAge) &&
        !Contacts.domainAgePending.has(site.host) &&
        !Contacts.hasRecentDomainAgeQueue(site.host)

      if (!shouldLookup) return

      Contacts.domainAgePending.add(site.host)
      Contacts.domainAgeQueuedAt[site.host] = Date.now()
      sendMessage('contacts.js', 'lookupDomainAge', [
        site.host,
        site.websiteUrl || '',
        Contacts.siteScanStatus(site),
      ])
        .then((result) => {
          Contacts.domainAgePending.delete(site.host)

          if (!result) return Contacts.lookupDomainAgeFallback(site)

          Contacts.applyDomainAgeResult(site, result)
        })
        .catch(() => {
          Contacts.domainAgePending.delete(site.host)
          Contacts.domainAgeQueuedAt[site.host] = 0
          Contacts.lookupDomainAgeFallback(site)
        })
    })
  },

  async lookupDomainAgeFallback(site) {
    const result = await Contacts.fetchDomainAgeFromRdap(site)

    Contacts.applyDomainAgeResult(site, result)

    const lookups = await getOption('domainAgeLookups', {})
    Contacts.domainLookupKeys(site.host).forEach((key) => {
      lookups[key] = result
    })
    await setOption('domainAgeLookups', lookups)
  },

  async fetchDomainAgeFromRdap(site) {
    const host = Contacts.normaliseHost(site.host)
    const rootDomain = Contacts.rootDomain(host)
    const checkedAt = new Date().toISOString()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(
        `https://rdap.org/domain/${encodeURIComponent(rootDomain)}`,
        {
          headers: { Accept: 'application/rdap+json, application/json' },
          signal: controller.signal,
        }
      )

      if (response.status === 404 || response.status === 410) {
        return Contacts.domainAgeResult({
          host,
          rootDomain,
          status: 'not-found',
          checkedAt,
          message: Contacts.domainAgeLookupMessage('not-found', site),
        })
      }

      if (!response.ok) {
        return Contacts.domainAgeResult({
          host,
          rootDomain,
          status: 'lookup-failed',
          checkedAt,
          message: `Domain age lookup failed with HTTP ${response.status}.`,
        })
      }

      const data = await response.json()
      const events = Contacts.toArray(data.events)
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
      const registrar = Contacts.rdapRegistrar(data)

      if (!registeredAt) {
        return Contacts.domainAgeResult({
          host,
          rootDomain,
          status: 'no-registration-date',
          checkedAt,
          updatedAt,
          expiresAt,
          registrar,
          rdapStatus: Contacts.toArray(data.status),
          message: Contacts.domainAgeLookupMessage('no-registration-date', site),
        })
      }

      return Contacts.domainAgeResult({
        host,
        rootDomain,
        status: 'found',
        checkedAt,
        registeredAt,
        updatedAt,
        expiresAt,
        registrar,
        rdapStatus: Contacts.toArray(data.status),
        age: Contacts.domainAgeFromDate(registeredAt),
        message: 'Domain registration date found through public RDAP data.',
      })
    } catch (error) {
      return Contacts.domainAgeResult({
        host,
        rootDomain,
        status: error?.name === 'AbortError' ? 'lookup-timeout' : 'lookup-failed',
        checkedAt,
        message:
          error?.name === 'AbortError'
            ? 'Domain age lookup timed out. Try again later.'
            : Contacts.domainAgeLookupMessage('lookup-failed', site),
      })
    } finally {
      clearTimeout(timeout)
    }
  },

  applyDomainAgeResult(site, result) {
    const domainAge = Contacts.normaliseDomainAge(result)

    Contacts.allData = Contacts.allData.map((row) =>
      Contacts.sameHost(row.websiteHost, site.host) ? { ...row, domainAge } : row
    )

    const visibleSite = Contacts.filteredSites.find(({ host }) =>
      Contacts.sameHost(host, site.host)
    )

    if (visibleSite) {
      visibleSite.domainAge = domainAge
      Contacts.updateDomainAgeUi(visibleSite)
    }
  },

  updateDomainAgeUi(site) {
    const card = document
      .querySelector(`.cf-site-card__head[data-host="${CSS.escape(site.host)}"]`)
      ?.closest('.cf-site-card')

    if (!card) return

    const pill = card.querySelector('.cf-domain-age-pill')
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)

    if (pill) {
      pill.className = `cf-domain-age-pill cf-domain-age-pill--${Contacts.domainAgeGrade(
        domainAge
      )}${Contacts.hasDomainAgeResult(domainAge) ? '' : ' hidden'}`
      pill.textContent = Contacts.domainAgeShortLabel(domainAge)
    }

    const summaryCard = card.querySelector('.cf-domain-summary-card')
    const summary = summaryCard?.querySelector('strong')
    if (summaryCard) {
      summaryCard.classList.toggle('hidden', !Contacts.hasDomainAgeResult(domainAge))
    }
    if (summary) summary.textContent = Contacts.domainAgeSummary(domainAge)

    const section = card.querySelector('.cf-domain-age-section')
    if (section) section.outerHTML = Contacts.renderDomainAge(site)
  },

  hasFreshDomainAge(domainAge = {}) {
    const value = Contacts.normaliseDomainAge(domainAge)

    if (!value.checkedAt || value.status === 'unknown') return false

    return Date.now() - new Date(value.checkedAt).getTime() < 1000 * 60 * 60 * 24 * 30
  },

  hasDomainAgeResult(domainAge = {}) {
    const value = Contacts.normaliseDomainAge(domainAge)

    return value.status !== 'unknown' && Boolean(value.checkedAt)
  },

  hasRecentDomainAgeQueue(host = '') {
    const queuedAt = Contacts.domainAgeQueuedAt[host]

    return queuedAt && Date.now() - queuedAt < 1000 * 60 * 2
  },

  sameHost(a = '', b = '') {
    return Contacts.normaliseHost(a) === Contacts.normaliseHost(b)
  },

  normaliseHost(host = '') {
    return String(host || '')
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split(':')[0]
      .toLowerCase()
  },

  siteScanStatus(site) {
    const statuses = site.contacts.map(({ status }) => status).filter(Boolean)

    if (statuses.includes('error')) return 'error'
    if (statuses.includes('timeout')) return 'timeout'
    if (statuses.includes('scanned')) return 'scanned'

    return statuses[0] || ''
  },

  siteForHost(host = '') {
    return Contacts.filteredSites.find((site) => Contacts.sameHost(site.host, host))
  },

  faviconUrl(site) {
    const url = site.websiteUrl || (site.host ? `https://${site.host}` : '')

    try {
      return `${new URL(url).origin}/favicon.ico`
    } catch (error) {
      return '../images/icon_64.png'
    }
  },

  siteInitials(host = '') {
    return String(host || '?')
      .replace(/^www\./i, '')
      .split(/[.-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  },

  siteFromRow(row) {
    const technologies = new Map()

    Contacts.toArray(row.technologies).forEach((technology) => {
      if (technology.name) technologies.set(technology.name, technology)
    })

    return {
      host: row.websiteHost || Contacts.hostFromUrl(row.websiteUrl),
      websiteUrl: row.websiteUrl,
      pageTitle: row.pageTitle,
      latest: row.foundAt,
      lastSeenAt: row.lastSeenAt || row.foundAt,
      contacts: [row],
      emails: row.type === 'email' ? [row] : [],
      socials: row.type === 'social' ? [row] : [],
      platforms: new Set(row.platform ? [row.platform] : []),
      technologies,
      sources: new Set(Contacts.toArray(row.sources)),
      leadMeta: Contacts.normaliseLeadMeta(row.leadMeta),
      seoAudit: Contacts.normaliseSeoAudit(row.seoAudit),
      domainAge: Contacts.normaliseDomainAge(row.domainAge),
      technologyHistory: Contacts.normaliseTechnologyHistory(row.technologyHistory),
      summaryCounts: row.summaryCounts && typeof row.summaryCounts === 'object' ? row.summaryCounts : {},
    }
  },

  hostFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, '')
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

  domainLookupKeys(host = '') {
    const normalised = Contacts.normaliseHost(host)
    const rootDomain = Contacts.rootDomain(normalised)

    return [
      normalised,
      rootDomain,
      normalised && `www.${normalised}`,
      rootDomain && `www.${rootDomain}`,
    ]
      .filter(Boolean)
      .map((key) => key.toLowerCase())
      .filter((key, index, keys) => keys.indexOf(key) === index)
  },

  domainAgeResult(result = {}) {
    return {
      host: result.host || '',
      rootDomain: result.rootDomain || '',
      status: result.status || 'unknown',
      checkedAt: result.checkedAt || new Date().toISOString(),
      registeredAt: result.registeredAt || '',
      updatedAt: result.updatedAt || '',
      expiresAt: result.expiresAt || '',
      registrar: result.registrar || '',
      rdapStatus: Contacts.toArray(result.rdapStatus),
      age: result.age || null,
      message: result.message || '',
    }
  },

  domainAgeLookupMessage(status, site = {}) {
    if (status === 'not-found') {
      return /error|timeout|failed|unavailable/i.test(Contacts.siteScanStatus(site))
        ? 'The website did not load and RDAP could not find this domain.'
        : 'RDAP could not find this domain. It may be inactive, unavailable, or unsupported.'
    }

    if (status === 'no-registration-date') {
      return 'The domain appears in RDAP, but the registry did not expose a registration date.'
    }

    return /error|timeout|failed|unavailable/i.test(Contacts.siteScanStatus(site))
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
    const entities = Contacts.toArray(data.entities)
    const registrar = entities.find(({ roles }) =>
      Contacts.toArray(roles).includes('registrar')
    )
    const entries = Array.isArray(registrar?.vcardArray?.[1])
      ? registrar.vcardArray[1]
      : []
    const fn = entries.find(([key]) => key === 'fn')

    return fn?.[3] || ''
  },

  safeFileName(value) {
    return String(value || 'lead')
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'lead'
  },

  statusLabel(status) {
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      checking: 'Checking',
      unknown: 'Unknown',
      invalid: 'Invalid',
      found: 'Found',
    }

    return labels[status] || status || 'Unknown'
  },

  stageLabel(stage) {
    const labels = {
      new: 'New',
      qualified: 'Qualified',
      contacted: 'Contacted',
      'follow-up': 'Follow-up',
      won: 'Won',
      'not-needed': 'Not needed',
      manual_review: 'Manual Review',
      research_required: 'Research Required',
      retry_required: 'Retry Required',
      blocked_scan: 'Blocked Scan',
      parked_domain: 'Parked Domain',
      excluded: 'Excluded',
    }

    return labels[stage] || 'New'
  },

  priorityLabel(priority) {
    const labels = {
      high: 'High priority',
      normal: 'Normal priority',
      low: 'Low priority',
      manual_review: 'Manual Review',
      research_required: 'Research Required',
      retry_required: 'Retry Required',
      blocked_scan: 'Blocked Scan',
      parked_domain: 'Parked Domain',
      excluded: 'Excluded',
    }

    return labels[priority] || 'Normal priority'
  },

  displayLeadStageValue(site = {}) {
    const eligibility = Contacts.prospectEligibility(site)
    const verdict = Contacts.leadVerdict(site)
    const meta = Contacts.normaliseLeadMeta(site.leadMeta)

    // Once a user edits the CRM stage, keep the user's pipeline decision.
    if (meta.stageManual && meta.stage) return meta.stage
    if (verdict.excluded || eligibility.status === 'excluded') return 'excluded'
    if (eligibility.entityType === 'parked-domain') return 'parked_domain'
    if (eligibility.entityType === 'blocked-page' || eligibility.entityType === 'invalid-page') return 'blocked_scan'
    if (eligibility.entityType === 'retry-required') return 'retry_required'
    const localEvidence = Contacts.localBusinessEvidence(site)
    const contactSignalCount = Contacts.toArray(site.emails).length + Contacts.toArray(site.socials).length + Contacts.toArray(site.contacts).filter((row) => Contacts.isPhoneRow(row)).length
    if (eligibility.status === 'manual_review') {
      const quality = Contacts.scanQuality(site)
      if (/blocked|failed|retry|timeout|invalid/i.test(quality.label || '')) return 'manual_review'
      if (Contacts.hasUsableWebsiteEvidence(site) || localEvidence.score >= 12 || contactSignalCount > 0) return 'research_required'
      return 'manual_review'
    }
    const score = Contacts.leadScore(site)
    const opportunity = Contacts.opportunityScore(site).score
    if (score === 0) return Contacts.hasUsableWebsiteEvidence(site) ? 'research_required' : 'manual_review'
    if (!Contacts.hasActionableOutreachChannel(site)) return 'research_required'
    if (score >= 65 || opportunity >= 60) return 'qualified'

    return meta.stage || 'new'
  },

  displayLeadPriorityValue(site = {}) {
    const eligibility = Contacts.prospectEligibility(site)
    const verdict = Contacts.leadVerdict(site)
    const meta = Contacts.normaliseLeadMeta(site.leadMeta)
    const opportunity = Contacts.opportunityScore(site)

    // Once a user edits CRM priority, keep the user's saved decision.
    if (meta.priorityManual && meta.priority) return meta.priority
    if (verdict.excluded || eligibility.status === 'excluded') return 'excluded'
    const localEvidence = Contacts.localBusinessEvidence(site)
    const contactSignalCount = Contacts.toArray(site.emails).length + Contacts.toArray(site.socials).length + Contacts.toArray(site.contacts).filter((row) => Contacts.isPhoneRow(row)).length
    if (eligibility.status === 'manual_review') {
      const quality = Contacts.scanQuality(site)
      if (/blocked|failed|retry|timeout|invalid/i.test(quality.label || '')) return 'manual_review'
      return 'low'
    }
    const leadScore = Contacts.leadScore(site)
    if (leadScore === 0) return Contacts.hasUsableWebsiteEvidence(site) ? 'low' : 'manual_review'
    if (meta.priority === 'high' && (opportunity.score === 0 || /low opportunity/i.test(verdict.label || eligibility.label || ''))) return 'low'
    if (!Contacts.hasActionableOutreachChannel(site)) return 'low'
    if (leadScore >= 75 && opportunity.score >= 60) return 'high'
    return meta.priority || 'normal'
  },

  contactedLabel(contacted) {
    const labels = {
      yes: 'Contacted',
      no: 'Not contacted',
      later: 'Follow up later',
    }

    return labels[contacted] || 'Not contacted'
  },

  industryLabel(industry) {
    const labels = {
      restaurant: 'Restaurant / food business',
      legal: 'Law firm / legal services',
      clinic: 'Clinic / healthcare',
      ecommerce: 'Ecommerce / retail',
      'real-estate': 'Real estate',
      hospitality: 'Hotel / hospitality',
      'home-services': 'Home services',
      cleaning: 'Cleaning services',
      'salon-spa': 'Salon / spa',
      fitness: 'Gym / fitness',
      education: 'Education',
      nonprofit: 'Nonprofit / charity',
      construction: 'Construction',
      portfolio: 'Portfolio / personal brand',
      platform: 'Platform company',
      'local-business': 'Local business',
      agency: 'Agency',
      'agency-research': 'Agency',
      'marketing-platform-research': 'Marketing platform',
      'large-ecommerce-research': 'Large ecommerce brand',
      'chain-marketplace-research': 'Large chain / marketplace',
      finance: 'Accounting / finance',
      insurance: 'Insurance',
      industrial: 'Industrial / logistics',
      'office-services': 'Office / workspace services',
      other: 'Other',
    }

    return labels[industry] || industry || 'Unassigned'
  },

  cleanIndustryLabel(industry, site = null) {
    const business = Contacts.businessType(site)
    const value = business.id === 'agency' || business.id === 'agency-research' || business.id === 'platform' || business.id === 'marketing-platform-research'
      ? Contacts.leadIndustryValue(site)
      : industry || Contacts.leadIndustryValue(site)
    const label = Contacts.industryLabel(value)

    if (business.id === 'marketplace-listing') {
      return 'Real Estate / Property'
    }
    if (business.id === 'healthcare-platform') {
      return 'Healthcare software'
    }
    if (!value || label === 'Unassigned') return 'Unassigned'
    if (String(label).trim().length < 3) return 'Unassigned'

    return label
  },

  leadIndustryValue(site = null) {
    const meta = Contacts.normaliseLeadMeta(site?.leadMeta)
    if (meta.industry) return meta.industry
    return Contacts.inferIndustryValue(site)
  },

  inferIndustryValue(site = null) {
    if (!site) return ''
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const text = [
      site.host,
      site.websiteUrl,
      site.pageTitle,
      raw.title,
      raw.description,
      raw.pageTextPreview,
      raw.address,
      raw.contactText,
      Contacts.toArray(audit.intentKeywords).join(' '),
      Contacts.toArray(audit.schemaTypes).join(' '),
      Contacts.toArray(site.leadMeta?.tags).join(' '),
    ].filter(Boolean).join(' ').toLowerCase()
    const matches = (pattern) => pattern.test(text)

    if (matches(/\b(school|college|university|polytechnic|academy|course|education|training\s+center|student|campus|faculty)\b/)) return 'education'
    if (matches(/\b(nonprofit|non-profit|charity|foundation|food\s*banks?|red\s+cross|unicef|habitat\s+for\s+humanity|donate|donation|fundrais|volunteer)\b/)) return 'nonprofit'
    if (matches(/\b(accounting|bookkeeping|bookkeeper|tax\s+(?:firm|services?)|payroll|cpa|chartered\s+accountant|finance|financial\s+advisor|wealth|bank|credit\s+union|insurance|insurer|brokerage)\b/)) return 'finance'
    if (matches(/\b(photographer|photography|wedding\s+photo|portrait|studio\s+photo|videographer|creative\s+studio)\b/)) return 'portfolio'
    if (matches(/\b(travel|tour|tourism|vacation|adventure|flight|destination|cruise|falls\s+tour|mountaineer)\b/)) return 'hospitality'
    if (matches(/\b(coworking|co-working|office\s+space|virtual\s+office|serviced\s+office|workspace|meeting\s+rooms?)\b/)) return 'office-services'
    if (matches(/\b(manufacturing|manufacturer|industrial|aerospace|automation|factory|engineering\s+solutions|supply\s+chain|logistics|freight|courier|moving|movers|transport|shipping)\b/)) return 'industrial'
    if (matches(/\b(furniture|sofa|mattress|home\s+decor|interior|lighting|table|chair|beds?)\b/)) return 'ecommerce'
    if (matches(/\b(pet|pets|veterinary|vet\s+clinic|animal\s+hospital|dog|cat)\b/)) return 'other'
    if (matches(/\b(shop|store|cart|checkout|product|products|shopify|woocommerce|retail|candles|clothes|accessories|supplies)\b/)) return 'ecommerce'
    if (matches(/\b(restaurant|cafe|coffee|bar|bistro|dining|menu|catering|pizza|bakery|kitchen|takeaway|grill|steakhouse|food\s+truck)\b/)) return 'restaurant'
    if (matches(/\b(law\s*firm|lawyer|attorney|legal\s+service|litigation|personal\s+injury|tax\s+law)\b/)) return 'legal'
    if (matches(/\b(clinic|dentist|dental|doctor|medical|healthcare|physician|therapy|pharmacy|urgent\s+care|wellness\s+clinic)\b/)) return 'clinic'
    if (matches(/\b(real\s*estate|realtor|property|properties|apartment|homes?\s+for\s+(?:sale|rent)|condos?)\b/)) return 'real-estate'
    if (matches(/\b(hotel|resort|hospitality|guesthouse|motel|accommodation|restaurant\s+hotel)\b/)) return 'hospitality'
    if (matches(/\b(cleaning|maid|janitorial|housekeeping|commercial\s+cleaners?)\b/)) return 'cleaning'
    if (matches(/\b(construction|contractor|roofing|renovation|remodel|builder|architecture|architects?)\b/)) return 'construction'
    if (matches(/\b(plumber|plumbing|electrician|hvac|landscaping|lawn\s+care|pest\s+control|home\s+service|repair|tree\s+service)\b/)) return 'home-services'
    if (matches(/\b(salon|spa|barber|beauty|massage|waxing)\b/)) return 'salon-spa'
    if (matches(/\b(gym|fitness|yoga|pilates|personal\s+trainer|workout)\b/)) return 'fitness'
    if (matches(/\b(agency|web\s+design|web\s+development|seo\s+services|digital\s+marketing|branding\s+agency|creative\s+agency)\b/)) return 'agency'
    if (matches(/\b(portfolio|designer|artist|author|speaker|coach)\b/)) return 'portfolio'
    return ''
  },

  cleanCountryLabel(country, site = null) {
    const inferred = Contacts.inferCountryCode(site)
    const manual = Contacts.normaliseCountryValue(country)
    const normalised = manual || inferred

    if (!normalised) return 'Unassigned'
    if (normalised === 'MULTI') return '🌐 Multiple markets'

    const label = Contacts.countryLabel(normalised)

    return label === 'Unassigned'
      ? 'Unassigned'
      : `${Contacts.countryFlag(normalised)} ${label}`.trim()
  },

  inferCountryCode(site) {
    if (!site) return ''

    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const geography = raw.geographyEvidence || {}
    const identity = raw.businessIdentity || {}
    const detected = new Set()
    const addCountry = (value) => {
      const normalised = Contacts.normaliseCountryValue(value)
      if (COUNTRY_CODES.includes(normalised)) detected.add(normalised)
    }

    // Prefer explicit machine-readable geography. Missing is safer than a
    // confident-looking guess from generic page copy, city names, or services.
    Contacts.toArray(geography.addressCountries).forEach(addCountry)
    Contacts.toArray(identity.addresses).forEach((address) => addCountry(address?.addressCountry))
    Contacts.toArray(geography.areaServed).forEach(addCountry)

    const geoRegion = String(geography.geoMeta?.region || '').trim().toUpperCase()
    const regionCountry = geoRegion.match(/^([A-Z]{2})(?:[-_]|$)/)?.[1] || ''
    if (COUNTRY_CODES.includes(regionCountry)) detected.add(regionCountry)

    const addressText = Contacts.toArray(geography.addressTexts).join(' ')
    const explicitCountryAliases = [
      ['US', /\b(?:united states(?: of america)?|u\.s\.a\.|usa)\b/i],
      ['CA', /\bcanada\b/i],
      ['GB', /\b(?:united kingdom|great britain)\b/i],
      ['BD', /\bbangladesh\b/i],
      ['IN', /\bindia\b/i],
      ['AU', /\baustralia\b/i],
      ['NZ', /\bnew zealand\b/i],
      ['AE', /\b(?:united arab emirates|uae)\b/i],
      ['SA', /\bsaudi arabia\b/i],
      ['SG', /\bsingapore\b/i],
      ['MY', /\bmalaysia\b/i],
      ['PK', /\bpakistan\b/i],
      ['ZA', /\bsouth africa\b/i],
      ['DE', /\bgermany\b/i],
      ['FR', /\bfrance\b/i],
      ['IT', /\bitaly\b/i],
      ['ES', /\bspain\b/i],
      ['NL', /\bnetherlands\b/i],
      ['BR', /\bbrazil\b/i],
      ['MX', /\bmexico\b/i],
      ['JP', /\bjapan\b/i],
      ['CN', /\bchina\b/i],
    ]
    explicitCountryAliases.forEach(([code, pattern]) => {
      if (pattern.test(addressText)) detected.add(code)
    })

    // A Canadian postal code is distinctive enough to use when it appears in
    // an address element or structured PostalAddress evidence.
    if (/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/i.test(addressText)) {
      detected.add('CA')
    }

    if (detected.size > 1) return 'MULTI'
    if (detected.size === 1) return [...detected][0]

    const host = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const genericCountryLikeTlds = new Set(['ai', 'co', 'io', 'me', 'tv', 'cc', 'fm', 'ws'])
    const tld = String(geography.ccTld || host.split('.').pop() || '').toUpperCase()
    if (COUNTRY_CODES.includes(tld) && !genericCountryLikeTlds.has(tld.toLowerCase())) return tld

    // Use a country-specific currency only as a final deterministic fallback.
    // Shared currencies such as USD and EUR are intentionally excluded.
    const currencyCountries = {
      CAD: 'CA', GBP: 'GB', BDT: 'BD', INR: 'IN', AED: 'AE', SAR: 'SA',
      QAR: 'QA', AUD: 'AU', NZD: 'NZ', JPY: 'JP', CNY: 'CN', SGD: 'SG',
      MYR: 'MY', ZAR: 'ZA', CHF: 'CH', SEK: 'SE', NOK: 'NO', DKK: 'DK', PKR: 'PK',
    }
    const currencyMatches = [...new Set(
      Contacts.toArray(geography.currencyCodes)
        .map((currency) => currencyCountries[String(currency || '').toUpperCase()] || '')
        .filter(Boolean)
    )]
    return currencyMatches.length === 1 ? currencyMatches[0] : currencyMatches.length > 1 ? 'MULTI' : ''
  },

  displayWebsiteType(site) {
    return 'Website profile'
  },

  businessType(site) {
    const eligibility = Contacts.prospectEligibility(site)
    if (eligibility.entityType === 'internal-test') {
      return { id: 'internal-test', label: 'Internal/Test Domain', confidence: 'High', confidenceScore: 100, reasons: eligibility.reasons, size: { id: 'micro', label: 'Internal/test', confidence: 'High', reasons: [] }, approach: 'Do not contact.' }
    }
    const classified = globalThis.LeadLensIntelligence?.classifyBusiness?.(site)
    if (classified) return classified
    const inferred = Contacts.inferIndustryValue(site)
    const labels = {
      agency: 'IT / digital agency', education: 'Education / university', nonprofit: 'Nonprofit / charity', finance: 'Financial services', restaurant: 'Restaurant / food business', legal: 'Law firm / legal services', clinic: 'Healthcare / clinic', ecommerce: 'Ecommerce / retail', 'real-estate': 'Real estate', hospitality: 'Hotel / hospitality', 'home-services': 'Local service business', cleaning: 'Local service business', construction: 'Local service business', portfolio: 'Portfolio / personal brand', fitness: 'Local service business', 'salon-spa': 'Local service business',
    }
    return { id: inferred || 'general', label: labels[inferred] || 'General business', confidence: inferred ? 'Medium' : 'Low', confidenceScore: inferred ? 64 : 48, reasons: inferred ? ['Page content and website signals match this category.'] : ['No single sector dominated; using a general business profile.'], size: { id: 'small', label: 'Small', confidence: 'Low', reasons: [] }, approach: inferred === 'agency' ? 'Peer-to-peer collaboration or white-label delivery.' : 'Use the clearest evidence-backed improvement angle.' }
  },

  largeEcommerceBrandSignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const known = [
      ['health-ade.com', 'Health-Ade'],
      ['drinkhint.com', 'Hint Water'],
      ['meundies.com', 'MeUndies'],
      ['gymshark.com', 'Gymshark'],
      ['fabletics.com', 'Fabletics'],
      ['aloyoga.com', 'Alo Yoga'],
      ['calpaktravel.com', 'CALPAK'],
      ['buffy.co', 'Buffy'],
      ['bollandbranch.com', 'Boll & Branch'],
      ['vuoriclothing.com', 'Vuori'],
      ['trueclassictees.com', 'True Classic'],
      ['bombas.com', 'Bombas'],
      ['cuyana.com', 'Cuyana'],
      ['awaytravel.com', 'Away'],
      ['tuftandneedle.com', 'Tuft & Needle'],
      ['purple.com', 'Purple'],
      ['allbirds.com', 'Allbirds'],
      ['madewell.com', 'Madewell'],
      ['jcrew.com', 'J.Crew'],
      ['mizzenandmain.com', 'Mizzen+Main'],
      ['leesa.com', 'Leesa'],
      ['wearfigs.com', 'FIGS'],
      ['warbyparker.com', 'Warby Parker'],
      ['casper.com', 'Casper'],
      ['helixsleep.com', 'Helix Sleep'],
      ['snowehome.com', 'Snowe'],
      ['monostore.com', 'Monostore'],
      ['bonobos.com', 'Bonobos'],
      ['rhone.com', 'Rhone'],
      ['mackweldon.com', 'Mack Weldon'],
      ['functionofbeauty.com', 'Function of Beauty'],
      ['prose.com', 'Prose'],
      ['blueland.com', 'Blueland'],
      ['branchbasics.com', 'Branch Basics'],
      ['grove.co', 'Grove Collaborative'],
      ['sietefoods.com', 'Siete Foods'],
      ['kodiakcakes.com', 'Kodiak Cakes'],
      ['rxbar.com', 'RXBAR'],
      ['clifbar.com', 'CLIF Bar'],
      ['kind.com', 'KIND'],
      ['vitalproteins.com', 'Vital Proteins'],
      ['spindriftfresh.com', 'Spindrift'],
      ['lacroixwater.com', 'LaCroix'],
      ['kettleandfire.com', 'Kettle & Fire'],
      ['banza.com', 'Banza'],
    ]
    const exact = known.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const retailBrandLanguage = /\b(dtc|direct[-\s]?to[-\s]?consumer|official\s+(?:store|website)|shop\s+(?:now|all)|premium\s+(?:essentials|apparel|bedding)|activewear|athletic\s+clothing|workout\s+clothes|mattresses?|luggage|kombucha|probiotic\s+tea|socks|underwear|scrubs|medical\s+uniforms)\b/i.test(text)
    const ecommerceTech = /\b(shopify|bigcommerce|woocommerce|magento|global-e|shop\s*pay|apple\s*pay|paypal|klarna|afterpay|affirm|yotpo|klaviyo|gorgias|kustomer|loop\s+returns)\b/i.test(text)
    const noSmallLocalIntent = !/\b(near me|local\s+(?:service|business)|repair|plumber|dentist|clinic|law firm|restaurant\s+near|family owned local)\b/i.test(text)
    const matched = Boolean(exact) || (retailBrandLanguage && ecommerceTech && noSmallLocalIntent)

    return {
      matched,
      name: exact ? exact[1] : matched ? 'Large ecommerce/DTC brand' : '',
      reasons: matched
        ? [exact ? `known ecommerce/DTC brand domain: ${exact[0]}` : 'large ecommerce/DTC brand language with ecommerce technology']
        : [],
    }
  },

  agencyConsultancySignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const known = [
      ['ideo.com', 'IDEO'],
      ['ideou.com', 'IDEO U'],
      ['frog.co', 'frog'],
      ['rga.com', 'R/GA'],
      ['akqa.com', 'AKQA'],
      ['publicissapient.com', 'Publicis Sapient'],
      ['bain.com', 'Bain & Company'],
      ['mckinsey.com', 'McKinsey'],
      ['bcg.com', 'BCG'],
      ['deloitte.com', 'Deloitte'],
      ['pwc.com', 'PwC'],
      ['ey.com', 'EY'],
      ['kpmg.com', 'KPMG'],
      ['accenture.com', 'Accenture'],
      ['capgemini.com', 'Capgemini'],
      ['epam.com', 'EPAM'],
      ['globant.com', 'Globant'],
      ['thoughtworks.com', 'Thoughtworks'],
      ['toptal.com', 'Toptal'],
      ['andela.com', 'Andela'],
      ['netguru.com', 'Netguru'],
      ['merixstudio.com', 'Merixstudio'],
      ['intellectsoft.net', 'Intellectsoft'],
      ['iflexion.com', 'Iflexion'],
      ['scnsoft.com', 'ScienceSoft'],
      ['cleveroad.com', 'Cleveroad'],
      ['bairesdev.com', 'BairesDev'],
      ['arc.dev', 'Arc.dev'],
      ['ciklum.com', 'Ciklum'],
      ['valtech.com', 'Valtech'],
      ['mirumagency.com', 'Mirum'],
      ['deptagency.com', 'DEPT'],
      ['hugeinc.com', 'Huge'],
      ['work.co', 'Work & Co'],
      ['instrument.com', 'Instrument'],
      ['clay.global', 'Clay'],
      ['ramotion.com', 'Ramotion'],
      ['baunfire.com', 'Baunfire'],
      ['digitalnatives.hu', 'Digital Natives'],
      ['fantasy.co', 'Fantasy'],
      ['ustwo.com', 'ustwo'],
      ['metalab.com', 'Metalab'],
      ['locomotive.ca', 'Locomotive'],
      ['basicagency.com', 'BASIC/DEPT'],
      ['redantler.com', 'Red Antler'],
      ['focuslab.agency', 'Focus Lab'],
      ['columnfivemedia.com', 'Column Five'],
      ['ironpaper.com', 'Ironpaper'],
    ]
    const exact = known.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const consultancyLanguage = /\b(global\s+consulting|management\s+consulting|digital\s+transformation|technology\s+consulting|experience\s+design|product\s+design\s+agency|brand\s+strategy|innovation\s+consulting|software\s+development\s+company|nearshore\s+software|dedicated\s+development\s+teams?|hire\s+(?:developers|talent))\b/i.test(text)
    const matched = Boolean(exact) || consultancyLanguage

    return {
      matched,
      name: exact ? exact[1] : matched ? 'Agency/consultancy' : '',
      reasons: matched
        ? [exact ? `known agency/consultancy domain: ${exact[0]}` : 'agency/consultancy/service-provider language']
        : [],
    }
  },

  chainMarketplaceSignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const known = [
      ['viator.com', 'Viator'],
      ['klook.com', 'Klook'],
      ['getyourguide.com', 'GetYourGuide'],
      ['tourradar.com', 'TourRadar'],
      ['trivago.com', 'Trivago'],
      ['booking.com', 'Booking.com'],
      ['expedia.com', 'Expedia'],
      ['priceline.com', 'Priceline'],
      ['kayak.com', 'KAYAK'],
      ['tripadvisor.com', 'Tripadvisor'],
      ['marriott.com', 'Marriott'],
      ['hilton.com', 'Hilton'],
      ['hyatt.com', 'Hyatt'],
      ['ihg.com', 'IHG'],
      ['radissonhotels.com', 'Radisson Hotels'],
      ['accor.com', 'Accor'],
      ['fourseasons.com', 'Four Seasons'],
      ['rosewoodhotels.com', 'Rosewood'],
      ['mandarinoriental.com', 'Mandarin Oriental'],
      ['aman.com', 'Aman'],
      ['sixsenses.com', 'Six Senses'],
      ['belmond.com', 'Belmond'],
      ['peninsula.com', 'Peninsula'],
      ['kempinski.com', 'Kempinski'],
      ['banyantree.com', 'Banyan Tree'],
      ['anantara.com', 'Anantara'],
      ['jumeirah.com', 'Jumeirah'],
      ['ritzcarlton.com', 'Ritz-Carlton'],
      ['stregis.com', 'St. Regis'],
      ['waldorfastoria.com', 'Waldorf Astoria'],
      ['shangri-la.com', 'Shangri-La'],
      ['fairmont.com', 'Fairmont'],
      ['sofitel.com', 'Sofitel'],
      ['movenpick.com', 'Movenpick'],
      ['nh-hotels.com', 'NH Hotels'],
      ['scandichotels.com', 'Scandic Hotels'],
      ['motel6.com', 'Motel 6'],
      ['choicehotels.com', 'Choice Hotels'],
      ['wyndhamhotels.com', 'Wyndham Hotels'],
      ['bestwestern.com', 'Best Western'],
      ['nandos.com', 'Nando\'s'],
      ['pret.com', 'Pret'],
      ['cava.com', 'CAVA'],
      ['sweetgreen.com', 'Sweetgreen'],
      ['chipotle.com', 'Chipotle'],
      ['panerabread.com', 'Panera Bread'],
      ['shakeshack.com', 'Shake Shack'],
      ['fiveguys.com', 'Five Guys'],
      ['jollibeefoods.com', 'Jollibee'],
      ['wagamama.com', 'Wagamama'],
      ['yardhouse.com', 'Yard House'],
      ['thecheesecakefactory.com', 'The Cheesecake Factory'],
      ['olivegarden.com', 'Olive Garden'],
      ['longhornsteakhouse.com', 'LongHorn Steakhouse'],
      ['redlobster.com', 'Red Lobster'],
      ['ihop.com', 'IHOP'],
      ['dennys.com', 'Denny\'s'],
      ['buffalowildwings.com', 'Buffalo Wild Wings'],
      ['chilis.com', 'Chili\'s'],
      ['applebees.com', 'Applebee\'s'],
      ['outback.com', 'Outback Steakhouse'],
      ['ruthschris.com', 'Ruth\'s Chris'],
      ['texasroadhouse.com', 'Texas Roadhouse'],
      ['pfchangs.com', 'P.F. Chang\'s'],
      ['timhortons.com', 'Tim Hortons'],
      ['dunkindonuts.com', 'Dunkin'],
      ['baskinrobbins.com', 'Baskin Robbins'],
      ['krispykreme.com', 'Krispy Kreme'],
    ]
    const exact = known.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const marketplaceLanguage = /\b(book\s+(?:hotels?|tours?|restaurants?|experiences)|compare\s+(?:hotels?|flights?|prices)|travel\s+marketplace|tour\s+marketplace|restaurant\s+reservations?|find\s+and\s+book|things\s+to\s+do|hotel\s+chain|resort\s+chain|franchise\s+locations?)\b/i.test(text)
    const matched = Boolean(exact) || marketplaceLanguage

    return {
      matched,
      name: exact ? exact[1] : matched ? 'Large chain/marketplace' : '',
      reasons: matched
        ? [exact ? `known chain/marketplace domain: ${exact[0]}` : 'large chain/marketplace language']
        : [],
    }
  },

  marketingPlatformSignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const known = [
      ['localiq.com', 'LocaliQ'],
      ['hibu.com', 'Hibu'],
      ['thryv.com', 'Thryv'],
      ['webfx.com', 'WebFX'],
      ['reviewtrackers.com', 'ReviewTrackers'],
      ['soci.ai', 'SOCI.ai'],
      ['scorpion.co', 'Scorpion'],
      ['reputation.com', 'Reputation.com'],
      ['podium.com', 'Podium'],
      ['birdeye.com', 'Birdeye'],
      ['broadly.com', 'Broadly'],
      ['grade.us', 'Grade.us'],
      ['nicejob.com', 'NiceJob'],
      ['gatherup.com', 'GatherUp'],
      ['signpost.com', 'Signpost'],
      ['revlocal.com', 'RevLocal'],
      ['bluecorona.com', 'Blue Corona'],
      ['straightnorth.com', 'Straight North'],
      ['lyfemarketing.com', 'LYFE Marketing'],
      ['powerdigitalmarketing.com', 'Power Digital'],
      ['disruptiveadvertising.com', 'Disruptive Advertising'],
      ['singlegrain.com', 'Single Grain'],
    ]
    const exact = known.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const platformLanguage = /\b(reputation\s+management|review\s+(?:management|monitoring|platform|software)|local\s+(?:marketing|seo)\s+(?:platform|software)|multi-location\s+marketing|location\s+marketing|customer\s+experience\s+platform|business\s+listing\s+management|listings?\s+management|social\s+media\s+management\s+platform|marketing\s+automation\s+platform)\b/i.test(text)
    const agencyPlatformLanguage = /\b(digital\s+marketing\s+agency|seo\s+agency|ppc\s+agency|local\s+marketing\s+agency|web\s+design\s+agency|internet\s+marketing\s+company|agency\s+services|marketing\s+services)\b/i.test(text)
    const matched = Boolean(exact) || platformLanguage || agencyPlatformLanguage

    return {
      matched,
      name: exact ? exact[1] : platformLanguage ? 'Marketing SaaS/platform' : agencyPlatformLanguage ? 'Marketing agency/service provider' : '',
      reasons: matched
        ? [exact ? `known marketing platform/agency domain: ${exact[0]}` : platformLanguage ? 'marketing SaaS/platform language' : 'agency/service provider marketing language']
        : [],
    }
  },

  petProductSignal(text = '') {
    const value = String(text).toLowerCase()
    const hasPetContext = /\b(dog|dogs|cat|cats|pet|pets|puppy|pup|litter|vet|animal)\b/.test(value)
    const hasProductContext = /\b(food|fresh\s+dog\s+food|dog\s+food|cat\s+food|pet\s+food|treats?|toys?|harness(?:es)?|collars?|leashes?|essentials?|self-cleaning|litter\s+box|delivery|subscription|shop|store|cart|checkout|products?)\b/.test(value)
    const hasActualRestaurantContext = /\b(restaurant|cafe|dining|grill|biryani|cuisine|takeaway|reservation)\b/.test(value)

    return hasPetContext && hasProductContext && !hasActualRestaurantContext
  },

  restaurantSignal(text = '') {
    const value = String(text).toLowerCase()
    const petFood = /\b(dog|dogs|cat|cats|pet|pets|puppy|pup|litter|vet|animal)\b/.test(value)
    const restaurantTechPlatform = Contacts.operationalSoftwarePlatformSignal(value) && /\b(restaurant|pos|point\s+of\s+sale|online\s+ordering|reservation)\b/.test(value)
    const strongFoodLocal = /\b(restaurant|cafe|catering|dining|grill|kitchen|biryani|cuisine|takeaway|reservation)\b/.test(value)
    const restaurantOrdering = /\b(order\s+(?:food|takeaway)|food\s+delivery|menu\s+items?)\b/.test(value) && /\b(restaurant|cafe|takeaway|delivery\s+restaurant|dining|meal\s+kit)\b/.test(value)

    // Avoid false positives from generic words like "food", "menu", or pet-food ecommerce copy.
    if (petFood && !strongFoodLocal) return false
    if (restaurantTechPlatform) return false
    return strongFoodLocal || restaurantOrdering
  },

  saasEmailToolSignal(text = '') {
    return /email\s*(verifier|checker|validation|validator|address validator)|bulk\s*email|email\s*api|deliverability|cold\s*email|mailmeteor|hunter\.io|verifalia/.test(String(text).toLowerCase())
  },

  operationalSoftwarePlatformSignal(text = '') {
    const value = String(text).toLowerCase()
    const softwareContext = /\b(software|platform|system|suite|app|solution|management|operations|automation|dashboard|pos|point\s+of\s+sale|work\s+orders?|cmms)\b/.test(value)
    const restaurantTech = /\b(restaurant\s+(?:technology|management|marketing|operations|pos|software)|pos\s+(?:system|software|platform)|point\s+of\s+sale|online\s+ordering\s+(?:system|platform|software)|reservation\s+(?:platform|software|system))\b/.test(value)
    const maintenanceTech = /\b(cmms|maintenance\s+(?:software|platform|management|operations)|asset\s+management\s+(?:software|platform)|facilit(?:y|ies)\s+(?:management|maintenance|operations)\s+(?:software|platform)|field\s+service\s+(?:management|software)|work\s+orders?)\b/.test(value)
    const productBrand = /\b(owner\.com|spoton|lightspeed|jolt|touchbistro|toast\s+pos|toasttab|restaurant365|maintainx|upkeep|fmx|fiix|limble|flowpath|facilitybot)\b/.test(value)

    return productBrand || (softwareContext && (restaurantTech || maintenanceTech))
  },

  productPlatformSignal(text = '') {
    const value = String(text).toLowerCase()
    const signals = [
      /\b(saas|software|platform|app|dashboard|subscription|demo|trial|pricing|pos|point\s+of\s+sale|cmms|work\s+orders?|restaurant\s+technology|restaurant\s+management\s+software|operations\s+management\s+software|maintenance\s+(?:software|platform)|facilities\s+(?:management|maintenance)|field\s+service\s+management)\b/,
      /\b(online\s+(courses?|classes?)|learning\s+(platform|resources?)|study\s+tools?|students?\s+and\s+teachers?|learn\s+to\s+code|data\s+science|professional\s+certificates?|degrees\s+online)\b/,
      /\b(workspace|collaboration|visual\s+workspace|screen\s+recorder|video\s+software|podcast\s+software|newsletter\s+growth|email\s+marketing|automation)\b/,
      /\b(running|cycling|hiking|trail\s+guides?|maps\s+for\s+hiking|healthspan|fitness\s+app|training\s+app|calorie\s+tracker|bmr\s+calculator|nutrition\s+tracking|meditation\s+app|sleep\s+app)\b/,
    ]

    return signals.some((pattern) => pattern.test(value))
  },

  strongAgencySignal(text = '') {
    const value = String(text).toLowerCase()
    const signals = [
      /\bagency\b/,
      /web(?:site)?\s*(development|design)/,
      /(development|design|digital|marketing|seo|software)\s+agency/,
      /software\s*house/,
      /drupal\s*agency/,
      /build\s+a\s+website/,
      /white-?label/,
      /client\s*(projects?|portfolio)/,
      /case\s*stud(?:y|ies)/,
    ]

    return signals.some((pattern) => pattern.test(value))
  },

  strongEcommerceSignal(text = '') {
    const value = String(text).toLowerCase()
    const signals = [
      /\becommerce\b|e-commerce/,
      /\b(shop|store|cart|checkout)\b/,
      /\b(product|products|collection|collections)\b/,
      /\b(clothing|apparel|activewear|sneakers|footwear|shoes|sunglasses|eyewear|accessories|watches|mattress|socks|underwear|grooming|gear|condiments?|sauce|coffee|grocery|groceries|smoothies?|bowls?|dog\s+food|cat\s+food|pet\s+food|pet\s+products?|litter\s+box|harness(?:es)?|collars?|leashes?)\b/,
      /\b(shopify|woocommerce|magento|bigcommerce|salesforce commerce cloud|hcl commerce)\b/,
      /\b(apple pay|google pay|paypal|klarna|afterpay|shop pay|affirm)\b/,
    ]

    return signals.filter((pattern) => pattern.test(value)).length >= 2
  },

  strongHealthcareSignal(text = '') {
    const value = String(text).toLowerCase()
    const apparelOrCommerce = /\b(scrubs|medical\s+uniforms?|nursing\s+scrubs|apparel|clothing|shop|store|cart|checkout|shoes|accessories|product|products)\b/.test(value)
    const travelOrMarketplace = /\b(tours?|tickets?|things\s+to\s+do|guide|guides?|book\s+experiences?|marketplace|destinations?)\b/.test(value)
    const strongCareContext = /\b(appointment|book\s+(?:an\s+)?appointment|patient\s+portal|doctor|physician|clinic|hospital|dentist|pharmacy|treatment|urgent\s+care|medical\s+center|healthcare\s+provider)\b/.test(value)
    const weakMedicalWords = /\b(medical|healthcare|health)\b/.test(value)

    if ((apparelOrCommerce || travelOrMarketplace) && !strongCareContext) return false
    return strongCareContext || (weakMedicalWords && /\b(appointment|patient|doctor|clinic|hospital|treatment|care)\b/.test(value))
  },

  healthcareDirectoryPlatformSignal(site = {}) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const fullText = [
      site.host,
      site.websiteUrl,
      site.pageTitle,
      Contacts.toArray(audit.intentKeywords).join(' '),
      Contacts.toArray(audit.schemaTypes).join(' '),
      Contacts.toArray(site.leadMeta?.tags).join(' '),
      Contacts.toArray(site.emails).map(({ value }) => value).join(' '),
    ]
      .join(' ')
      .toLowerCase()
    const platformSignals = [
      [/hospital\s*directory/, 'hospital directory signal'],
      [/\bhms\b/, 'HMS signal'],
      [/hospital\s*management/, 'hospital management signal'],
      [/\bdirectory\b/, 'directory signal'],
      [/\bplatform\b/, 'platform signal'],
      [/\bsoftware\b/, 'software signal'],
      [/sales@/, 'sales mailbox signal'],
      [/diagnostic\s*directory/, 'diagnostic directory signal'],
      [/find\s*(the\s*)?nearest\s*diagnostic\s*cent(?:er|re)/, 'diagnostic finder signal'],
    ]
    const reasons = platformSignals
      .filter(([pattern]) => pattern.test(fullText))
      .map(([, reason]) => reason)
    const hasActualClinicSignals =
      audit.addressSignals ||
      audit.mapSignals ||
      audit.openingHourSignals ||
      audit.phoneLinks ||
      audit.hasLocalBusinessSchema ||
      /\b(appointment|visiting hour|emergency|consultant|department)\b.*\b(phone|call|address|road|street|dhaka|chittagong)\b/i.test(fullText)

    return {
      matched: reasons.length >= 2 && !hasActualClinicSignals,
      reasons,
    }
  },

  strongPropertySignal(text = '') {
    const value = String(text).toLowerCase()
    const signals = [
      /real\s*estate/,
      /\bproperty\b/,
      /\blisting\b/,
      /\bbedroom\b/,
      /\bapartment\b/,
      /\bhouse\s*(for\s*)?(rent|sale)\b/,
      /\b(rent|sale)\b/,
      /estate\s*agent/,
      /\brealtor\b/,
      /floor\s*plan/,
      /\bsq(?:m|ft)\b/,
      /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/,
      /\bkensington\b/,
      /\bw8\b/,
    ]

    return signals.filter((pattern) => pattern.test(value)).length >= 2
  },

  leadFitVerdict(site) {
    const verdict = Contacts.leadVerdict(site)
    return { label: verdict.label, reason: verdict.reason }
  },

  pageIntentWarning(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const intent = Contacts.localAiInsight(site)?.pageIntent || ''
    const text = `${site?.websiteUrl || ''} ${site?.pageTitle || ''}`.toLowerCase()

    if (eligibility.status === 'excluded') {
      return eligibility.reason
    }
    if (eligibility.status === 'manual_review') {
      return eligibility.reason
    }
    if (/\/(listing|listings|property|properties|real-estate|realestate|rent|sales?)(\/|$|\?|-)/i.test(text)) {
      return 'This is a listing/property page. Use listing SEO or marketing review, not a generic website redesign pitch.'
    }
    if (/\/(login|signin|sign-in|account|dashboard|admin|app|projects?)(\/|$|\?)/i.test(text)) {
      return 'This is a protected/app page. Do not use for normal outreach.'
    }
    if (/homepage/i.test(intent) || !intent) return ''
    if (/listing\/property/i.test(intent)) return 'This is a listing/property page. Use listing SEO or marketing review, not a generic website redesign pitch.'
    if (/service page/i.test(intent)) return 'This is a service page. Review homepage/contact pages before final outreach.'
    if (/protected|app|login/i.test(intent)) return 'This is a protected/app page. Do not use for normal outreach.'
    if (/product|ecommerce/i.test(intent)) return 'This is a product/ecommerce page. Focus on product SEO, trust, and conversion signals.'

    return `This appears to be a ${intent}. Use manual review before pitching.`
  },

  outreachEligibility(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)
    const bestChannel = Contacts.bestOutreachChannels(site)[0]
    const bestEmail = Contacts.bestOutreachEmail(site)
    const allEmails = Contacts.toArray(site.emails)
    const hasDirectEmail = Contacts.directEmails(site).length > 0
    const hasAnyContact = allEmails.length > 0 || Contacts.toArray(site.socials).length > 0 || Contacts.toArray(site.contacts).length > 0

    if (eligibility.status === 'excluded' || exclusion.excluded) {
      return {
        label: eligibility.label || exclusion.label || 'Excluded',
        reason: eligibility.reason || exclusion.reason || 'This record should not be used for outreach.',
        state: 'excluded',
      }
    }

    if (eligibility.status === 'manual_review') {
      return {
        label: 'Manual review',
        reason: eligibility.reason || 'Verify the page and business before outreach.',
        state: 'manual_review',
      }
    }

    if (bestEmail) {
      return {
        label: 'Ready for email outreach',
        reason: `Best outreach email: ${bestEmail.value}`,
        state: 'ready',
      }
    }

    if (hasDirectEmail || allEmails.length) {
      const reviewEmail = allEmails[0]
      return {
        label: 'Contact available - manual review first',
        reason: reviewEmail ? `Captured email needs review before outreach: ${reviewEmail.value || reviewEmail.email || ''}` : 'Captured contact data needs manual review before outreach.',
        state: 'review',
      }
    }

    if (bestChannel && ['Social profile', 'Phone'].includes(bestChannel.type)) {
      return {
        label: bestChannel.type === 'Phone' ? 'Phone outreach only' : 'Social outreach only',
        reason: `${bestChannel.type} is available. Review the business fit before contact.`,
        state: 'review',
      }
    }

    if (bestChannel && !['Manual review', 'Do not contact', 'Do not contact until verified'].includes(bestChannel.type)) {
      return {
        label: 'Contact channel found',
        reason: `${bestChannel.type} is available and can be reviewed before outreach.`,
        state: 'review',
      }
    }

    if (hasAnyContact) {
      return {
        label: 'Needs contact review',
        reason: 'Some contact data was captured, but a strong direct outreach channel was not confirmed.',
        state: 'review',
      }
    }

    return {
      label: 'Contact research needed',
      reason: 'No strong outreach channel was captured yet.',
      state: 'research',
    }
  },

  marketDetection(site) {
    const inferred = Contacts.inferCountryCode(site)
    const meta = Contacts.normaliseLeadMeta(site?.leadMeta)
    const manual = Contacts.normaliseCountryValue(meta.country)
    const code = manual || inferred
    const label = code ? Contacts.countryLabel(code) : 'Unassigned'
    const reasons = []

    if (manual) reasons.push('country manually selected')
    else if (inferred === 'MULTI') reasons.push('multiple market/country signals detected')
    else if (inferred) reasons.push('country detected from structured address, explicit geography, country domain, or country-specific currency evidence')
    else reasons.push('no reliable country signal')

    return {
      country: code || '',
      label,
      confidence: manual ? 'Manual' : inferred === 'MULTI' ? 'Manual Review' : inferred ? 'Medium' : 'Low',
      reasons,
    }
  },

  decisionConfidence(site) {
    const scan = Contacts.scanConfidence(site)
    const business = Contacts.businessType(site)
    const market = Contacts.marketDetection(site)
    let score = scan.score
    const reasons = [...scan.reasons]

    if (business.confidence === 'High') score += 10
    else reasons.push('business type needs manual review')
    if (market.country) score += 5
    else reasons.push('country/market not confidently detected')
    if (Contacts.pageIntentWarning(site)) reasons.push('non-homepage scan may need manual review')

    score = Contacts.boundedScore(score)

    return {
      score,
      label: score >= 80 ? 'High' : score >= 55 ? 'Medium' : 'Low',
      reasons,
    }
  },

  scoreReasons(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      return [
        `${eligibility.status === 'manual_review' ? 'Manual review' : 'Excluded'}: ${eligibility.reason || exclusion.reason || 'Not a ready outreach lead'}`,
        eligibility.status === 'manual_review'
          ? 'Outreach action: do not contact until actual business is verified'
          : 'Outreach action: do not contact',
      ]
    }

    if (Contacts.leadScore(site) === 0) {
      return [
        'Not ready: no usable lead score yet',
        'Outreach action: manual review before contact',
      ]
    }

    const health = Contacts.websiteHealth(site)
    const opportunity = Contacts.opportunityScore(site)
    const bestEmail = Contacts.bestOutreachEmail(site)
    const items = []
    const add = (text, active = true) => {
      if (active) items.push(text)
    }

    add('+ direct email', Contacts.directEmails(site).length > 0)
    add('+ best outreach email selected', Boolean(bestEmail))
    add('+ weak SEO', site.seoAudit?.score !== null && site.seoAudit?.score < 65)
    add('+ website improvement gap', health.score < 70)
    add('+ opportunity score ' + opportunity.score, true)
    add(
      '- platform email only',
      site.emails.length > 0 &&
        !Contacts.directEmails(site).length &&
        site.emails.every((row) => Contacts.emailKind(row) === 'platform')
    )
    add(
      '- personal email only / low confidence',
      site.emails.length > 0 &&
        site.emails.every((row) => Contacts.emailKind(row) === 'personal')
    )
    add('- healthy website / low opportunity', health.score >= 75 && opportunity.score < 50)
    add('- no business fit confirmed', Contacts.businessType(site).confidence === 'Low')

    return items
  },

  buyerFacingHealthSignals(site) {
    const health = Contacts.websiteHealth(site)

    if (health.recommendation !== 'Looks healthy') return health.signals

    return health.signals.map((signal) => {
      if (signal.severity === 'critical') {
        return {
          ...signal,
          severity: 'suggestion',
          label: 'Minor observation',
        }
      }
      if (signal.severity === 'warning') {
        return {
          ...signal,
          severity: 'suggestion',
        }
      }

      return signal
    })
  },

  outreachStrategy(site) {
    const business = Contacts.businessType(site)
    const bestEmail = Contacts.bestOutreachEmail(site)
    const angles = globalThis.LeadLensIntelligence?.buildOutreachAngles?.(site, 5) || []
    const primary = angles[0] || { title: 'Evidence-backed website review', direction: business.approach || 'Lead with the clearest captured website signal.', confidence: 'Low', reason: 'Available evidence supports a soft review approach.', evidence: [] }
    const channel = bestEmail
      ? `Email: ${bestEmail.value}`
      : Contacts.phoneRows(site).length
        ? `Phone: ${Contacts.phoneDisplayValue(Contacts.phoneRows(site)[0])}`
        : site.socials?.length
          ? 'Social profile'
          : Contacts.normaliseSeoAudit(site.seoAudit).contactForms
            ? 'Website contact form'
            : 'Research contact path'
    const tone = business.id === 'agency'
      ? 'Professional, peer-to-peer, collaboration-first'
      : ['large', 'enterprise'].includes(business.size?.id)
        ? 'Specific, department-aware, vendor/partnership tone'
        : primary.confidence === 'Low'
          ? 'Soft, optional, evidence-led'
          : 'Short, practical, evidence-led'
    const name = Contacts.businessName(site)
    const angle = primary.title
    return {
      channel,
      tone,
      angle,
      angles,
      business,
      firstMessage: business.id === 'agency'
        ? `Hi, I came across ${name} and noticed your work in digital or technical services. We also support web, backend, automation, and implementation delivery, so there may be room for white-label, overflow, or referral collaboration. Would a short partnership note be useful?`
        : ['large', 'enterprise'].includes(business.size?.id)
          ? `Hi, I reviewed ${site.host} and identified a specific public website signal around ${angle.toLowerCase()}. I understand a larger organization normally works through the relevant team or vendor route. May I share a concise evidence-backed note for the appropriate department?`
          : `Hi, I reviewed ${site.host} and noticed a public website opportunity around ${angle.toLowerCase()}. Would it be useful if I sent a short note with the supporting evidence and practical next steps?`,
      followUp: `Quick follow-up on ${site.host}: happy to share a concise note focused on ${angle.toLowerCase()} and the public evidence behind it.`,
    }
  },

  businessName(site = {}) {
    const title = String(site.pageTitle || '').split(/[|-]/)[0].trim()

    return title || site.host || 'your team'
  },

  cleanUrl(url = '') {
    try {
      let raw = String(url || '')

      try {
        raw = decodeURIComponent(raw)
      } catch (error) {
        raw = raw.replace(/%7Bipurl%7D/gi, '{ipurl}')
      }

      raw = raw.replace(/\{ipurl\}\??/gi, '')

      const parsed = new URL(raw)
      const removable = [
        /^utm_/i,
        /^gad_/i,
        /^gad_source$/i,
        /^gad_campaignid$/i,
        /^gbraid$/i,
        /^wbraid$/i,
        /^gclid$/i,
        /^fbclid$/i,
        /^msclkid$/i,
        /^mc_/i,
        /^ref$/i,
        /^\??ppc_/i,
        /^ppc_keyword$/i,
        /ipurl/i,
      ]

      ;[...parsed.searchParams.keys()].forEach((key) => {
        const cleanKey = String(key || '').replace(/^\?+/, '')

        if (removable.some((pattern) => pattern.test(cleanKey))) parsed.searchParams.delete(key)
      })
      parsed.hash = ''
      parsed.pathname = parsed.pathname
        .replace(/%7Bipurl%7D/gi, '')
        .replace(/\{ipurl\}/gi, '')
        .replace(/\/{2,}/g, '/')

      return parsed.toString().replace(/\/$/, '/')
    } catch (error) {
      return url || ''
    }
  },

  normaliseSocialUrl(url = '') {
    try {
      const raw = String(url || '')
        .replace(/\$(facebook|instagram|linkedin|twitter|x)\b/gi, '')
        .replace(/\$\{[^}]+\}|\{\{[^}]+\}\}/g, '')
        .trim()
      const parsed = new URL(raw)
      let host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
      const parts = parsed.pathname.split('/').filter(Boolean)
      const lowerParts = parts.map((part) => part.toLowerCase())
      const joinedPath = lowerParts.join('/')
      if (/widgets?\.js|button\.|follow_button|widget_iframe|sdk\.js|platform\.js|connect\.facebook|plugins\/|share\?|sharer|intent\/|\/embed\//i.test(`${joinedPath}${parsed.search || ''}`)) return ''
      if (lowerParts.some((part) => /\.(?:js|css|png|jpe?g|gif|svg|webp)$/i.test(part))) return ''
      const rejects = (...values) => lowerParts.some((part) => values.includes(part))
      parsed.hash = ''
      const originalSearch = parsed.search
      parsed.search = ''
      if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com') {
        if (!parts.length || rejects('share', 'sharer', 'sharer.php', 'dialog', 'login', 'watch', 'reel', 'reels', 'story', 'stories', 'posts', 'videos', 'groups', 'events', 'marketplace', 'photo', 'photos', 'permalink.php')) return ''
        parsed.hostname = 'facebook.com'; parsed.pathname = `/${parts[0]}`
      } else if (host === 'instagram.com') {
        if (!parts.length || rejects('p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts', 'share')) return ''
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'twitter.com' || host === 'x.com') {
        if (!parts.length || rejects('status', 'statuses', 'search', 'intent', 'share', 'home', 'i', 'hashtag', 'compose')) return ''
        parsed.hostname = 'twitter.com'; parsed.pathname = `/${parts[0]}`
      } else if (host === 'linkedin.com') {
        if (parts.length < 2 || !['company', 'in', 'school', 'showcase'].includes(lowerParts[0])) return ''
        parsed.pathname = `/${parts[0]}/${parts[1]}`
      } else if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (!parts.length || rejects('watch', 'shorts', 'playlist', 'results', 'embed', 'live')) return ''
        parsed.hostname = 'youtube.com'
        if (parts[0].startsWith('@')) parsed.pathname = `/${parts[0]}`
        else if (['channel', 'c', 'user'].includes(lowerParts[0]) && parts[1]) parsed.pathname = `/${parts[0]}/${parts[1]}`
        else return ''
      } else if (host === 'tiktok.com') {
        if (!parts.length || !parts[0].startsWith('@') || rejects('video')) return ''
        parsed.pathname = `/${parts[0]}`
      } else if (host === 'pinterest.com') {
        if (!parts.length || rejects('pin', 'ideas', 'search')) return ''
        parsed.pathname = `/${parts[0]}`
      } else if (host === 't.me' || host === 'telegram.me') {
        if (!parts.length || rejects('share', 'joinchat')) return ''
        parsed.hostname = 't.me'; parsed.pathname = `/${parts[0]}`
      } else if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'whatsapp.com') {
        const digits = `${parsed.pathname}${originalSearch}`.replace(/\D/g, '')
        if (digits.length < 7 || digits.length > 15) return ''
        parsed.hostname = 'wa.me'; parsed.pathname = `/${digits}`
      } else return ''
      return parsed.toString().replace(/\/$/, '')
    } catch (error) {
      return ''
    }
  },

  bestOutreachChannels(site) {
    const channels = []
    const business = Contacts.businessType(site)
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)
    const bestEmail = Contacts.bestOutreachEmail(site)
    const add = (type, value, reason, priority) => {
      if (value) channels.push({ type, value, reason, priority })
    }

    if (eligibility.status !== 'eligible' || exclusion.excluded || Contacts.leadScore(site) === 0) {
      return [
        {
          type: eligibility.status === 'manual_review' ? 'Do not contact until verified' : 'Do not contact',
          value: eligibility.status === 'manual_review'
            ? 'Verify the actual business before outreach'
            : eligibility.reason || exclusion.reason || 'Excluded lead',
          reason: `${eligibility.label || exclusion.label}; outreach is suppressed until the fit is verified.`,
          priority: 0,
        },
      ]
    }

    if (bestEmail) {
      const confidence = Contacts.emailConfidence(bestEmail)
      const hasSocial = site.socials.length > 0

      add(
        'Email',
        bestEmail.value,
        `${confidence.label} confidence - ${confidence.reasons.slice(0, 2).join(', ')}`,
        Contacts.emailKind(bestEmail) === 'platform' && hasSocial ? 6 : 1
      )
    }

    const linkedIn = site.socials.find((row) => /linkedin/i.test(row.platform || row.value))
    const facebook = site.socials.find((row) => /facebook/i.test(row.platform || row.value))
    const instagram = site.socials.find((row) => /instagram/i.test(row.platform || row.value))
    const whatsapp = site.socials.find((row) => /whatsapp|wa\.me/i.test(row.platform || row.value))
    const phone = Contacts.phoneRows(site)[0]

    add('LinkedIn', linkedIn?.value, 'Good for B2B or professional outreach.', 2)
    add('Facebook', facebook?.value, 'Useful social outreach path when email is weak.', 3)
    add('Instagram', instagram?.value, 'Useful for restaurant/local visual businesses.', 3)
    if (['local-service', 'restaurant', 'clinic', 'manufacturer'].includes(business.id)) {
      add('WhatsApp', whatsapp?.value, 'Use for local/direct service leads when appropriate.', 4)
    }
    add('Phone', phone ? Contacts.phoneDisplayValue(phone) : '', 'Use when email is weak or platform-owned.', 5)

    if (!channels.length) {
      add('Manual review', 'No strong channel found', 'Find a contact page, owner profile, or direct business channel before outreach.', 9)
    }

    return channels.sort((a, b) => a.priority - b.priority)
  },

  outreachReadiness(site) {
    const eligibility = Contacts.prospectEligibility(site)

    if (eligibility.status !== 'eligible' || Contacts.leadExclusion(site).excluded) {
      return {
        score: 0,
        label: 'Not ready',
        reasons: [`- ${eligibility.reason || 'excluded lead'}`, '- outreach suppressed'],
        fit: 'Exclude',
      }
    }

    const painPoints = Contacts.painPointLabels(site)
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const bestChannel = Contacts.bestOutreachChannels(site)[0]
    let score = 0
    const reasons = []
    const add = (points, reason, active) => {
      if (active) {
        score += points
        reasons.push(`+ ${reason}`)
      } else {
        reasons.push(`- ${reason}`)
      }
    }

    add(35, 'actionable contact channel available', Boolean(bestChannel) && !['Manual review', 'Do not contact', 'Do not contact until verified'].includes(bestChannel.type))
    add(25, 'direct email found', Contacts.directEmails(site).length > 0)
    add(20, 'clear page issues found', painPoints.length > 0 || Contacts.topProblems(site).length > 0)
    add(10, 'usable scan data captured', audit.score !== null || site.technologies.size > 0)
    add(10, 'no exclusion conflict', !Contacts.leadExclusion(site).excluded)

    score = Contacts.boundedScore(score)

    return {
      score,
      label: score >= 75 ? 'Ready' : score >= 50 ? 'Needs review' : 'Not ready',
      reasons,
      fit: Contacts.outreachEligibility(site).label,
    }
  },

  opportunityReasonCard(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)

    if (eligibility.status === 'manual_review') {
      return {
        why: `Manual review / research source. ${eligibility.reason || 'Use this page to collect context, not for direct outreach.'}`,
        bestPitch: 'Do not use for outreach',
        whyNotHigh: 'Manual-review pages are kept for research value and should not be prioritized as outreach leads.',
        offerFirst: 'Verify the page first',
        manualNote: eligibility.reason || 'Manual review required',
      }
    }

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      return {
        why: `Excluded lead. ${eligibility.reason || exclusion.reason}`,
        bestPitch: 'Do not use for outreach',
        whyNotHigh: 'This lead is excluded and should not be prioritized.',
        offerFirst: 'Do not contact',
        manualNote: eligibility.reason || exclusion.reason,
      }
    }

    const strategy = Contacts.outreachStrategy(site)
    const readiness = Contacts.outreachReadiness(site)
    const topProblems = Contacts.uniqueTextItems(Contacts.topProblems(site))
    const contact = Contacts.bestOutreachChannels(site)[0] || { type: 'Manual review', value: 'No strong channel found' }
    const whyNotHigh =
      readiness.score >= 75
        ? 'No major blocker detected; still verify details before outreach.'
        : Contacts.manualReviewChecklist(site).slice(0, 2).join('; ') || 'Manual review recommended.'

    return {
      why: `Improvement signal focuses only on website improvement potential. ${topProblems.length ? `Main signals: ${topProblems.slice(0, 3).join(', ')}.` : 'No major issue cluster detected.'}`,
      bestPitch: strategy.angle,
      whyNotHigh,
      offerFirst: Contacts.recommendedServices(site)[0] || strategy.angle,
      manualNote: `${contact.type}: ${contact.value}`,
    }
  },

  manualReviewChecklist(site) {
    const checklist = []
    const fit = Contacts.leadFitVerdict(site)
    const eligibility = Contacts.prospectEligibility(site)
    const market = Contacts.marketDetection(site)
    const warning = Contacts.pageIntentWarning(site)

    if (eligibility.entityType === 'large-platform') {
      return [
        'Large platform/product company detected',
        'Do not use as normal outreach lead',
        'Outreach suppressed',
      ]
    }

    if (eligibility.entityType === 'blocked-page') {
      return [
        'Blocked/error page detected',
        'Retry scan in a normal browser session or verify manually',
        'Outreach suppressed',
      ]
    }

    if (eligibility.entityType === 'parked-domain') {
      return [
        'Domain parking/for-sale page detected',
        'Do not use as a normal redesign lead',
        'Outreach suppressed',
      ]
    }

    if (eligibility.entityType === 'retry-required') {
      return [
        'Website did not return usable data',
        'Retry scan or research the business manually',
        'Outreach suppressed until verified',
      ]
    }

    if (eligibility.entityType === 'directory-marketplace') {
      return [
        'Directory/marketplace platform detected',
        'Do not pitch as a normal local business lead',
        'Outreach suppressed until verified',
      ]
    }

    if (eligibility.entityType === 'country-selector') {
      return [
        'Country/language selector page detected',
        'Retry after selecting the target country or verify manually',
        'Outreach suppressed until verified',
      ]
    }

    if (eligibility.status === 'excluded') {
      return [
        eligibility.reason,
        'Do not use as normal outreach lead',
        'Outreach suppressed',
      ]
    }

    if (eligibility.status !== 'eligible') checklist.push(eligibility.reason)
    if (/manual|review/i.test(fit.label)) checklist.push('Confirm business fit')
    if (!market.country || market.confidence === 'Low') checklist.push('Confirm country/location')
    if (site.emails.length && !Contacts.directEmails(site).length) checklist.push('Check whether email belongs to business or platform')
    if (warning) checklist.push(warning)
    if (!site.emails.length && !site.socials.length) checklist.push('Find a usable contact channel')

    return checklist
  },

  consistencyWarnings(site) {
    const warnings = []
    const business = Contacts.businessType(site)
    const guard = Contacts.finalReportGuard(site)
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)
    const services = Contacts.recommendedServices(site).join(' ')
    const health = Contacts.websiteHealth(site)
    const displayPriority =
      exclusion.excluded
        ? 'excluded'
        : Contacts.leadScore(site) === 0
        ? 'manual_review'
        : Contacts.normaliseLeadMeta(site.leadMeta).priority

    if (eligibility.status !== 'eligible' && services) {
      warnings.push('Non-eligible lead has outreach services.')
    }
    if (exclusion.excluded && displayPriority !== 'excluded' && displayPriority !== 'low') {
      warnings.push('Excluded lead has non-low priority.')
    }
    if (business.id !== 'agency' && /partnership|white-label/i.test(services)) warnings.push('Partnership pitch on non-agency lead.')
    if (business.id === 'agency' && /website redesign/i.test(services)) warnings.push('Agency lead has redesign pitch.')
    if (health.score >= 80 && Contacts.painPointLabels(site).some(({ id }) => id === 'needs-redesign')) warnings.push('Healthy website has redesign label.')
    if (site.emails.some((row) => Contacts.emailKind(row) === 'platform') && Contacts.directEmails(site).length === 0) warnings.push('Only platform/provider email found.')

    return [...new Set([...warnings, ...guard.warnings])]
  },

  hasActionableOutreachChannel(site) {
    return Boolean(
      Contacts.bestOutreachEmail(site) ||
      site.socials.length ||
      site.contacts.some((contact) =>
        /phone|whatsapp|messenger|linkedin/i.test(
          String(contact.type || contact.platform || contact.value || '')
        )
      )
    )
  },

  finalReportGuard(site) {
    const warnings = []
    const business = Contacts.businessType(site)
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)
    const meta = Contacts.normaliseLeadMeta(site.leadMeta)
    const verdict = Contacts.leadVerdict(site)
    const services = Contacts.recommendedServices(site)
    const strategy = Contacts.outreachStrategy(site)
    const leadScore = Contacts.leadScore(site)
    const opportunity = Contacts.opportunityScore(site)
    const readiness = Contacts.outreachReadiness(site)
    const stage = Contacts.displayLeadStageValue(site)
    const priority = Contacts.displayLeadPriorityValue(site)
    const manualIndustry = meta.industry
    const detectedIndustry = Contacts.leadIndustryValue(site)
    const text = [
      services.join(' '),
      strategy.angle,
      strategy.firstMessage,
      strategy.followUp,
      opportunity.pitch,
    ]
      .join(' ')
      .toLowerCase()
    const generatedBuyerOutreachText = [strategy.firstMessage, strategy.followUp]
      .join(' ')
      .toLowerCase()
    const bannedOutreachTerms =
      /seo cleanup|local seo|website redesign|redesign candidate|conversion optimization|trust page|lead capture|short audit|would it be useful|quick follow-up/i

    const hasActionableChannel = Contacts.hasActionableOutreachChannel(site)
    const notOutreachReady = readiness.score < 50 || !hasActionableChannel
    const isNonEligible = eligibility.status !== 'eligible' || exclusion.excluded || verdict.excluded || leadScore === 0 || readiness.score === 0

    if (isNonEligible) {
      if (services.length) warnings.push('Non-eligible lead has recommended services.')
      if (strategy.firstMessage || strategy.followUp) warnings.push('Non-eligible lead has outreach copy.')
      if (leadScore !== 0) warnings.push('Excluded/manual-review lead has non-zero lead score.')
      if (opportunity.score !== 0) warnings.push('Excluded/manual-review lead has non-zero opportunity score.')
      if (eligibility.status === 'excluded' && stage !== 'excluded') warnings.push('Excluded lead stage is not Excluded.')
      if (eligibility.status === 'excluded' && priority !== 'excluded') warnings.push('Excluded lead priority is not Excluded.')
      const validManualStages = ['manual_review', 'blocked_scan', 'retry_required']
      if (eligibility.status === 'manual_review' && !validManualStages.includes(stage)) warnings.push('Manual-review lead stage is not Manual Review/Blocked/Retry.')
      if (eligibility.status === 'manual_review' && priority !== 'manual_review') warnings.push('Manual-review lead priority is not Manual Review.')
      if (bannedOutreachTerms.test(generatedBuyerOutreachText)) warnings.push('Non-eligible lead contains buyer-facing outreach language.')
    }

    if (eligibility.status === 'eligible' && notOutreachReady) {
      if (!hasActionableChannel) warnings.push('No actionable outreach channel found.')
      if (readiness.score < 50) warnings.push('Contact readiness is below review threshold.')
    }

    if (
      priority === 'high' &&
      (opportunity.score === 0 || /low opportunity/i.test(verdict.label || eligibility.label || ''))
    ) {
      warnings.push('Zero or low-opportunity lead cannot be High priority.')
    }

    if (business.id === 'platform' && eligibility.status === 'eligible' && !verdict.excluded) {
      warnings.push('Platform lead is not excluded.')
    }
    if (business.id === 'agency' && /clinic|restaurant|local-business/.test(manualIndustry)) {
      warnings.push('Manual industry conflicts with detected agency signal.')
    }
    if (manualIndustry && detectedIndustry && manualIndustry !== detectedIndustry) {
      warnings.push(`Manual industry "${Contacts.industryLabel(manualIndustry)}" differs from detected "${Contacts.industryLabel(detectedIndustry)}".`)
    }
    if (business.id === 'agency' && /website redesign|local seo/i.test(services.join(' '))) {
      warnings.push('Agency lead contains basic redesign/local SEO service.')
    }
    if (business.id === 'directory-list' && !/manual_review/.test(stage)) {
      warnings.push('Directory/list page is not routed to Manual Review.')
    }

    return {
      warnings: [...new Set(warnings)],
      suppressed: isNonEligible || notOutreachReady,
    }
  },


  shouldShowLocalAiInsight(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const verdict = Contacts.leadVerdict(site)

    return eligibility.status === 'eligible' && !verdict.excluded
  },

  uniqueTextItems(items) {
    const seen = new Set()
    const normalise = (value) => {
      let key = String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()

      key = key.replace(/^no public email(?: found)?$/, 'no public email')
      key = key.replace(/^no clickable email link(?: found)?$/, 'no clickable email link')
      key = key.replace(/^no social profile(?: found)?$/, 'no social profile')
      key = key.replace(/^no map or location embed\/link found$/, 'no map signal')
      key = key.replace(/^no opening hours signal found$/, 'no opening hours signal')
      return key
    }

    return Contacts.toArray(items)
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item) => {
        const key = normalise(item)

        if (seen.has(key)) return false
        seen.add(key)

        return true
      })
  },

  duplicateLeadWarning(site) {
    const currentRoot = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const currentUrl = Contacts.cleanUrl(site.websiteUrl || '')
    const currentEmails = new Set(Contacts.toArray(site.emails).map((row) => String(row.value || '').toLowerCase()).filter(Boolean))
    const currentSocials = new Set(Contacts.toArray(site.socials).map((row) => String(row.value || '').toLowerCase()).filter(Boolean))
    const matches = Contacts.toArray(Contacts.filteredSites).filter((other) => {
      if (other === site) return false
      const otherRoot = Contacts.rootDomain(other.host || Contacts.hostFromUrl(other.websiteUrl))
      const otherUrl = Contacts.cleanUrl(other.websiteUrl || '')
      if (currentUrl && otherUrl && currentUrl === otherUrl) return true
      if (currentRoot && otherRoot && currentRoot === otherRoot) return true
      if (Contacts.toArray(other.emails).some((row) => currentEmails.has(String(row.value || '').toLowerCase()))) return true
      if (Contacts.toArray(other.socials).some((row) => currentSocials.has(String(row.value || '').toLowerCase()))) return true

      return false
    })

    if (!matches.length) return ''

    const roots = [...new Set(matches.map((item) => Contacts.rootDomain(item.host || Contacts.hostFromUrl(item.websiteUrl))).filter(Boolean))]
    const urls = [...new Set(matches.map((item) => Contacts.cleanUrl(item.websiteUrl || '') || item.host).filter(Boolean))]
    const label = roots.length === 1 && currentRoot && roots[0] === currentRoot ? `same domain (${currentRoot})` : 'shared contact/domain'
    const sample = urls.slice(0, 3).join(', ')
    const more = matches.length > 3 ? ` +${matches.length - 3} more` : ''

    return `Duplicate candidate: ${matches.length} other scan(s) with ${label}${sample ? ` — ${sample}${more}` : ''}. Keep the best full scan and ignore timeout/challenge duplicates.`
  },

  localSeoPromptLine(site, seoAudit, expectations) {
    const pageIntent = Contacts.localAiInsight(site)?.pageIntent || ''
    const business = Contacts.businessType(site)

    if (/listing\/property detail page/i.test(pageIntent)) {
      return 'Location/listing signals: property/location signals may be present; evaluate listing SEO, structured data, map/address evidence, and social preview instead of normal local business SEO.'
    }
    return expectations.localSeo
      ? `Local SEO: address ${seoAudit.addressSignals ? 'yes' : 'no'}, map ${seoAudit.mapSignals ? 'yes' : 'no'}, hours ${seoAudit.openingHourSignals ? 'yes' : 'no'}, schema ${seoAudit.hasLocalBusinessSchema ? 'yes' : 'no'}`
      : `Local SEO: not scored for this website type (${Contacts.displayWebsiteType(site)})`
  },

  siteType(site) {
    const eligibility = Contacts.prospectEligibility(site)

    if (eligibility.entityType === 'large-platform') return 'platform'
    if (['blocked-page', 'parked-domain', 'retry-required'].includes(eligibility.entityType)) return eligibility.entityType
    if (eligibility.entityType) return eligibility.entityType
    if (Contacts.healthcareDirectoryPlatformSignal(site).matched) return 'healthcare-platform'

    if (Contacts.platformCompanySignal(site).matched) {
      return 'platform'
    }



    return Contacts.ruleSiteType(site)
  },

  ruleSiteType(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const meta = Contacts.normaliseLeadMeta(site.leadMeta)
    const industry = String(meta.industry || '').toLowerCase()
    const technologies = [...(site.technologies?.values?.() || [])]
    const techText = technologies
      .map(({ name, categories }) =>
        `${name || ''} ${Contacts.toArray(categories)
          .map((category) => category.name || category)
          .join(' ')}`
      )
      .join(' ')
      .toLowerCase()
    const text = [
      industry,
      site.host,
      site.websiteUrl,
      site.pageTitle,
      Contacts.toArray(audit.intentKeywords).join(' '),
      techText,
    ]
      .join(' ')
      .toLowerCase()

    if (/(web\s*design|development|marketing|seo|software|digital)\s+agency|\bagency\b|white-?label|software house|digital services|client portfolio|case stud(?:y|ies)/.test(text)) {
      return 'agency'
    }

    if (Contacts.productPlatformSignal(text) || /online\s+(courses?|classes?)|learning\s+(platform|resources?)|study\s+tools?|workspace|collaboration|screen\s+recorder|video\s+software|podcast\s+software|newsletter\s+growth|email\s+marketing|data\s+science|learn\s+to\s+code/.test(text)) {
      return 'saas'
    }

    if (/ecommerce|e-commerce|gift|gifts|shop|store|cart|checkout|woocommerce|shopify|magento|bigcommerce|prestashop|product|products|order|clothing|apparel|activewear|sneakers|footwear|sunglasses|eyewear|accessories|watches|mattress|socks|underwear|grooming|gear/.test(text)) {
      return 'ecommerce'
    }

    if (Contacts.healthcareDirectoryPlatformSignal(site).matched) {
      return 'healthcare-platform'
    }

    if (/portfolio|designer|developer|photographer|artist|resume|cv|personal|case stud|projects/.test(text)) {
      return 'portfolio'
    }

    if (/saas|software|platform|app|dashboard|subscription|demo|trial|pricing/.test(text)) {
      return 'saas'
    }

    if (/restaurant|clinic|medical|doctor|dentist|hospital|local-business|salon|spa|gym|repair|law|attorney|hotel|real estate/.test(text)) {
      return 'local'
    }

    if (audit.addressSignals || audit.mapSignals || audit.openingHourSignals || audit.hasLocalBusinessSchema) {
      return 'local'
    }

    return 'general'
  },

  localAiInput(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const meta = Contacts.normaliseLeadMeta(site.leadMeta)
    const technologies = [...(site.technologies?.values?.() || [])]
    const techText = technologies
      .map(({ name, version, categories }) =>
        `${name || ''} ${version || ''} ${Contacts.toArray(categories)
          .map((category) => category.name || category)
          .join(' ')}`
      )
      .join(' ')
    const oldTech = /jquery\s+[123]\.|bootstrap\s+[123]\.|angularjs|flash/i.test(
      techText
    )

    return {
      host: site.host,
      url: site.websiteUrl,
      title: site.pageTitle,
      industry: meta.industry,
      tags: Contacts.toArray(meta.tags).join(' '),
      intentKeywords: Contacts.toArray(audit.intentKeywords).join(' '),
      technologies: techText,
      emailCount: site.emails.length,
      socialCount: site.socials.length,
      technologyCount: technologies.length,
      oldTech,
      audit,
      directEmailCount: Contacts.directEmails(site).length,
    }
  },

  localAiInsight(site) {
    // Always-on local intelligence: deterministic evidence scoring remains the
    // source of truth. Model-style candidates never overwrite captured facts.
    const runtime = globalThis.LeadLensIntelligence
    if (!runtime) return null
    const classification = runtime.classifyBusiness(site)
    const quality = runtime.scanQuality(site)
    const angles = runtime.buildOutreachAngles(site, 5)
    const primary = angles[0] || null
    const urlText = `${site?.websiteUrl || ''} ${site?.pageTitle || ''}`.toLowerCase()
    const pageIntent = /\b(?:contact|about|services?|pricing|products?|blog|news|careers?|team)\b/.test(urlText)
      ? (urlText.match(/\b(contact|about|services?|pricing|products?|blog|news|careers?|team)\b/)?.[1] || 'interior page')
      : 'homepage'
    return {
      provider: 'LeadLens local intelligence',
      runtimeVersion: runtime.version,
      type: classification.id,
      businessType: classification.label,
      estimatedSize: classification.size?.label || '',
      pageIntent,
      businessSummary: `${classification.label}; estimated ${classification.size?.label || 'size not established'}. ${classification.approach}`,
      pitchAngle: primary?.title || 'Evidence-backed website review',
      recommendedService: primary?.direction || classification.approach,
      outreachAngles: angles,
      validation: {
        label: quality.complete ? 'Evidence-backed candidate' : quality.label,
        reason: primary?.reason || classification.reasons?.[0] || 'Based on available website evidence.',
        confidence: primary?.confidence || classification.confidence,
      },
      proofStrength: {
        classification: classification.confidence,
        scanQuality: quality.label,
      },
    }
  },

  normalizeLocalAiInsight(site, insight = null) {
    if (!insight) return null

    const exclusion = Contacts.leadExclusion(site)
    const type = Contacts.platformCompanySignal(site).matched
      ? 'platform'
      : Contacts.ruleSiteType(site)
    const safe = {
      ...insight,
      validation: { ...(insight.validation || {}) },
      proofStrength: { ...(insight.proofStrength || {}) },
    }
    const text = [
      site?.host,
      site?.websiteUrl,
      site?.pageTitle,
      Contacts.toArray(Contacts.normaliseSeoAudit(site?.seoAudit).intentKeywords).join(' '),
      Contacts.toArray(site?.leadMeta?.tags).join(' '),
    ]
      .join(' ')
      .toLowerCase()

    if (exclusion.excluded) {
      safe.pitchAngle = 'Exclude from outreach'
      safe.validation = {
        label: exclusion.label,
        reason: exclusion.reason,
      }
      safe.businessSummary = `Excluded lead. ${exclusion.reason}`
      return safe
    }

    if (Contacts.healthcareDirectoryPlatformSignal(site).matched) {
      safe.type = 'healthcare-platform'
      safe.summary = 'Manual review: healthcare directory/platform, not a local clinic'
      safe.pitchAngle = 'Product-page SEO / technical audit'
      safe.validation = {
        label: 'Needs Manual Review - Validate business fit before outreach',
        reason: 'Healthcare directory/platform detected without actual clinic location signals.',
      }
      safe.businessSummary = 'Manual review: healthcare directory/platform, not a local clinic'
      return safe
    }

    if (/exclude/i.test(safe.pitchAngle || '')) {
      safe.pitchAngle = 'Manual review'
      safe.validation = {
        label: 'Needs Manual Review',
        reason: 'AI suggested exclusion, but rule-based validation did not confirm an exclude signal.',
      }
    }

    if (Contacts.restaurantSignal(text)) {
      safe.type = 'restaurant'
      safe.pitchAngle = 'Local SEO, menu/order CTA, reviews, trust, and conversion cleanup'
      safe.validation = {
        label: 'Needs Manual Review',
        reason: 'Restaurant/food business detected; avoid agency partnership pitch.',
      }
    } else if (Contacts.saasEmailToolSignal(text)) {
      safe.type = 'saas'
      safe.pitchAngle = 'Technical audit, product-page SEO, conversion review, structured data, and social preview'
      safe.validation = {
        label: 'Needs Manual Review',
        reason: 'SaaS/software detected; avoid local SEO pitch unless this is a local office page.',
      }
    }

    if (type === 'agency' && !Contacts.restaurantSignal(text) && !Contacts.saasEmailToolSignal(text)) {
      safe.type = 'agency'
      safe.pitchAngle = /metadata|social/i.test(safe.pitchAngle || '')
        ? 'SEO metadata cleanup'
        : 'Partnership or technical audit'
      safe.validation = {
        label: 'Agency/Service Provider - Partnership Research Only',
        reason: 'Agency/service provider detected; avoid basic redesign pitch. Use partnership or white-label research only.',
      }
    }

    if (
      safe.pageIntent === 'listing/property detail page' &&
      !exclusion.excluded &&
      Contacts.strongPropertySignal(text)
    ) {
      safe.pitchAngle = 'Property listing SEO or marketing review'
      safe.validation = {
        label: 'Needs Manual Review',
        reason: 'Property/listing page detected with contact signals; review the right outreach angle.',
      }
    } else if (safe.pageIntent === 'listing/property detail page') {
      safe.pageIntent = 'homepage or landing page'
    }

    return safe
  },

  siteExpectations(site) {
    const type = Contacts.siteType(site)
    const expectations = {
      localSeo: type === 'local',
      openingHours: type === 'local',
      map: type === 'local',
      address: type === 'local',
      localSchema: type === 'local',
      reviews: ['local', 'ecommerce', 'saas'].includes(type),
      team: !['ecommerce'].includes(type),
      aboveFoldCta: !['portfolio'].includes(type),
      contactFormOrBooking: ['local', 'saas', 'agency', 'general'].includes(type),
      ecommerceTrust: type === 'ecommerce',
      pricing: ['saas', 'ecommerce'].includes(type),
      portfolioGallery: type === 'portfolio',
    }

    return { type, ...expectations }
  },


  hasUsableWebsiteEvidence(site) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    return Boolean(
      Contacts.toArray(audit.checks).length ||
      Number(audit.wordCount || 0) > 0 ||
      audit.score !== null ||
      site.technologies?.size ||
      site.sources?.size
    )
  },

  leadScore(site) {
    if (Contacts.prospectEligibility(site).status !== 'eligible' || Contacts.leadExclusion(site).excluded) return 0

    let score = 0
    const directEmailCount = Contacts.directEmails(site).length
    const platformEmailCount = site.emails.length - directEmailCount
    const socialCount = Contacts.toArray(site.socials).length
    const phoneCount = Contacts.phoneRows(site).length
    const country = Contacts.inferCountryCode(site)
    const industry = Contacts.leadIndustryValue(site)

    if (directEmailCount) score += 35
    else if (platformEmailCount) score += 12
    if (site.socials.some(({ platform }) => platform === 'LinkedIn')) score += 18
    else if (socialCount) score += 10
    if (phoneCount) score += 12
    if (site.technologies.size) score += Math.min(18, 8 + site.technologies.size)
    if (site.sources.size > 1) score += 8
    if (country) score += 6
    if (industry) score += 6
    if (Contacts.hasUsableWebsiteEvidence(site)) score += 8
    if (Contacts.toArray(site.leadMeta?.tags).length) score += 5

    return Math.min(score, 100)
  },

  leadQualityReasons(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      const label = eligibility.label || exclusion.label || 'Manual review required'
      const reason = eligibility.reason || exclusion.reason || 'Do not contact until verified.'
      const statusLabel = eligibility.status === 'excluded' || exclusion.excluded ? 'Excluded' : 'Manual review'

      return [
        {
          label,
          value: statusLabel,
          active: true,
        },
        {
          label: 'Reason',
          value: reason,
          active: true,
        },
        {
          label: 'Outreach action',
          value: eligibility.status === 'manual_review' ? 'Do not contact until verified' : 'Do not contact',
          active: true,
        },
      ]
    }

    const health = Contacts.websiteHealth(site)
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const expectations = Contacts.siteExpectations(site)
    const directEmailCount = Contacts.directEmails(site).length
    const technologies = [...(site.technologies?.values?.() || [])]
    const techText = technologies
      .map(({ name, version }) => `${name || ''} ${version || ''}`)
      .join(' ')
      .toLowerCase()
    const oldTech = /jquery\s+[123]\.|bootstrap\s+[123]\.|angularjs|flash/.test(
      techText
    )

    const emailKinds = site.emails.map((row) => Contacts.emailKind(row))
    const emailReasonLabel = directEmailCount
      ? 'Direct email found'
      : emailKinds.length && emailKinds.every((kind) => kind === 'personal')
      ? 'Personal email only / low confidence'
      : emailKinds.length && emailKinds.every((kind) => kind === 'platform')
      ? 'Platform email only'
      : emailKinds.length && emailKinds.every((kind) => kind === 'related-domain')
      ? 'Related-domain email found'
      : 'Email found'

    return [
      {
        label: emailReasonLabel,
        value: directEmailCount ? '+30' : site.emails.length ? '+10' : '+0',
        active: !!site.emails.length,
      },
      {
        label: 'LinkedIn found',
        value: site.socials.some(({ platform }) => platform === 'LinkedIn')
          ? '+25'
          : '+0',
        active: site.socials.some(({ platform }) => platform === 'LinkedIn'),
      },
      { label: 'Technology stack found', value: site.technologies.size ? '+25' : '+0', active: !!site.technologies.size },
      { label: 'Multiple contact sources', value: site.sources.size > 1 ? '+10' : '+0', active: site.sources.size > 1 },
      {
        label: 'Old tech opportunity',
        value: oldTech ? 'High' : 'Low',
        active: oldTech,
      },
      {
        label: 'Missing CTA redesign pitch',
        value:
          !expectations.aboveFoldCta || audit.ctaCount || audit.aboveFoldCtaCount
            ? 'No'
            : 'Yes',
        active:
          expectations.aboveFoldCta && !audit.ctaCount && !audit.aboveFoldCtaCount,
      },
      ...(expectations.localSeo
        ? [
            {
              label: 'Local SEO gap',
              value:
                audit.addressSignals && audit.mapSignals && audit.hasLocalBusinessSchema
                  ? 'Low'
                  : 'High',
              active: !(
                audit.addressSignals &&
                audit.mapSignals &&
                audit.hasLocalBusinessSchema
              ),
            },
          ]
        : []),
      {
        label: 'Trust proof gap',
        value:
          audit.reviewSignals || audit.teamSignals || audit.aboutPageLinks
            ? 'Low'
            : 'High',
        active:
          (expectations.reviews || expectations.team) &&
          !(audit.reviewSignals || audit.teamSignals || audit.aboutPageLinks),
      },
      {
        label: 'Website health gap',
        value: `${100 - health.score}/100`,
        active: health.score < 70,
      },
    ]
  },

  painPointLabels(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const verdict = Contacts.leadExclusion(site)
    const health = Contacts.websiteHealth(site)
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const expectations = Contacts.siteExpectations(site)
    const technologies = [...(site.technologies?.values?.() || [])]
    const techText = technologies
      .map(({ name, version }) => `${name || ''} ${version || ''}`)
      .join(' ')
      .toLowerCase()
    const labels = []
    const add = (id, label, active) => {
      if (active) labels.push({ id, label })
    }

    add('lead-validation', eligibility.label || verdict.label, eligibility.status !== 'eligible' || verdict.excluded)
    if (eligibility.status !== 'eligible' || verdict.excluded) return labels

    Contacts.toArray(site.leadMeta?.painLabels).forEach((label) =>
      add(`manual-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, label, true)
    )
    add('needs-redesign', 'Needs redesign', health.score < 60)
    add('weak-seo', 'Weak SEO', audit.score !== null && audit.score < 65)
    add('no-cta', 'No CTA', expectations.aboveFoldCta && !audit.ctaCount)
    add('old-tech', 'Old tech', /jquery\s+[123]\.|bootstrap\s+[123]\.|angularjs|flash/.test(techText))
    add(
      'no-trust-pages',
      'No trust pages',
      (expectations.ecommerceTrust || expectations.reviews) && !audit.trustPageLinks
    )
    add('broken-images', 'Broken images', audit.brokenImages > 0)
    add('poor-mobile', 'Poor mobile signal', !audit.viewport || audit.mobileOverflow)
    add(
      'weak-local-seo',
      'Weak local SEO',
      expectations.localSeo &&
        (!audit.addressSignals || !audit.mapSignals || !audit.hasLocalBusinessSchema)
    )
    add(
      'poor-social-preview',
      'Poor social preview',
      (audit.ogCount || 0) < 3 || (audit.twitterCount || 0) < 3
    )
    add(
      'weak-conversion',
      'Weak conversion path',
      (expectations.aboveFoldCta && !audit.aboveFoldCtaCount) ||
        (expectations.contactFormOrBooking &&
          !audit.contactForms &&
          !audit.bookingPageLinks)
    )
    add('missing-reviews', 'No review signal', expectations.reviews && !audit.reviewSignals)
    add('missing-about', 'No about/company page', expectations.team && !audit.aboutPageLinks)
    add('missing-map', 'No map signal', expectations.map && !audit.mapSignals)
    add('broken-brand', 'Broken brand/logo', audit.brokenLogoImages > 0)
    add('thin-content', 'Thin content', audit.wordCount > 0 && audit.wordCount < 250)

    return labels
  },

  topProblems(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      return [eligibility.reason || exclusion.reason || 'Manual review required before outreach.']
    }

    const health = Contacts.websiteHealth(site)

    const problems = health.signals
      .filter(({ severity }) => severity !== 'pass')
      .slice(0, 5)
      .map(({ label, detail }) => detail || label)


    return problems.slice(0, 6)
  },

  recommendedServices(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const business = Contacts.businessType(site)

    if (eligibility.status !== 'eligible' || Contacts.leadExclusion(site).excluded) return []

    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const health = Contacts.websiteHealth(site)
    const expectations = Contacts.siteExpectations(site)
    const labels = Contacts.painPointLabels(site).map(({ id }) => id)
    const services = []
    const add = (service, active) => {
      if (active && !services.includes(service)) services.push(service)
    }
    const isAgency = business.id === 'agency' || business.id === 'agency-research'
    const isSaas = business.id === 'saas' || business.id === 'platform-research' || business.id === 'marketing-platform-research'
    const isRestaurant = business.id === 'restaurant'
    const isHealthyLowOpportunity =
      health.recommendation === 'Looks healthy' && Contacts.opportunityScore(site).score < 65

    if (isRestaurant) {
      add('Local SEO', labels.includes('weak-local-seo') || audit.addressSignals || audit.mapSignals)
      add('Menu/order CTA improvement', true)
      add('Google visibility', true)
      add('Reviews and trust content', labels.includes('missing-reviews') || labels.includes('no-trust-pages'))
      add('On-page SEO cleanup', labels.includes('weak-seo') || audit.score < 75)
      add('Social preview optimization', labels.includes('poor-social-preview'))
      add('Technical cleanup', health.score < 80)

      return services.slice(0, 5)
    }

    if (isSaas) {
      add('Technical audit', true)
      add('Product-page SEO', true)
      add('Conversion optimization', labels.includes('weak-conversion') || labels.includes('no-cta') || true)
      add('Structured data review', true)
      add('Social preview optimization', labels.includes('poor-social-preview') || true)

      return services.slice(0, 5)
    }

    if (business.id === 'healthcare-platform') {
      return [
        'Product-page SEO',
        'Technical audit',
        'Conversion optimization',
        'Social preview optimization',
      ]
    }

    if (isAgency) {
      return [
        'Partnership or white-label collaboration',
        'Technical audit',
        'SEO metadata cleanup',
      ]
    }

    add(
      'Website redesign',
      !isAgency &&
        !isHealthyLowOpportunity &&
        (labels.includes('needs-redesign') || health.score < 60)
    )
    add('Local SEO', !isAgency && !isSaas && labels.includes('weak-local-seo'))
    add('On-page SEO cleanup', labels.includes('weak-seo'))
    add('Conversion optimization', labels.includes('weak-conversion') || labels.includes('no-cta'))
    add('Trust page/content upgrade', labels.includes('no-trust-pages') || labels.includes('missing-reviews'))
    add('Technical cleanup', labels.includes('old-tech') || labels.includes('broken-images') || labels.includes('poor-mobile'))
    add('Social preview optimization', labels.includes('poor-social-preview'))
    add(
      'Portfolio credibility polish',
      expectations.type === 'portfolio' &&
        (labels.includes('poor-social-preview') || labels.includes('thin-content'))
    )
    add(
      'Ecommerce trust optimization',
      (expectations.type === 'ecommerce' || business.id === 'ecommerce') &&
        (labels.includes('no-trust-pages') || labels.includes('missing-reviews'))
    )
    add(
      'Product catalog and buyer inquiry optimization',
      business.id === 'manufacturer'
    )
    add('Menu/order CTA improvement', isRestaurant)
    add('Product-page SEO', isSaas)
    add('Structured data review', isSaas)
    add(
      'Listing SEO and structured data review',
      business.id === 'marketplace-listing'
    )
    add('Lead capture setup', !site.emails.length && !audit.contactForms && !audit.phoneLinks)

    return services.slice(0, 5)
  },

  matchesPresenceFilter(site, filter) {
    if (!filter) return true

    const hasLinkedIn = site.socials.some(({ platform }) => platform === 'LinkedIn')

    return (
      (filter === 'has-email' && site.emails.length > 0) ||
      (filter === 'no-email' && site.emails.length === 0) ||
      (filter === 'has-social' && site.socials.length > 0) ||
      (filter === 'no-social' && site.socials.length === 0) ||
      (filter === 'has-linkedin' && hasLinkedIn)
    )
  },

  matchesScoreBandFilter(site, filter) {
    if (!filter) return true

    const opportunity = Contacts.opportunityScore(site).score
    const seo = site.seoAudit?.score ?? null
    const health = Contacts.websiteHealth(site).score
    const lead = Contacts.leadScore(site)

    return (
      (filter === 'opportunity-high' && opportunity >= 70) ||
      (filter === 'opportunity-low' && opportunity < 50) ||
      (filter === 'seo-low' && seo !== null && seo < 65) ||
      (filter === 'health-low' && health < 65) ||
      (filter === 'lead-high' && lead >= 70)
    )
  },

  matchesFollowUpFilter(meta, filter, today) {
    if (!filter) return true

    return (
      (filter === 'due' && meta.followUpDate && meta.followUpDate <= today) ||
      (filter === 'scheduled' && !!meta.followUpDate) ||
      (filter === 'none' && !meta.followUpDate)
    )
  },

  opportunityScore(site) {
    const leadMeta = Contacts.normaliseLeadMeta(site.leadMeta)
    const eligibility = Contacts.prospectEligibility(site)
    if (eligibility.status !== 'eligible') {
      return {
        score: 0,
        pitch: 'Score suppressed until the actual business page is verified and rescanned.',
        factors: {},
      }
    }
    const statusText = `${site?.status || ''} ${site?.pageTitle || ''}`
    if (/timeout|load-error|scan-timeout|error/i.test(statusText)) {
      return { score: 0, pitch: 'Score pending retry. The website scan did not complete with reliable page evidence.', factors: {} }
    }

    if (leadMeta.opportunityScoreOverride !== '') {
      return {
        score: Contacts.boundedScore(leadMeta.opportunityScoreOverride),
        pitch: 'Manual opportunity score set by user.',
        factors: {},
      }
    }

    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const health = Contacts.websiteHealth(site)
    const expectations = Contacts.siteExpectations(site)
    const technologies = [...(site.technologies?.values?.() || [])]

    const hasUsablePageData =
      audit.score !== null ||
      technologies.length > 0 ||
      Number(audit.wordCount || 0) > 0 ||
      Contacts.toArray(audit.checks).length > 0

    if (!hasUsablePageData) {
      return {
        score: 0,
        pitch: 'No reliable page-level signals were captured yet. Scan the website again before judging website opportunity.',
        factors: {},
      }
    }

    const techText = technologies
      .map(({ name, version }) => `${name || ''} ${version || ''}`)
      .join(' ')
      .toLowerCase()
    const oldTech = /jquery\s+[123]\.|bootstrap\s+[123]\.|angularjs|flash/.test(techText)
    const brokenSignals = health.signals.filter(({ detail = '', label = '' }) =>
      /broken|overflow|deprecated|legacy|insecure|small tap|overlay|no clear call-to-action|missing mobile|map|schema|trust|review|above-fold|contact form/i.test(
        `${label} ${detail}`
      )
    ).length
    const socialPresence = site.socials.length ? 100 : 30
    const directEmailCount = Contacts.directEmails(site).length
    const contactAvailability = directEmailCount
      ? 100
      : site.emails.length
      ? 45
      : audit.mailtoLinks || audit.phoneLinks
      ? 70
      : 20
    const redesignNeed = 100 - health.score
    const conversionWeakness = Math.min(
      100,
      (expectations.aboveFoldCta && !(audit.ctaCount || audit.aboveFoldCtaCount) ? 35 : 0) +
        (expectations.contactFormOrBooking && !audit.contactPageLinks ? 25 : 0) +
        ((expectations.reviews || expectations.ecommerceTrust) && !audit.trustPageLinks ? 20 : 0) +
        (audit.mobileOverflow ? 20 : 0) +
        (expectations.contactFormOrBooking && !(audit.contactForms || audit.bookingPageLinks) ? 15 : 0)
    )
    const localSeoWeakness = Math.min(
      100,
      expectations.localSeo
        ? (audit.addressSignals ? 0 : 25) +
            (audit.mapSignals ? 0 : 25) +
            (audit.openingHourSignals ? 0 : 20) +
            (audit.hasLocalBusinessSchema ? 0 : 30)
        : 0
    )
    const baseScore = Math.round(
      redesignNeed * 0.28 +
        contactAvailability * 0.12 +
        (oldTech ? 100 : 35) * 0.10 +
        Math.min(100, brokenSignals * 18) * 0.14 +
        socialPresence * 0.06 +
        conversionWeakness * 0.18 +
        localSeoWeakness * 0.12
    )
    const finalScore = baseScore
    const score = Contacts.boundedScore(finalScore)
    const pitch =
      score >= 75
        ? 'Strong website improvement opportunity. The site shows enough public issues to justify a focused audit pitch.'
        : score >= 55
        ? 'Good improvement opportunity. A short audit with clear website issues should work well.'
        : score >= 35
        ? 'Moderate website opportunity. Keep saved and review together with outreach readiness.'
        : 'Low website opportunity right now. The site looks healthier or there is not enough improvement pressure.'

    return {
      score,
      pitch,
      factors: {
        redesignNeed,
        contactAvailability,
        oldTechnology: oldTech ? 100 : 35,
        brokenSignals,
        socialPresence,
        conversionWeakness,
        localSeoWeakness,
      },
    }
  },

  toArray(value) {
    if (Array.isArray(value)) return value
    if (!value) return []
    if (value instanceof Set) return [...value]
    if (typeof value === 'string') return value ? [value] : []

    return []
  },

  dataSignature(rows = []) {
    return JSON.stringify(
      Contacts.toArray(rows).map((row) => ({
        id: row.id,
        type: row.type,
        value: row.value,
        websiteHost: row.websiteHost,
        pageTitle: row.pageTitle,
        status: row.status,
        leadMeta: row.leadMeta,
        seoScore: row.seoAudit?.score ?? null,
        domainAgeStatus: row.domainAge?.status || '',
        technologies: Contacts.toArray(row.technologies).map(({ name, version }) => [
          name,
          version,
        ]),
      }))
    )
  },

  normaliseLeadMeta(meta = {}) {
    return {
      ...meta,
      tags: Contacts.toArray(meta.tags),
      painLabels: Contacts.toArray(meta.painLabels),
      notes: meta.notes || '',
      stage: meta.stage || 'new',
      priority: meta.priority || 'normal',
      contacted: meta.contacted || 'no',
      industry: meta.industry || '',
      country: Contacts.normaliseCountryValue(meta.country || ''),
      stageManual: Boolean(meta.stageManual),
      priorityManual: Boolean(meta.priorityManual),
      industryManual: Boolean(meta.industryManual),
      countryManual: Boolean(meta.countryManual),
      followUpDate: meta.followUpDate || '',
      seoScoreOverride:
        meta.seoScoreOverride === '' || typeof meta.seoScoreOverride === 'undefined'
          ? ''
          : Contacts.boundedScore(meta.seoScoreOverride),
      opportunityScoreOverride:
        meta.opportunityScoreOverride === '' ||
        typeof meta.opportunityScoreOverride === 'undefined'
          ? ''
          : Contacts.boundedScore(meta.opportunityScoreOverride),
    }
  },

  leadVerdict(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)
    const opportunity = Contacts.opportunityScore(site).score
    const directEmailCount = Contacts.directEmails(site).length
    const bestChannel = Contacts.bestOutreachChannels(site)[0]
    const hasAnyChannel = bestChannel && !['Manual review', 'Do not contact', 'Do not contact until verified'].includes(bestChannel.type)

    if (eligibility.status !== 'eligible') {
      return {
        excluded: eligibility.status === 'excluded',
        label: eligibility.label,
        reason: eligibility.reason,
      }
    }

    if (exclusion.excluded) return exclusion

    if (opportunity >= 65 && directEmailCount) {
      return {
        excluded: false,
        label: 'Outreach-ready opportunity',
        reason: 'Website opportunity is strong and a direct contact path is available.',
      }
    }

    if (opportunity >= 45 && hasAnyChannel) {
      return {
        excluded: false,
        label: 'Review and contact',
        reason: 'Website opportunity is visible and at least one contact path was captured.',
      }
    }

    if (!hasAnyChannel) {
      return {
        excluded: false,
        label: 'Contact research needed',
        reason: 'Website opportunity can still be evaluated, but a stronger contact path should be found first.',
      }
    }

    return {
      excluded: false,
      label: 'Low opportunity',
      reason: 'Keep saved, but prioritize stronger website opportunities first.',
    }
  },

  scanConfidence(site) {
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const blocked = Contacts.blockedPageSignal(site)
    const parked = Contacts.parkedDomainSignal(site)
    const retry = Contacts.retryRequiredSignal(site)
    const timeoutScan = Contacts.timedOutScanSignal(site)
    let score = 0
    const reasons = []

    if (blocked.matched) return { score: 20, label: 'Low', reasons: blocked.reasons }
    if (parked.matched) return { score: 35, label: 'Low', reasons: parked.reasons }
    if (timeoutScan.matched) return { score: timeoutScan.partial ? 35 : 20, label: 'Low', reasons: timeoutScan.reasons }
    if (retry.matched) return { score: 25, label: 'Low', reasons: retry.reasons }

    if (site.pageTitle) score += 10
    else reasons.push('page title missing')
    if (audit.score !== null) score += 25
    else reasons.push('SEO snapshot missing')
    if (Contacts.directEmails(site).length) score += 20
    else if (site.emails.length) {
      score += 8
      reasons.push('no direct email found')
    } else {
      reasons.push('no email found')
    }
    if (site.socials.length) score += 12
    else reasons.push('no social profile found')
    if (site.technologies.size) score += 18
    else reasons.push('technology stack missing')
    if (domainAge.status === 'found') score += 15
    else reasons.push(`domain age ${Contacts.domainAgeStatusLabel(domainAge.status).toLowerCase()}`)

    score = Contacts.boundedScore(score)

    return {
      score,
      label: score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low',
      reasons,
    }
  },

  scanQuality(site) {
    const runtimeQuality = globalThis.LeadLensIntelligence?.scanQuality?.(site)
    const status = Contacts.siteScanStatus(site)
    const confidence = Contacts.scanConfidence(site)

    if (runtimeQuality?.id === 'blocked') return { label: 'Blocked/Challenge page', detail: 'A challenge or access block prevented a complete evidence scan.' }
    if (runtimeQuality?.id === 'failed') return { label: 'Retry required', detail: 'No reliable page evidence was captured; retry this website.' }

    const blocked = Contacts.blockedPageSignal(site)
    const invalidPage = Contacts.invalidPageSignal(site)
    const parked = Contacts.parkedDomainSignal(site)
    const retry = Contacts.retryRequiredSignal(site)
    const timeoutScan = Contacts.timedOutScanSignal(site)

    if (blocked.matched) {
      return { label: 'Blocked/Challenge page', detail: blocked.reason }
    }

    if (invalidPage.matched) {
      return { label: 'Invalid/404 page', detail: invalidPage.reason }
    }

    if (parked.matched) {
      return { label: 'Domain for sale / parked', detail: parked.reason }
    }

    if (timeoutScan.matched) {
      return { label: timeoutScan.partial ? 'Timeout / Partial scan' : 'Timeout', detail: timeoutScan.reason }
    }

    if (retry.matched) {
      return { label: 'Retry required', detail: retry.reason }
    }

    if (/timeout/i.test(status)) {
      return { label: 'Timeout', detail: 'Website load timed out; retry before scoring.' }
    }

    if (/error|failed|blocked|not found|connection/i.test(status)) {
      return { label: 'Blocked/Failed', detail: status || 'Website did not load.' }
    }

    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    if (runtimeQuality?.id === 'partial') {
      return { label: 'Partial scan', detail: 'Some contacts, technology, or page evidence was captured, but the full SEO/content snapshot is incomplete.' }
    }
    const hasPageSignals =
      site.technologies.size > 0 ||
      audit.score !== null ||
      Number(audit.wordCount || 0) > 100 ||
      Contacts.toArray(audit.checks).length > 0

    if (hasPageSignals) {
      return {
        label: 'Full scan',
        detail: site.contacts.length
          ? 'Core lead, SEO, technology, and contact signals captured.'
          : 'Core page, SEO, and technology signals captured; no public contact channel was found.',
      }
    }

    if (!site.contacts.length) {
      return { label: 'No contact found', detail: 'Website loaded but no contact data was saved.' }
    }

    if (confidence.score < 55) {
      return { label: 'Partial data', detail: 'Only limited lead signals were captured.' }
    }

    return { label: 'Full scan', detail: 'Core lead, SEO, technology, and contact signals captured.' }
  },

  normaliseTechnologyHistory(history = {}) {
    return {
      latest: Contacts.toArray(history.latest),
      changes: Contacts.toArray(history.changes),
    }
  },

  normaliseSeoAudit(audit = {}) {
    const source = audit && typeof audit === 'object' ? audit : {}
    const evidence = source.rawEvidence && typeof source.rawEvidence === 'object'
      ? source.rawEvidence
      : {}
    const firstDefined = (...values) => values.find(
      (value) => value !== null && typeof value !== 'undefined' && value !== ''
    )
    const hasSnapshot = Object.keys(source).length > 0 || Object.keys(evidence).length > 0
    const rawScore = source.score

    return {
      ...source,
      rawEvidence: evidence,
      score:
        typeof rawScore === 'undefined' || rawScore === null || rawScore === ''
          ? null
          : Contacts.boundedScore(rawScore),
      issues: Contacts.toArray(source.issues),
      issueDetails: Contacts.toArray(source.issueDetails),
      categories: source.categories || {},
      checks: Contacts.toArray(source.checks),
      domNodeCount: firstDefined(source.domNodeCount, source.domNodes, evidence.domNodeCount, evidence.domNodes),
      resources: firstDefined(source.resources, source.resourceCount, evidence.resources, evidence.resourceCount),
      emptyHeadingCount: firstDefined(source.emptyHeadingCount, source.emptyHeadings, evidence.emptyHeadingCount, evidence.emptyHeadings),
      unlabeledControls: firstDefined(source.unlabeledControls, source.inputsWithoutLabels, evidence.unlabeledControls, evidence.inputsWithoutLabels),
      hasSnapshot,
    }
  },

  boundedScore(value) {
    const number = Number(value)

    if (Number.isNaN(number)) return 0

    return Math.max(0, Math.min(100, Math.round(number)))
  },

  issueExplanation(label = '') {
    const text = String(label).toLowerCase()
    const rules = [
      [/title/, 'Why it matters: search previews and relevance depend on a clear title. How to fix: write one concise page-specific title.'],
      [/description|meta/, 'Why it matters: weak snippets reduce click quality. How to fix: add a concise benefit-focused description.'],
      [/viewport|mobile/, 'Why it matters: mobile visitors may see a broken layout. How to fix: add viewport support and test responsive widths.'],
      [/h1|heading/, 'Why it matters: headings help users and search engines understand the page. How to fix: keep one clear main H1 and logical sections.'],
      [/canonical/, 'Why it matters: duplicate URL signals can split page value. How to fix: add a canonical URL for the preferred page.'],
      [/image|alt/, 'Why it matters: missing alt text hurts accessibility and image context. How to fix: add useful alt text to meaningful images.'],
      [/schema|structured|local business/, 'Why it matters: schema helps machines understand the business. How to fix: add valid structured data for the entity type.'],
      [/address|map|opening/, 'Why it matters: local businesses need location trust signals. How to fix: add visible address, map, and hours only when relevant.'],
      [/cta|contact|form|booking/, 'Why it matters: visitors need a clear next step. How to fix: add visible CTA, contact form, booking, or phone path.'],
    ]

    return rules.find(([pattern]) => pattern.test(text))?.[1] || 'Why it matters: this is a directional signal. How to fix: verify manually before using it in a pitch.'
  },

  emailKind(row = {}) {
    if (row.type && row.type !== 'email') return ''

    const rawEmailDomain = Contacts.normaliseHost(
      row.emailDomain || String(row.value || '').split('@')[1] || ''
    )
    const rawSiteHost = Contacts.normaliseHost(
      row.websiteHost || Contacts.hostFromUrl(row.websiteUrl)
    )
    const emailDomain = Contacts.rootDomain(rawEmailDomain)
    const siteDomain = Contacts.rootDomain(rawSiteHost)
    const personalDomains = new Set([
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'icloud.com',
      'proton.me',
      'protonmail.com',
      'aol.com',
    ])

    if (!emailDomain || !siteDomain) return row.emailKind || 'direct'
    if (personalDomains.has(emailDomain)) return 'personal'
    if (emailDomain === siteDomain) return 'direct'
    if (Contacts.relatedEmailDomain(emailDomain, siteDomain)) return 'related-domain'

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
          Contacts.levenshtein(emailToken, siteToken) <= 2
      )
    )
  },

  levenshtein(a = '', b = '') {
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index)

    for (let i = 1; i <= a.length; i += 1) {
      let last = i - 1

      previous[0] = i
      for (let j = 1; j <= b.length; j += 1) {
        const old = previous[j]
        previous[j] =
          a[i - 1] === b[j - 1]
            ? last
            : Math.min(last + 1, previous[j] + 1, previous[j - 1] + 1)
        last = old
      }
    }

    return previous[b.length]
  },

  emailRoleIntent(row = {}) {
    const local = String(row.value || '').split('@')[0].toLowerCase()
    const avoid = new Set([
      'abuse', 'billing', 'career', 'careers', 'compliance', 'donorinfo', 'donations',
      'ethics', 'hr', 'humanresources', 'jobs', 'legal', 'media', 'noreply', 'no-reply',
      'peopleandculture', 'press', 'privacy', 'recruiting', 'recruitment', 'security',
      'sponsorship', 'sponsorshipinquiries',
    ])
    const manualReview = /(?:estimating|vendor|supplier|subcontractor|communications?|marketing|accounts?|payable|receivable)/i
    const supportOnly = new Set(['help', 'helpdesk', 'service', 'support'])
    const friendly = new Set(['contact', 'hello', 'hi', 'info', 'office', 'sales', 'team', 'newbiz', 'newbusiness', 'inquiries', 'enquiries', 'partnerships'])
    const explicitDecision = /(?:founder|owner|ceo|director|manager|partner)/i.test(local)
    const namedPerson = /^[a-z]+[._-][a-z]+$/.test(local)

    if (avoid.has(local) || /^no[-_.]?reply/.test(local)) return { label: 'avoid', weight: -100 }
    if (manualReview.test(local)) return { label: 'manual-review', weight: -25 }
    if (friendly.has(local)) return { label: 'outreach-friendly', weight: 40 }
    if (supportOnly.has(local)) return { label: 'support-only', weight: -5 }
    if (explicitDecision) return { label: 'decision-maker-likely', weight: 30 }
    if (namedPerson) return { label: 'named-person-review', weight: 12 }
    return { label: 'manual-review', weight: -10 }
  },

  emailOutreachScore(row = {}) {
    const confidence = Contacts.emailConfidence(row)
    const role = Contacts.emailRoleIntent(row)
    const kind = Contacts.emailKind(row)
    const kindWeight = {
      direct: 45,
      'related-domain': 30,
      personal: 15,
      platform: -20,
    }[kind] ?? 0

    return confidence.score + role.weight + kindWeight
  },

  bestOutreachEmail(site = {}) {
    const best = Contacts.toArray(site.emails)
      .filter((row) => !['avoid', 'manual-review'].includes(Contacts.emailRoleIntent(row).label) && Contacts.emailConfidence(row).label !== 'Invalid')
      .sort((a, b) => Contacts.emailOutreachScore(b) - Contacts.emailOutreachScore(a))[0]

    if (best && Contacts.emailKind(best) === 'platform' && Contacts.toArray(site.socials).length) {
      return null
    }

    return best
  },

  emailConfidence(row = {}) {
    if (row.type && row.type !== 'email') {
      return { label: 'Not email', score: 0, reasons: ['Not an email contact'] }
    }

    const email = String(row.value || '').trim().toLowerCase()
    const emailDomain = Contacts.normaliseHost(
      row.emailDomain || email.split('@')[1] || ''
    )
    const siteHost = Contacts.normaliseHost(
      row.websiteHost || Contacts.hostFromUrl(row.websiteUrl)
    )
    const siteDomain = Contacts.rootDomain(siteHost)
    const rootEmailDomain = Contacts.rootDomain(emailDomain)
    const localPart = email.split('@')[0] || ''
    const sources = Contacts.toArray(row.sources).join(' ').toLowerCase()
    const kind = Contacts.emailKind(row)
    const invalidLocal = /^(?:u003e|sample|test|example|email|yourname|name|noreply|no-reply)$/i.test(localPart) || /^\d{3,}[-_.]?\d{2,}/.test(localPart) || /^u003e/i.test(localPart)
    const invalidDomain = /(?:spambreak\.com|\.if$|commeet$|\.invalid$)/i.test(emailDomain) || /^(?:you|example|test|localhost)\.(?:com|org|net|test|local)$/i.test(emailDomain)
    const rolePrefixes = new Set([
      'admin',
      'contact',
      'hello',
      'hi',
      'info',
      'office',
      'sales',
      'support',
      'team',
    ])
    const disposableDomains = new Set([
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'tempmail.com',
      'temp-mail.org',
      'yopmail.com',
    ])
    let score = 0
    const reasons = []
    const add = (points, reason) => {
      score += points
      reasons.push(reason)
    }

    if (invalidLocal || invalidDomain) {
      return { label: 'Invalid', score: 0, reasons: ['placeholder or malformed email pattern'] }
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      add(25, 'valid email format')
    } else {
      return {
        label: 'Invalid',
        score: 0,
        reasons: ['invalid email format'],
      }
    }

    if (rootEmailDomain) add(10, 'email domain present')
    if (kind === 'direct') add(30, 'email domain matches website')
    if (kind === 'related-domain') add(15, 'related-domain email match')
    if (kind === 'platform') add(-15, 'platform/provider email, not direct owner')
    if (kind === 'personal') add(-5, 'personal mailbox provider')
    if (/visible|mailto|footer|schema/.test(sources)) add(15, 'found in visible page source')
    if (rolePrefixes.has(localPart)) add(5, 'role-based business mailbox')
    if (Contacts.emailRoleIntent(row).label === 'support-only') add(-25, 'support-only mailbox, not ideal for cold outreach')
    if (Contacts.emailRoleIntent(row).label === 'manual-review') add(-35, 'mailbox purpose needs manual review before outreach')
    if (Contacts.emailRoleIntent(row).label === 'avoid') add(-60, 'avoid for outreach role mailbox')
    if (disposableDomains.has(rootEmailDomain)) add(-45, 'disposable email domain risk')
    if (siteDomain && rootEmailDomain && rootEmailDomain !== siteDomain && kind !== 'personal') {
      add(-10, 'email domain differs from scanned website')
    }

    score = Math.max(0, Math.min(100, score))

    return {
      label:
        score >= 75
          ? 'High'
          : score >= 50
          ? 'Medium'
          : score >= 25
          ? 'Low'
          : 'Risky',
      score,
      reasons,
    }
  },

  blockedPageSignal(site = {}) {
    const title = String(site.pageTitle || '')
    const url = String(site.websiteUrl || '')
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const keywords = Contacts.toArray(audit.intentKeywords).join(' ')
    const summaryText = `${site.host || ''} ${url} ${title} ${keywords} ${raw.title || ''} ${raw.description || ''}`
    const previewText = Number(audit.wordCount || 0) < 600 ? ` ${raw.pageTextPreview || ''}` : ''
    const text = `${summaryText}${previewText}`.toLowerCase()
    const patterns = [
      [/\baccess\s+to\s+this\s+page\s+has\s+been\s+denied\b|\baccess\s+denied\b|\bdenied\s+access\b/i, 'access denied page'],
      [/\b403\s+forbidden\b|\bforbidden\b/i, '403/forbidden page'],
      [/\b401\s+unauthori[sz]ed\b/i, '401 unauthorized page'],
      [/\b429\s+too\s+many\s+requests\b/i, 'rate-limit page'],
      [/\berror\s+1009\b|cloudflare\s+(?:to\s+)?restrict\s+access|used\s+cloudflare\s+to\s+restrict\s+access/i, 'Cloudflare restriction page'],
      [/\battention\s+required\b.*\bcloudflare\b|\bcloudflare\b.*\bblocked\b/i, 'Cloudflare block page'],
      [/\b(?:just|one)\s+(?:a\s+)?moment(?:,\s*please)?\b|__cf_chl_rt_tk|cf_chl_|cloudflare\s+turnstile/i, 'Cloudflare challenge page'],
      [/\bnot\s+acceptable\b|\brequest\s+blocked\b|\btemporarily\s+blocked\b|\brequest\s+rejected\b/i, 'request blocked page'],
      [/\b(robot\s+challenge|captcha|bot\s+protection|might\s+be\s+a\s+robot|verify\s+you\s+are\s+human|checking\s+your\s+browser|verify\s+that\s+you\s+are\s+not\s+a\s+robot)\b/i, 'captcha/robot challenge page'],
      [/\bperimeterx\b|\bpx-captcha\b|\bincapsula\b|\bsucuri\s+website\s+firewall\b|\bakamai\b.*\breference\b/i, 'security challenge page'],
    ]
    const reasons = patterns.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason)

    return {
      matched: reasons.length > 0,
      reason: reasons[0] || '',
      reasons,
    }
  },

  parkedDomainSignal(site = {}) {
    const title = String(site.pageTitle || '')
    const url = String(site.websiteUrl || '')
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const keywords = Contacts.toArray(audit.intentKeywords).join(' ')
    const text = `${site.host || ''} ${url} ${title} ${keywords}`.toLowerCase()
    const patterns = [
      [/\bis\s+(?:now\s+)?for\s+sale\b|\bthis\s+domain\s+is\s+for\s+sale\b/i, 'domain is for sale'],
      [/\bbuy\s+(?:this\s+)?domain\b|\bbuy-domain\b/i, 'buy-domain page'],
      [/\bdomain\s+(?:parking|parked)\b|\bparked\s+domain\b/i, 'parked domain page'],
      [/\b(?:sedo|afternic|dan\.com|hugedomains|domainmarket|topdomains|dovendi|sav\.com)\b/i, 'domain marketplace/parking provider'],
      [/redirected=true/i, 'domain-sale redirect parameter'],
    ]
    const reasons = patterns.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason)

    return {
      matched: reasons.length > 0,
      reason: reasons[0] || '',
      reasons,
    }
  },

  invalidPageSignal(site = {}) {
    const title = String(site.pageTitle || '')
    const url = String(site.websiteUrl || '')
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const keywords = Contacts.toArray(audit.intentKeywords).join(' ')
    const text = `${site.host || ''} ${url} ${title} ${keywords}`.toLowerCase()
    const patterns = [
      [/\b404\b.*\b(page\s+not\s+found|not\s+found)\b|\bpage\s+not\s+found\b|\bnot\s+found\b.*\b404\b/i, '404 / page not found'],
      [/\bpage\s+(?:has\s+)?(?:moved|doesn\'?t\s+exist|no\s+longer\s+exists)\b/i, 'page no longer exists'],
      [/\bthis\s+page\s+is\s+unavailable\b|\bcontent\s+not\s+available\b/i, 'page unavailable'],
    ]
    const reasons = patterns.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason)

    return {
      matched: reasons.length > 0,
      reason: reasons[0] || '',
      reasons,
    }
  },

  retryRequiredSignal(site = {}) {
    const status = Contacts.siteScanStatus(site)
    const hasNoContacts = !Contacts.toArray(site.emails).length && !Contacts.toArray(site.socials).length
    const hasNoTech = !site.technologies || !site.technologies.size
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const noUsefulSeo = audit.score === null || audit.score === 0 || audit.wordCount === 0
    const timeoutLike = /timeout|error|failed|unavailable|connection|not found/i.test(status)
    const scanLooksEmpty = hasNoContacts && hasNoTech && noUsefulSeo
    const matched = timeoutLike && scanLooksEmpty
    const reason = matched
      ? 'Website did not return usable lead data; retry scan or verify manually before outreach.'
      : ''

    return {
      matched,
      reason,
      reasons: matched ? [reason] : [],
    }
  },

  timedOutScanSignal(site = {}) {
    const status = Contacts.siteScanStatus(site)
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const timedOut = /timeout/i.test(status)
    const hasReliablePageData =
      Contacts.toArray(site.emails).length > 0 ||
      Contacts.toArray(site.socials).length > 0 ||
      site.technologies?.size > 0 ||
      (audit.score !== null && Number(audit.wordCount || 0) > 100 && Contacts.toArray(audit.checks).length > 0)

    if (!timedOut) {
      return { matched: false, reason: '', reasons: [] }
    }

    const reason = hasReliablePageData
      ? 'Website timed out after partial data was captured; retry before scoring or outreach.'
      : 'Website load timed out before usable lead data was captured; retry before scoring or outreach.'

    return {
      matched: true,
      partial: hasReliablePageData,
      reason,
      reasons: [reason],
    }
  },

  foodMarketplaceSignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const knownMarketplaces = [
      'ubereats.com',
      'just-eat.co.uk',
      'justeat.com',
      'mealzo.co.uk',
      'foodhub.com',
      'deliveroo.co.uk',
      'doordash.com',
      'grubhub.com',
      'postmates.com',
      'zomato.com',
      'swiggy.com',
    ]
    const exact = knownMarketplaces.find((domain) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))

    // Strict: generic ecommerce wording like "free delivery" must not turn brands into food marketplaces.
    const hasFoodContext = /\b(restaurants?|takeaway|food\s+delivery|order\s+food|order\s+takeaway|groceries\s+and\s+food|menu\s+items?)\b/i.test(text)
    const hasMarketplaceContext = /\b(marketplace|platform|partners?|restaurants?\s+near|all\s+orders|lowest\s+commission|delivery\s+app|restaurants?\s+and\s+restaurant\s+bookings|diners|book\s+restaurants?)\b/i.test(text)
    const localEvidence = Contacts.localBusinessEvidence(site).score
    const matched = Boolean(exact) || (hasFoodContext && hasMarketplaceContext && localEvidence < 55)

    return {
      matched,
      name: exact || 'Food delivery marketplace',
      reasons: matched
        ? [exact ? `known food delivery marketplace: ${exact}` : 'food delivery marketplace/platform language']
        : [],
    }
  },

  marketplaceDirectorySignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const knownDirectories = [
      ['yelp.com', 'Yelp local business directory'],
      ['tripadvisor.com', 'Tripadvisor travel/restaurant directory'],
      ['opentable.com', 'OpenTable restaurant booking marketplace'],
      ['g2.com', 'G2 software review marketplace'],
      ['capterra.com', 'Capterra software directory'],
      ['trustpilot.com', 'Trustpilot review platform'],
      ['producthunt.com', 'Product Hunt product directory'],
      ['checkatrade.com', 'Checkatrade tradesperson marketplace'],
      ['mybuilder.com', 'MyBuilder tradesperson marketplace'],
      ['ratedpeople.com', 'Rated People tradesperson marketplace'],
      ['thumbtack.com', 'Thumbtack local service marketplace'],
      ['bark.com', 'Bark local service marketplace'],
      ['booking.com', 'Booking travel marketplace'],
      ['airbnb.com', 'Airbnb marketplace'],
      ['yellowpages.com', 'Yellow Pages directory'],
      ['ticketmaster.com', 'Ticketmaster ticket marketplace'],
    ]
    const exact = knownDirectories.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const directoryText = /\b(directory|marketplace|reviews?\s+platform|compare\s+(?:software|services)|find\s+a\s+(?:tradesperson|professional|restaurant|service)|book\s+restaurants?|buy\s+verified\s+tickets|tickets?\s+for\s+concerts|over\s+a\s+billion\s+reviews)\b/i.test(text)
    const hasContactOwnerEvidence = Contacts.directEmails(site).length > 0 || Contacts.localBusinessEvidence(site).score >= 70
    const matched = Boolean(exact) || (directoryText && !hasContactOwnerEvidence)

    return {
      matched,
      name: exact ? exact[1] : 'Directory / marketplace platform',
      reasons: matched ? [exact ? `known directory/marketplace domain: ${exact[0]}` : 'directory/marketplace platform language'] : [],
    }
  },

  countrySelectorSignal(site = {}) {
    const title = String(site.pageTitle || '')
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const keywords = Contacts.toArray(audit.intentKeywords).join(' ')
    const text = `${site.host || ''} ${site.websiteUrl || ''} ${title} ${keywords}`.toLowerCase()
    const matched = /\b(select|choose|choisir)\s+(?:your\s+)?country\b|international:\s*select\s+your\s+country/i.test(text)

    return {
      matched,
      reason: 'Country/language selector page detected; this is not a normal business homepage scan.',
      reasons: matched ? ['country/language selector page'] : [],
    }
  },

  softwareAgencyOutreachConflictSignal(site = {}) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const text = [
      Contacts.prospectText(site),
      raw.title,
      raw.description,
      raw.pageTextPreview,
      Contacts.toArray(audit.intentKeywords).join(' '),
    ].filter(Boolean).join(' ').toLowerCase()
    const reasons = []
    const patterns = [
      [/\bweb(?:site)?\s+(?:design|development)\s+(?:agency|company|services?)\b/, 'website design/development provider language'],
      [/\b(?:custom\s+)?software\s+(?:development|engineering)\s+(?:company|agency|services?)\b/, 'software development provider language'],
      [/\b(?:digital|creative|marketing|seo|ppc)\s+agency\b/, 'agency service language'],
      [/\b(?:mobile|web)\s+app\s+development\b/, 'app development service language'],
      [/\b(?:hire|dedicated)\s+(?:developers?|designers?|development\s+team)\b/, 'outsourced development team language'],
      [/\b(?:ui\/?ux|branding|product\s+design|digital\s+transformation)\s+(?:agency|services?)\b/, 'digital design consultancy language'],
      [/\b(?:our\s+work|case\s+studies|client\s+success|portfolio)\b/, 'agency portfolio language'],
      [/\b(?:saas|software|platform|dashboard|book\s+a\s+demo|request\s+a\s+demo|start\s+free|free\s+trial|pricing)\b/, 'software product language'],
    ]
    patterns.forEach(([pattern, reason]) => { if (pattern.test(text)) reasons.push(reason) })
    const knownAgency = Contacts.agencyConsultancySignal(site)
    const marketingPlatform = Contacts.marketingPlatformSignal(site)
    if (knownAgency.matched) reasons.push(...knownAgency.reasons)
    if (marketingPlatform.matched) reasons.push(...marketingPlatform.reasons)
    const unique = [...new Set(reasons)]
    return {
      matched: Boolean(knownAgency.matched || marketingPlatform.matched || unique.length >= 2),
      reasons: unique,
    }
  },


  enterprisePublicCompanySignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const text = [Contacts.prospectText(site), raw.title, raw.description, raw.pageTextPreview].filter(Boolean).join(' ').toLowerCase()
    const known = [
      ['nvidia.com', 'NVIDIA'], ['dell.com', 'Dell'], ['servicenow.com', 'ServiceNow'], ['zoom.us', 'Zoom'],
      ['oracle.com', 'Oracle'], ['sap.com', 'SAP'], ['adobe.com', 'Adobe'], ['cisco.com', 'Cisco'], ['ibm.com', 'IBM'],
      ['intuit.com', 'Intuit'], ['quickbooks.intuit.com', 'QuickBooks'], ['xero.com', 'Xero'], ['sage.com', 'Sage'],
      ['freshbooks.com', 'FreshBooks'], ['waveapps.com', 'Wave'], ['avalara.com', 'Avalara'], ['pilot.com', 'Pilot'],
      ['bench.co', 'Bench'], ['bookkeeper360.com', 'Bookkeeper360'], ['taxfyle.com', 'Taxfyle'],
    ]
    const exact = known.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const enterpriseLanguage = /\b(publicly\s+traded|investor\s+relations|annual\s+report|fortune\s+500|enterprise\s+(?:software|platform|solutions)|global\s+(?:leader|company|brand)|customers\s+worldwide|request\s+a\s+demo|book\s+a\s+demo|free\s+trial|pricing\s+plans|platform\s+for\s+teams|cloud\s+platform|ai\s+platform)\b/i.test(text)
    const jobBoardLanguage = /\b(job\s+board|careers?\s+platform|recruiting\s+software|applicant\s+tracking|ats|post\s+a\s+job|find\s+jobs|hiring\s+platform)\b/i.test(text)
    const directoryLanguage = /\b(compare\s+software|software\s+reviews|business\s+directory|find\s+a\s+(?:contractor|pro|professional)|marketplace\s+for)\b/i.test(text)
    const matched = Boolean(exact || enterpriseLanguage || jobBoardLanguage || directoryLanguage)
    return {
      matched,
      name: exact ? exact[1] : jobBoardLanguage ? 'Job board / recruiting platform' : directoryLanguage ? 'Directory / marketplace platform' : enterpriseLanguage ? 'Enterprise / SaaS company' : '',
      reasons: matched ? [exact ? `known enterprise/software domain: ${exact[0]}` : jobBoardLanguage ? 'job-board/recruiting platform language' : directoryLanguage ? 'directory/marketplace platform language' : 'enterprise/SaaS/public-company language'] : [],
    }
  },

  largeInstitutionNonprofitSignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const raw = audit.rawEvidence || {}
    const text = [Contacts.prospectText(site), raw.title, raw.description, raw.pageTextPreview]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const known = [
      ['utoronto.ca', 'University of Toronto'], ['yorku.ca', 'York University'], ['ubc.ca', 'University of British Columbia'],
      ['mcgill.ca', 'McGill University'], ['uwaterloo.ca', 'University of Waterloo'], ['queensu.ca', "Queen's University"],
      ['humber.ca', 'Humber Polytechnic'], ['georgebrown.ca', 'George Brown Polytechnic'], ['senecapolytechnic.ca', 'Seneca Polytechnic'],
      ['nipissingu.ca', 'Nipissing University'], ['redcross.ca', 'Canadian Red Cross'], ['unicef.ca', 'UNICEF Canada'],
      ['cancer.ca', 'Canadian Cancer Society'], ['diabetes.ca', 'Diabetes Canada'], ['heartandstroke.ca', 'Heart & Stroke'],
      ['foodbankscanada.ca', 'Food Banks Canada'], ['habitat.ca', 'Habitat for Humanity Canada'], ['sickkidsfoundation.com', 'SickKids Foundation'],
    ]
    const exact = known.find(([domain]) => host === Contacts.rootDomain(domain) || fullHost === domain || fullHost.endsWith(`.${domain}`))
    const university = /\b(university|polytechnic|public\s+college|college\s+of\s+applied\s+arts)\b/i.test(text)
    const nationalNonprofit = /\b(national\s+(?:charity|foundation|nonprofit)|children['’]?s\s+charity|canadian\s+red\s+cross|unicef\s+canada|food\s+banks?\s+canada|habitat\s+for\s+humanity\s+canada|heart\s+(?:and|&)\s+stroke|diabetes\s+canada|cancer\s+society)\b/i.test(text)
    const matched = Boolean(exact) || university || nationalNonprofit
    return {
      matched,
      name: exact ? exact[1] : university ? 'Large education institution' : nationalNonprofit ? 'Large nonprofit organization' : '',
      kind: university ? 'education' : 'nonprofit',
      reasons: matched ? [exact ? `known institution/nonprofit domain: ${exact[0]}` : university ? 'large education institution language' : 'large nonprofit/charity language'] : [],
    }
  },
  prospectEligibility(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const url = String(site.websiteUrl || '')
    const title = String(site.pageTitle || '')
    const text = Contacts.prospectText(site)
    const pageIntent = Contacts.pageIntentSignal(site)
    const platformSignal = Contacts.platformCompanySignal(site)
    const directEmailCount = Contacts.directEmails(site).length
    const result = (status, entityType, label, reason, reasons = []) => ({
      status,
      entityType,
      label,
      reason,
      reasons: reasons.length ? reasons : [reason],
      excluded: status === 'excluded',
    })

    if (/^(localhost|127\.0\.0\.1)$/i.test(site.host || '') || host === 'qrinux.com') {
      return result(
        'excluded',
        'internal-test',
        'Internal/Test Domain',
        'Localhost, product owner, or internal testing domain.'
      )
    }

    const blocked = Contacts.blockedPageSignal(site)
    if (blocked.matched) {
      return result(
        'manual_review',
        'blocked-page',
        'Blocked/Challenge Page - Retry Required',
        'The scan captured a blocked, challenge, or error page instead of the actual website. Retry manually before scoring or outreach.',
        blocked.reasons
      )
    }

    const invalidPage = Contacts.invalidPageSignal(site)
    if (invalidPage.matched) {
      return result(
        'manual_review',
        'invalid-page',
        'Invalid/404 Page - Retry Required',
        'The scanned URL appears to be a 404, unavailable, or invalid page. Verify the homepage URL before scoring or outreach.',
        invalidPage.reasons
      )
    }

    const parked = Contacts.parkedDomainSignal(site)
    if (parked.matched) {
      return result(
        'excluded',
        'parked-domain',
        'Domain For Sale / Parked Domain',
        'Domain parking or for-sale page detected; do not use as a normal website redesign lead.',
        parked.reasons
      )
    }

    const timeoutScan = Contacts.timedOutScanSignal(site)
    if (timeoutScan.matched) {
      return result(
        'manual_review',
        'timeout-retry',
        timeoutScan.partial ? 'Timeout / Partial Scan - Retry Before Scoring' : 'Timeout - Retry Required',
        timeoutScan.reason,
        timeoutScan.reasons
      )
    }

    const retry = Contacts.retryRequiredSignal(site)
    if (retry.matched) {
      return result(
        'manual_review',
        'retry-required',
        'Retry Required - Incomplete Scan',
        retry.reason,
        retry.reasons
      )
    }

    if (pageIntent.type === 'document') {
      return result(
        'excluded',
        'document',
        'Document/File - Not Website Lead',
        pageIntent.reason,
        pageIntent.reasons
      )
    }

    if (pageIntent.type === 'search-results') {
      return result(
        'excluded',
        'search-results',
        'Search Results Page',
        pageIntent.reason,
        pageIntent.reasons
      )
    }

    const countrySelector = Contacts.countrySelectorSignal(site)
    if (countrySelector.matched) {
      return result(
        'manual_review',
        'country-selector',
        'Country Selector / Gateway Page - Manual Review',
        countrySelector.reason,
        countrySelector.reasons
      )
    }

    if (platformSignal.matched) {
      return result(
        'excluded',
        'large-platform',
        'Platform Company - Not Outreach Lead',
        `${platformSignal.name} is a large platform/product company, not a normal redesign lead.`,
        platformSignal.reasons || [`known platform: ${platformSignal.name}`]
      )
    }

    const runtimeNonSmb = globalThis.LeadLensIntelligence?.nonSmbResearchSignal?.(site)
    if (runtimeNonSmb?.matched) {
      return result(
        'manual_review',
        'research-only-non-smb',
        'Research-only / Non-SMB Record',
        'This scan appears to be a platform, publisher, institution, government, SaaS, agency, or large organization. Suppress generic SMB SEO/redesign outreach until a human verifies fit.',
        runtimeNonSmb.reasons || []
      )
    }

    const directoryMarketplace = Contacts.marketplaceDirectorySignal(site)
    if (directoryMarketplace.matched) {
      return result(
        'manual_review',
        'directory-marketplace',
        'Directory / Marketplace Platform - Manual Review',
        'Directory, marketplace, review, booking, or listing platform detected; do not treat it as a normal local business lead.',
        directoryMarketplace.reasons
      )
    }

    const foodMarketplace = Contacts.foodMarketplaceSignal(site)
    if (foodMarketplace.matched) {
      return result(
        'manual_review',
        'large-platform',
        'Food Delivery Marketplace / Platform - Manual Review',
        'Food delivery marketplace/platform detected; do not treat it as a local restaurant lead without manual verification.',
        foodMarketplace.reasons
      )
    }

    if (pageIntent.type === 'protected-app') {
      return result(
        'excluded',
        'protected-app',
        'Protected/App Page',
        pageIntent.reason,
        pageIntent.reasons
      )
    }

    if (pageIntent.type === 'staging-preview') {
      return result(
        'excluded',
        'staging-preview',
        'Preview/Staging Site',
        pageIntent.reason,
        pageIntent.reasons
      )
    }

    if (Contacts.governmentSignal(site).matched) {
      return result(
        'excluded',
        'government',
        'Government/Public-Sector Site',
        Contacts.governmentSignal(site).reason,
        Contacts.governmentSignal(site).reasons
      )
    }



    const enterprisePublicCompany = Contacts.enterprisePublicCompanySignal(site)
    if (enterprisePublicCompany.matched) {
      return result(
        'manual_review',
        'enterprise-research',
        'Enterprise / Platform - Research Only',
        `${enterprisePublicCompany.name || 'Enterprise or platform company'} detected; do not treat it as a normal SMB/local-business outreach lead.`,
        [...enterprisePublicCompany.reasons, 'Suppress basic redesign/local SEO outreach']
      )
    }

    const institutionNonprofit = Contacts.largeInstitutionNonprofitSignal(site)
    if (institutionNonprofit.matched) {
      return result(
        'manual_review',
        'institution-nonprofit-research',
        'Institution / Nonprofit - Research Only',
        `${institutionNonprofit.name || 'Large institution/nonprofit'} detected; keep for research, but do not treat it as a normal SMB redesign prospect without manual qualification.`,
        [...institutionNonprofit.reasons, 'Suppress basic redesign/local SEO outreach']
      )
    }


    const serviceProviderConflict = Contacts.softwareAgencyOutreachConflictSignal(site)
    if (serviceProviderConflict.matched) {
      return result(
        'manual_review',
        'agency-software-provider',
        'Agency / Software Provider - Research Only',
        'This website appears to sell web, SEO, digital, agency, or software services. Do not pitch basic website redesign or SEO services without manual qualification.',
        [...serviceProviderConflict.reasons, 'Suppress basic redesign/local SEO outreach']
      )
    }

    const largeEcommerceBrand = Contacts.largeEcommerceBrandSignal(site)
    const chainMarketplace = Contacts.chainMarketplaceSignal(site)


    if (chainMarketplace.matched) {
      return result(
        'manual_review',
        'chain-marketplace-research',
        'Large Chain / Marketplace - Research Only',
        `${chainMarketplace.name || 'Large chain/marketplace'} detected; do not treat it as a normal SMB redesign lead. Use research-only review.`,
        [...chainMarketplace.reasons, 'Do not pitch basic website redesign/SEO']
      )
    }


    if (largeEcommerceBrand.matched) {
      return result(
        'manual_review',
        'large-ecommerce-research',
        'Large Ecommerce / DTC Brand - Research Only',
        `${largeEcommerceBrand.name || 'Large ecommerce/DTC brand'} detected; do not treat it as a normal SMB redesign lead without manual qualification.`,
        [...largeEcommerceBrand.reasons, 'Website improvement score stays 0 until verified as target SMB']
      )
    }





    if (pageIntent.type === 'directory-list') {
      return result(
        'manual_review',
        'directory-list',
        'Directory/List Page - Manual Review',
        pageIntent.reason,
        pageIntent.reasons
      )
    }


    if (/\b(?:dghs|dashboard|management information system)\b/i.test(`${url} ${title}`)) {
      return result(
        'excluded',
        'government',
        'Government/Public Dashboard',
        'Government or public dashboard context detected; do not create a commercial SEO/redesign pitch.'
      )
    }

    return result(
      'eligible',
      'smb-prospect',
      'Eligible prospect',
      'Business page appears eligible for lead scoring. Review contact readiness and website opportunity before outreach.'
    )
  },

  prospectText(site = {}) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const meta = Contacts.normaliseLeadMeta(site.leadMeta)
    const technologies = [...(site.technologies?.values?.() || [])]

    return [
      site.host,
      site.websiteUrl,
      site.pageTitle,
      meta.industry,
      Contacts.toArray(meta.tags).join(' '),
      Contacts.toArray(audit.intentKeywords).join(' '),
      Contacts.toArray(audit.schemaTypes).join(' '),
      technologies
        .map(({ name, categories }) =>
          `${name || ''} ${Contacts.toArray(categories)
            .map((category) => category.name || category)
            .join(' ')}`
        )
        .join(' '),
    ]
      .join(' ')
      .toLowerCase()
  },

  pageIntentSignal(site = {}) {
    const url = String(site.websiteUrl || '')
    const title = String(site.pageTitle || '')
    const host = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(url))
    const text = `${host} ${url} ${title}`.toLowerCase()
    const reasons = []
    const result = (type, reason) => ({ type, reason, reasons: [reason, ...reasons] })

    if (/\.(pdf|docx?|xlsx?|pptx?|csv|zip|rar|7z|png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(url)) {
      return result('document', 'File/document URL detected; this is not a website redesign lead.')
    }

    if (/\/(login|signin|sign-in|dashboard|admin|account|accounts|project|projects|app)(\/|$|\?)/i.test(url) || /\b(login|sign in|dashboard|admin|project|account)\b/i.test(title)) {
      return result('protected-app', 'Protected, login, dashboard, admin, account, or app page detected.')
    }

    if (
      /[?&](q|query|search)=/i.test(url) ||
      /\/search(?:\/|$|\?)/i.test(url) ||
      /\b(search results|results for|duckduckgo search)\b/i.test(title)
    ) {
      return result('search-results', 'Search-results page detected; do not treat discovered emails as the searched business.')
    }

    if (/^(?:www\.)?(facebook|instagram|linkedin|x|twitter|youtube|tiktok|pinterest)\.com$/i.test(host) || /(?:^|\.)(wa\.me|whatsapp\.com)$/i.test(host)) {
      return result('third-party-social', 'Social or messaging page detected; mark as social page only, not an owned website audit.')
    }

    if (/^(?:www\.)?(maps\.google\.com|google\.com)$/i.test(host) && /\/(maps|search|local|travel)\b/i.test(url)) {
      return result('third-party-directory', 'Google Maps/Search/Local page detected; mark as third-party page, not an owned website audit.')
    }

    if (
      /(?:^|\.)lovable\.app$|(?:^|\.)vercel\.app$|(?:^|\.)netlify\.app$|(?:^|\.)webflow\.io$/i.test(host) ||
      /\b(preview|staging|sandbox|test site|demo build|prototype)\b/i.test(text)
    ) {
      return result('staging-preview', 'Preview, staging, demo, or prototype site detected; verify the final business domain instead.')
    }

    if (
      /\/(best|top|directory|directories|list|lists|listing|listings|near-me|providers?|companies|agencies|clinics|hospitals|restaurants)(\/|$|\?|-|_)/i.test(url) ||
      /\b(directory of|list of|top\s+\d*|best\s+\d*|near me|compare)\b.*\b(agencies|companies|clinics|hospitals|restaurants|providers|services|software)\b/i.test(title)
    ) {
      return result('directory-list', 'Directory/list page detected; do not classify the page as one of the listed businesses.')
    }

    return { type: 'normal', reason: '', reasons: [] }
  },

  governmentSignal(site = {}) {
    const host = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const text = Contacts.prospectText(site)
    const reasons = []
    const governmentDomain = /(^|\.)gov(?:\.[a-z]{2})?$|(^|\.)gov\.[a-z.]+$|(^|\.)mil(?:\.[a-z]{2})?$/i.test(host)
    const strongTerms = [
      /\bofficial government portal\b/i,
      /\bpublic[- ]sector dashboard\b/i,
      /\bministry of\b/i,
      /\bdirectorate general\b/i,
      /\bgovernment dashboard\b/i,
      /\bpublic service portal\b/i,
    ].filter((pattern) => pattern.test(text))

    if (governmentDomain) reasons.push('government domain')
    if (strongTerms.length >= 2) reasons.push('multiple strong government/public-sector portal signals')

    return {
      matched: governmentDomain || strongTerms.length >= 2,
      reason: 'Government or public-sector context detected; do not create a commercial SEO/redesign pitch.',
      reasons,
    }
  },

  organizationScaleSignal(site = {}) {
    const text = Contacts.prospectText(site)
    const host = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const reasons = []
    const add = (points, reason, active) => {
      if (active) reasons.push(`${reason} (+${points})`)
      return active ? points : 0
    }
    const score =
      add(20, 'developer/docs/API platform language', /\b(api|developers?|documentation|docs|sdk|webhooks?|status page|changelog)\b/i.test(text)) +
      add(20, 'enterprise/product platform language', /\b(enterprise|platform|marketplace|cloud|infrastructure|ecosystem|integrations?|partners? program)\b/i.test(text)) +
      add(15, 'corporate trust/legal pages', /\b(security|trust center|compliance|legal|privacy|terms|investors?|careers?)\b/i.test(text)) +
      add(15, 'global scale language', /\b(millions?|billions?|global|worldwide|fortune 500|trusted by|customers worldwide)\b/i.test(text)) +
      add(15, 'product-led SaaS navigation', /\b(pricing|plans|sign up|start free|book a demo|request demo|login)\b/i.test(text)) +
      add(10, 'non-business utility or app host', /\b(app|cloud|platform|dashboard|console|portal)\b/i.test(host))

    return {
      score: Math.min(100, score),
      reasons,
    }
  },

  localBusinessEvidence(site = {}) {
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const text = Contacts.prospectText(site)
    const reasons = []
    const add = (points, reason, active) => {
      if (active) reasons.push(`${reason} (+${points})`)
      return active ? points : 0
    }
    const score =
      add(20, 'address signal', audit.addressSignals) +
      add(20, 'map/location signal', audit.mapSignals) +
      add(15, 'opening-hours signal', audit.openingHourSignals) +
      add(20, 'local business schema', audit.hasLocalBusinessSchema) +
      add(15, 'direct email on scanned domain', Contacts.directEmails(site).length > 0) +
      add(10, 'local/service industry wording', /\b(restaurant|clinic|doctor|dentist|salon|repair|law firm|attorney|hotel|agency|service area|near me)\b/i.test(text))

    return {
      score: Math.min(100, score),
      reasons,
    }
  },

  leadExclusion(site = {}) {
    const eligibility = Contacts.prospectEligibility(site)

    if (eligibility.status === 'excluded') {
      return {
        excluded: true,
        label: eligibility.label,
        reason: eligibility.reason,
      }
    }

    return {
      excluded: false,
      label: 'Needs Manual Review',
      reason: 'Validate the business fit before outreach.',
    }
  },

  directEmails(site = {}) {
    return Contacts.toArray(site.emails).filter((row) => {
      if (Contacts.emailKind(row) !== 'direct') return false
      const confidence = Contacts.emailConfidence(row)
      const role = Contacts.emailRoleIntent(row)
      if (['Invalid', 'Risky'].includes(confidence.label)) return false
      if (confidence.score < 50) return false
      if (['avoid', 'manual-review', 'support-only'].includes(role.label)) return false
      return true
    })
  },

  platformCompanySignal(site = {}) {
    const host = Contacts.rootDomain(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const fullHost = Contacts.normaliseHost(site.host || Contacts.hostFromUrl(site.websiteUrl))
    const url = String(site.websiteUrl || '')
    const title = String(site.pageTitle || '')
    const text = `${fullHost} ${title} ${url}`.toLowerCase()
    const googleHostedDomain =
      /(?:^|\.)google\.com$|(?:^|\.)withgoogle\.com$|(?:^|\.)google\.dev$|(?:^|\.)googleapis\.com$|(?:^|\.)googleusercontent\.com$|(?:^|\.)firebaseapp\.com$|(?:^|\.)appspot\.com$/i.test(fullHost)
    const googleProductContext =
      googleHostedDomain &&
      (/(google|firebase|android|chrome|workspace|cloud|developers?|codelab|experiment|demo|product|console|api|docs|maps|analytics|ads|search|gemini|material|web\.dev)/i.test(text) ||
        fullHost !== 'google.com')

    if (googleProductContext) {
      return {
        matched: true,
        name: 'Google',
        reasons: ['Google product, demo, developer tool, hosted product page, or Google-owned subdomain'],
      }
    }

    const platforms = [
      ...LEADLENS_ENTERPRISE_SKIP_DOMAINS,
      ['github.com', 'GitHub'],
      ['gitlab.com', 'GitLab'],
      ['bitbucket.org', 'Bitbucket'],
      ['chatgpt.com', 'ChatGPT'],
      ['openai.com', 'OpenAI'],
      ['google.com', 'Google'],
      ['withgoogle.com', 'Google'],
      ['google.dev', 'Google'],
      ['googleapis.com', 'Google APIs'],
      ['googleusercontent.com', 'Google hosted content'],
      ['firebase.google.com', 'Firebase'],
      ['firebaseapp.com', 'Firebase'],
      ['appspot.com', 'Google App Engine'],
      ['cloud.google.com', 'Google Cloud'],
      ['youtube.com', 'YouTube'],
      ['facebook.com', 'Facebook'],
      ['meta.com', 'Meta'],
      ['instagram.com', 'Instagram'],
      ['pinterest.com', 'Pinterest'],
      ['linkedin.com', 'LinkedIn'],
      ['x.com', 'X'],
      ['twitter.com', 'Twitter'],
      ['tiktok.com', 'TikTok'],
      ['reddit.com', 'Reddit'],
      ['medium.com', 'Medium'],
      ['microsoft.com', 'Microsoft'],
      ['azure.microsoft.com', 'Microsoft Azure'],
      ['apple.com', 'Apple'],
      ['amazon.com', 'Amazon'],
      ['aws.amazon.com', 'AWS'],
      ['cloudflare.com', 'Cloudflare'],
      ['vercel.com', 'Vercel'],
      ['netlify.com', 'Netlify'],
      ['heroku.com', 'Heroku'],
      ['shopify.com', 'Shopify'],
      ['wix.com', 'Wix'],
      ['squarespace.com', 'Squarespace'],
      ['webflow.com', 'Webflow'],
      ['wordpress.com', 'WordPress.com'],
      ['stripe.com', 'Stripe'],
      ['paypal.com', 'PayPal'],
      ['salesforce.com', 'Salesforce'],
      ['hubspot.com', 'HubSpot'],
      ['circle.so', 'Circle'], ['mightynetworks.com', 'Mighty Networks'], ['kajabi.com', 'Kajabi'], ['thinkific.com', 'Thinkific'], ['podia.com', 'Podia'],
      ['braze.com', 'Braze'], ['pendo.io', 'Pendo'], ['gorgias.com', 'Gorgias'], ['customer.io', 'Customer.io'], ['mailgun.com', 'Mailgun'], ['postmarkapp.com', 'Postmark'],
      ['twilio.com', 'Twilio'], ['sendgrid.com', 'SendGrid'], ['posthog.com', 'PostHog'], ['heap.io', 'Heap'], ['contentsquare.com', 'Contentsquare'], ['smartlook.com', 'Smartlook'],
      ['bigcommerce.com', 'BigCommerce'], ['ecwid.com', 'Ecwid'], ['shift4shop.com', 'Shift4Shop'], ['volusion.com', 'Volusion'],
      ['siteminder.com', 'SiteMinder'], ['littlehotelier.com', 'Little Hotelier'], ['roomraccoon.com', 'RoomRaccoon'], ['cloudbeds.com', 'Cloudbeds'],
      ['hostfully.com', 'Hostfully'], ['guesty.com', 'Guesty'], ['hostaway.com', 'Hostaway'], ['lodgify.com', 'Lodgify'], ['mews.com', 'Mews'], ['hotelogix.com', 'Hotelogix'],
      ['rentmanager.com', 'Rent Manager'], ['tenantcloud.com', 'TenantCloud'], ['yardibreeze.com', 'Yardi Breeze'], ['propertyware.com', 'Propertyware'],
      ['doorloop.com', 'DoorLoop'], ['appfolio.com', 'AppFolio'], ['buildium.com', 'Buildium'], ['rentecdirect.com', 'Rentec Direct'],
      ['servicefusion.com', 'Service Fusion'], ['getservicebox.com', 'ServiceBox'], ['housecallpro.com', 'Housecall Pro'], ['servicetitan.com', 'ServiceTitan'], ['jobber.com', 'Jobber'], ['fieldpulse.com', 'FieldPulse'], ['workiz.com', 'Workiz'],
      ['livechat.com', 'LiveChat'],
      ['tawk.to', 'Tawk.to'],
      ['hotjar.com', 'Hotjar'],
      ['salesloft.com', 'Salesloft'],
      ['drift.com', 'Drift'],
      ['hostgator.com', 'HostGator'],
      ['bluehost.com', 'Bluehost'],
      ['ionos.com', 'IONOS'],
      ['hostinger.com', 'Hostinger'],
      ['godaddy.com', 'GoDaddy'],
      ['domain.com', 'Domain.com'],
      ['siteground.com', 'SiteGround'],
      ['wpengine.com', 'WP Engine'],
      ['kinsta.com', 'Kinsta'],
      ['elementor.com', 'Elementor'],
      ['rankmath.com', 'Rank Math'],
      ['woocommerce.com', 'WooCommerce'],
      ['wordpress.org', 'WordPress.org'],
      ['wpbeginner.com', 'WPBeginner'],
      ['duckduckgo.com', 'DuckDuckGo'],
      ['bestbuy.com', 'Best Buy'],
      ['walmart.com', 'Walmart'],
      ['costco.com', 'Costco'],
      ['target.com', 'Target'],
      ['whatsapp.com', 'WhatsApp'],
      ['web.whatsapp.com', 'WhatsApp'],
      ['slack.com', 'Slack'],
      ['notion.so', 'Notion'],
      ['figma.com', 'Figma'],
      ['canva.com', 'Canva'],
      ['zoom.us', 'Zoom'],
      ['atlassian.com', 'Atlassian'],
      ['dropbox.com', 'Dropbox'],
      ['adobe.com', 'Adobe'],
      ['linear.app', 'Linear'], ['height.app', 'Height'], ['kit.com', 'Kit / ConvertKit'], ['convertkit.com', 'ConvertKit'], ['beehiiv.com', 'beehiiv'],
      ['loom.com', 'Loom'], ['descript.com', 'Descript'], ['riverside.com', 'Riverside'], ['coda.io', 'Coda'], ['mural.co', 'Mural'], ['miro.com', 'Miro'],
      ['duolingo.com', 'Duolingo'], ['datacamp.com', 'DataCamp'], ['quizlet.com', 'Quizlet'], ['masterclass.com', 'MasterClass'], ['codecademy.com', 'Codecademy'],
      ['udemy.com', 'Udemy'], ['coursera.org', 'Coursera'], ['brilliant.org', 'Brilliant'], ['skillshare.com', 'Skillshare'],
      ['uber.com', 'Uber'], ['komoot.com', 'Komoot'], ['alltrails.com', 'AllTrails'], ['strava.com', 'Strava'], ['whoop.com', 'WHOOP'],
      ['tonal.com', 'Tonal'], ['echelonfit.com', 'Echelon'], ['onepeloton.com', 'Peloton'], ['betterhelp.com', 'BetterHelp'], ['talkspace.com', 'Talkspace'],
      ['headspace.com', 'Headspace'], ['calm.com', 'Calm'], ['myfitnesspal.com', 'MyFitnessPal'], ['noom.com', 'Noom'],
    ]
    const exactFull = platforms.find(
      ([domain]) => fullHost === domain || fullHost.endsWith(`.${domain}`)
    )
    const exact = exactFull || platforms.find(([domain]) => host === Contacts.rootDomain(domain))

    if (exact) {
      return {
        matched: true,
        name: exact[1],
        reasons: [`known platform domain: ${exact[0]}`],
      }
    }

    const brandMatch = [
      ['firebase', 'Firebase'],
      ['github', 'GitHub'],
      ['meta', 'Meta'],
      ['pinterest', 'Pinterest'],
      ['gitlab', 'GitLab'],
      ['cloudflare', 'Cloudflare'],
      ['vercel', 'Vercel'],
      ['netlify', 'Netlify'],
      ['shopify', 'Shopify'],
      ['salesforce', 'Salesforce'],
      ['hubspot', 'HubSpot'],
      ['livechat', 'LiveChat'],
      ['hotjar', 'Hotjar'],
      ['circle', 'Circle'], ['mighty networks', 'Mighty Networks'], ['kajabi', 'Kajabi'], ['thinkific', 'Thinkific'], ['podia', 'Podia'],
      ['braze', 'Braze'], ['pendo', 'Pendo'], ['gorgias', 'Gorgias'], ['customer.io', 'Customer.io'], ['mailgun', 'Mailgun'], ['postmark', 'Postmark'],
      ['twilio', 'Twilio'], ['sendgrid', 'SendGrid'], ['posthog', 'PostHog'], ['heap', 'Heap'], ['contentsquare', 'Contentsquare'], ['smartlook', 'Smartlook'],
      ['bigcommerce', 'BigCommerce'], ['ecwid', 'Ecwid'], ['shift4shop', 'Shift4Shop'], ['volusion', 'Volusion'],
      ['siteminder', 'SiteMinder'], ['little hotelier', 'Little Hotelier'], ['roomraccoon', 'RoomRaccoon'], ['cloudbeds', 'Cloudbeds'],
      ['hostfully', 'Hostfully'], ['guesty', 'Guesty'], ['hostaway', 'Hostaway'], ['lodgify', 'Lodgify'], ['mews', 'Mews'], ['hotelogix', 'Hotelogix'],
      ['rent manager', 'Rent Manager'], ['tenantcloud', 'TenantCloud'], ['yardi breeze', 'Yardi Breeze'], ['propertyware', 'Propertyware'],
      ['doorloop', 'DoorLoop'], ['appfolio', 'AppFolio'], ['buildium', 'Buildium'], ['rentec direct', 'Rentec Direct'],
      ['service fusion', 'Service Fusion'], ['servicebox', 'ServiceBox'], ['housecall pro', 'Housecall Pro'], ['servicetitan', 'ServiceTitan'], ['jobber', 'Jobber'], ['fieldpulse', 'FieldPulse'], ['workiz', 'Workiz'],
      ['owner.com', 'Owner.com'], ['owner', 'Owner.com'], ['spoton', 'SpotOn'], ['lightspeed', 'Lightspeed'], ['jolt', 'Jolt'], ['touchbistro', 'TouchBistro'], ['toast', 'Toast'], ['toasttab', 'Toast'], ['restaurant365', 'Restaurant365'], ['maintainx', 'MaintainX'], ['upkeep', 'UpKeep'], ['fmx', 'FMX'], ['gofmx', 'FMX'], ['fiix', 'Fiix'], ['limble', 'Limble'], ['flowpath', 'FlowPath'], ['facilitybot', 'FacilityBot'],
      ['salesloft', 'Salesloft'],
      ['drift', 'Drift'],
      ['hostgator', 'HostGator'],
      ['bluehost', 'Bluehost'],
      ['ionos', 'IONOS'],
      ['hostinger', 'Hostinger'],
      ['godaddy', 'GoDaddy'],
      ['siteground', 'SiteGround'],
      ['wpengine', 'WP Engine'],
      ['kinsta', 'Kinsta'],
      ['elementor', 'Elementor'],
      ['rankmath', 'Rank Math'],
      ['woocommerce', 'WooCommerce'],
      ['wpbeginner', 'WPBeginner'],
      ['stripe', 'Stripe'],
      ['duckduckgo', 'DuckDuckGo'],
      ['whatsapp', 'WhatsApp'],
      ['atlassian', 'Atlassian'],
      ['dropbox', 'Dropbox'],
      ['figma', 'Figma'],
      ['canva', 'Canva'],
      ['slack', 'Slack'],
      ['linear', 'Linear'], ['height', 'Height'], ['convertkit', 'ConvertKit'], ['beehiiv', 'beehiiv'],
      ['loom', 'Loom'], ['descript', 'Descript'], ['riverside', 'Riverside'], ['coda', 'Coda'], ['mural', 'Mural'], ['miro', 'Miro'],
      ['duolingo', 'Duolingo'], ['datacamp', 'DataCamp'], ['quizlet', 'Quizlet'], ['masterclass', 'MasterClass'], ['codecademy', 'Codecademy'],
      ['udemy', 'Udemy'], ['coursera', 'Coursera'], ['komoot', 'Komoot'], ['alltrails', 'AllTrails'], ['strava', 'Strava'], ['whoop', 'WHOOP'],
      ['uber', 'Uber'], ['tonal', 'Tonal'], ['echelon', 'Echelon'], ['peloton', 'Peloton'],
      ['headspace', 'Headspace'], ['calm', 'Calm'], ['myfitnesspal', 'MyFitnessPal'], ['noom', 'Noom'],
      ['nike', 'Nike'],
      ['adidas', 'Adidas'],
      ['zara', 'Zara'],
      ['uniqlo', 'UNIQLO'],
      ['lululemon', 'Lululemon'],
      ['patagonia', 'Patagonia'],
      ['ebay', 'eBay'],
      ['warby', 'Warby Parker'],
      ['north face', 'The North Face'],
    ].find(([brand]) => new RegExp(`(^|[\\s.-])${brand}([\\s.-]|$)`, 'i').test(text))

    return brandMatch
      ? {
          matched: true,
          name: brandMatch[1],
          reasons: [`known platform brand: ${brandMatch[1]}`],
        }
      : { matched: false, name: '' }
  },

  normaliseDomainAge(domainAge = {}) {
    if (!domainAge || typeof domainAge !== 'object') {
      return {
        status: 'unknown',
        age: null,
        checkedAt: '',
        registeredAt: '',
        updatedAt: '',
        expiresAt: '',
        registrar: '',
        rootDomain: '',
        message: 'Domain age lookup is pending.',
        rdapStatus: [],
      }
    }

    return {
      ...domainAge,
      status: domainAge.status || 'unknown',
      age: domainAge.age || null,
      checkedAt: domainAge.checkedAt || '',
      registeredAt: domainAge.registeredAt || '',
      updatedAt: domainAge.updatedAt || '',
      expiresAt: domainAge.expiresAt || '',
      registrar: domainAge.registrar || '',
      rootDomain: domainAge.rootDomain || '',
      message: domainAge.message || '',
      rdapStatus: Contacts.toArray(domainAge.rdapStatus),
    }
  },

  domainAgeSummary(domainAge = {}) {
    const value = Contacts.normaliseDomainAge(domainAge)

    if (value.status === 'unknown') return ''
    if (!value.age || value.status !== 'found') return 'Unavailable'

    const years = Number(value.age.years || 0)
    const months = Number(value.age.months || 0)

    if (years <= 0 && months <= 0) return 'New domain'
    if (years <= 0) return `${months}m`
    if (months <= 0) return `${years}y`

    return `${years}y ${months}m`
  },

  domainAgeShortLabel(domainAge = {}) {
    const value = Contacts.normaliseDomainAge(domainAge)

    if (value.status === 'unknown') return ''
    if (value.status === 'found') return `Age ${Contacts.domainAgeSummary(value)}`
    if (value.status === 'not-found') return 'Age not found'

    return 'Age unavailable'
  },

  domainAgeStatusLabel(status = '') {
    const labels = {
      found: 'Registration date found',
      'invalid-domain': 'Invalid domain',
      'lookup-failed': 'Lookup failed',
      'lookup-timeout': 'Lookup timed out',
      'no-registration-date': 'Registration date hidden',
      'not-found': 'Domain not found',
      unknown: 'Pending lookup',
    }

    return labels[status] || 'Domain age unavailable'
  },

  domainAgeGrade(domainAge = {}) {
    const value = Contacts.normaliseDomainAge(domainAge)

    if (value.status === 'found') return 'good'
    if (value.status === 'unknown') return 'pending'
    if (value.status === 'not-found' || value.status === 'invalid-domain') return 'bad'

    return 'warn'
  },

  domainAgeFallbackMessage(domainAge = {}, site = {}) {
    const value = Contacts.normaliseDomainAge(domainAge)

    if (value.status === 'unknown') {
      return 'LeadLens will use cached public RDAP data when it becomes available.'
    }

    if (value.status === 'not-found') {
      return /error|timeout/i.test(Contacts.siteScanStatus(site))
        ? 'The website did not load and public RDAP lookup could not verify the domain.'
        : 'Public RDAP lookup could not verify this domain.'
    }

    if (value.status === 'no-registration-date') {
      return 'The domain exists in public RDAP data, but the registry did not expose a registration date.'
    }

    return 'Domain age could not be confirmed from public RDAP data.'
  },

  websiteHealth(site) {
    const eligibility = Contacts.prospectEligibility(site)
    const exclusion = Contacts.leadExclusion(site)

    if (eligibility.status !== 'eligible' || exclusion.excluded) {
      const label = eligibility.label || exclusion.label
      const reason = eligibility.reason || exclusion.reason
      return {
        score: 0,
        recommendation: eligibility.status === 'excluded' || exclusion.excluded ? 'Excluded lead' : 'Manual review required',
        categories: [],
        signals: [
          {
            severity: eligibility.status === 'excluded' || exclusion.excluded ? 'suggestion' : 'warning',
            label,
            detail: reason,
          },
        ],
      }
    }
    const audit = Contacts.normaliseSeoAudit(site.seoAudit)
    const domainAge = Contacts.normaliseDomainAge(site.domainAge)
    const expectations = Contacts.siteExpectations(site)
    const technologies = [...(site.technologies?.values?.() || [])]
    const techNames = technologies.map(({ name }) => name.toLowerCase())
    const oldTech = technologies.filter(({ name, version }) => {
      const lower = `${name || ''} ${version || ''}`.toLowerCase()

      return (
        /jquery\s+[123]\./.test(lower) ||
        /bootstrap\s+[123]\./.test(lower) ||
        /angularjs/.test(lower) ||
        /flash/.test(lower)
      )
    })
    const signals = []
    const addSignal = (severity, label, detail) => {
      signals.push({ severity, label, detail })
    }
    const seoScore = audit.score === null ? 50 : audit.score
    const technicalIssues = [
      !audit.viewport && audit.mobileOverflow && 'Missing mobile viewport with visible overflow',
      audit.mobileOverflow && 'Page content appears wider than the viewport',
      audit.oversizedElements > 0 && `${audit.oversizedElements} elements overflow viewport width`,
      audit.loadTime > 5000 && `Slow browser load signal: ${audit.loadTime}ms`,
      audit.scriptCount > 80 && `${audit.scriptCount} scripts on page`,
      audit.stylesheetCount > 45 && `${audit.stylesheetCount} stylesheets/style blocks`,
      audit.resources > 250 && `${audit.resources} loaded resources`,
      audit.brokenImages > 0 && `${audit.brokenImages} broken images detected`,
      audit.brokenLogoImages > 0 && `${audit.brokenLogoImages} broken logo/brand images`,
      audit.mixedContentResources > 0 &&
        `${audit.mixedContentResources} insecure mixed-content resources`,
      audit.insecureForms > 0 && `${audit.insecureForms} insecure form actions`,
      audit.deprecatedNodeCount > 0 &&
        `${audit.deprecatedNodeCount} deprecated HTML elements`,
      audit.tableLayoutCount > 0 && `${audit.tableLayoutCount} legacy layout tables`,
      audit.inlineStyleCount > 80 && `${audit.inlineStyleCount} inline styles`,
      audit.domNodeCount > 1800 && `${audit.domNodeCount} DOM elements on page`,
      audit.iframeCount > 6 && `${audit.iframeCount} embedded iframes`,
      audit.unlabeledControls > 0 &&
        `${audit.unlabeledControls} form fields without labels`,
    ].filter(Boolean)
    const uxIssues = [
      audit.smallTapTargets > 10 && `${audit.smallTapTargets} small tap targets`,
      audit.intrusiveFixedElements > 2 &&
        `${audit.intrusiveFixedElements} large fixed overlays/bars`,
      audit.formCount > 0 &&
        audit.formsWithoutSubmit === audit.formCount &&
        'Forms found but no clear submit button',
      audit.emptyHeadingCount > 0 && `${audit.emptyHeadingCount} empty headings`,
      audit.headingCount < 2 && 'Weak page section structure',
      audit.missingModernHints && 'Few modern responsive implementation hints',
    ].filter(Boolean)
    const contentIssues = [
      audit.wordCount && audit.wordCount < 250 && `${audit.wordCount} words only`,
      !site.emails.length && 'No public email found',
      !audit.mailtoLinks && 'No clickable email link found',
      expectations.localSeo && !audit.phoneLinks && 'No clickable phone link found',
      expectations.aboveFoldCta && !audit.ctaCount && 'No clear call-to-action detected',
      expectations.aboveFoldCta &&
        !audit.aboveFoldCtaCount &&
        'No above-fold call-to-action detected',
      expectations.contactFormOrBooking &&
        !audit.contactPageLinks &&
        'No obvious contact/service/booking page link',
      expectations.contactFormOrBooking &&
        !audit.contactForms &&
        !audit.bookingPageLinks &&
        'No obvious form, booking, or order path',
      !site.socials.length && 'No social profile found',
      audit.images && audit.imagesWithAlt / audit.images < 0.8 && 'Weak image alt coverage',
    ].filter(Boolean)
    const trustIssues = [
      audit.protocol === 'http:' && 'Website is not using HTTPS',
      expectations.team && !audit.aboutPageLinks && 'No visible about/company page',
      (expectations.ecommerceTrust || expectations.reviews) &&
        !audit.trustPageLinks &&
        'No visible privacy/terms/testimonial/portfolio trust links',
      expectations.reviews && !audit.reviewSignals && 'No visible reviews/testimonials signal',
      expectations.team && !audit.teamSignals && 'No visible team/owner/staff credibility signal',
      expectations.ecommerceTrust &&
        !audit.termsLinks &&
        'No visible terms/refund/shipping policy signal',
      expectations.pricing && !audit.pricingPageLinks && 'No visible pricing/product price path',
      expectations.portfolioGallery &&
        !audit.galleryPageLinks &&
        'No visible portfolio/gallery/project proof',
      audit.unsafeExternalLinks > 0 &&
        `${audit.unsafeExternalLinks} external tabs missing noopener`,
      !audit.favicon && 'Missing favicon/brand icon',
    ].filter(Boolean)
    const localSeoIssues = expectations.localSeo
      ? [
          !audit.hasLocalBusinessSchema && 'No local business/organization schema',
          !audit.addressSignals && 'No address signal found',
          !audit.mapSignals && 'No map or location embed/link found',
          !audit.openingHourSignals && 'No opening hours signal found',
          !audit.phoneLinks && 'No clickable phone link for local visitors',
        ].filter(Boolean)
      : []
    const freshnessIssues = [
      oldTech.length && `Outdated technology hints: ${oldTech.map(({ name }) => name).join(', ')}`,
      !audit.navigationCount && 'No semantic navigation landmark',
      !audit.footerPresent && 'No semantic footer/contentinfo area',
      !audit.schemaTypes?.length && 'No structured schema types',
      audit.ogCount < 3 && 'Incomplete social preview metadata',
      audit.twitterCount < 3 && 'Incomplete Twitter/X preview metadata',
      !audit.viewport && 'Viewport metadata could not be confirmed; verify responsive behavior manually',
      !audit.intentKeywords?.length && 'Weak detectable search intent',
      audit.shortTitle && 'Title is too short',
      audit.longTitle && 'Title is too long',
      audit.shortDescription && 'Meta description is too short',
      audit.longDescription && 'Meta description is too long',
      techNames.some((name) => /wordpress|joomla|drupal/.test(name)) &&
        !techNames.some((name) => /cdn|cache|security|firewall/.test(name)) &&
        'CMS detected without clear CDN/cache/security signals',
    ].filter(Boolean)
    const technicalScore = Math.max(0, 100 - technicalIssues.length * 14)
    const uxScore = Math.max(0, 100 - uxIssues.length * 16)
    const contentScore = Math.max(0, 100 - contentIssues.length * 18)
    const trustScore = Math.max(0, 100 - trustIssues.length * 18)
    const localSeoScore = Math.max(0, 100 - localSeoIssues.length * 18)
    const freshnessScore = Math.max(0, 100 - freshnessIssues.length * 18)
    const directEmailCount = Contacts.directEmails(site).length
    const contactScore = Math.min(
      100,
      (directEmailCount ? 45 : site.emails.length ? 15 : 0) +
        (site.socials.length ? 35 : 0) +
        (site.technologies?.size ? 20 : 0)
    )
    const domainMaturityScore =
      domainAge.status === 'found'
        ? domainAge.age?.totalMonths >= 24
          ? 100
          : domainAge.age?.totalMonths >= 6
          ? 70
          : 45
        : domainAge.status === 'unknown'
        ? 60
        : 40
    const score = Math.round(
      seoScore * 0.22 +
        technicalScore * 0.15 +
        uxScore * 0.12 +
        contentScore * 0.12 +
        trustScore * 0.1 +
        localSeoScore * 0.12 +
        freshnessScore * 0.07 +
        domainMaturityScore * 0.03 +
        contactScore * 0.07
    )

    if (seoScore < 60) addSignal('critical', 'Low SEO foundation', `SEO score is ${seoScore}`)
    technicalIssues.forEach((detail) => addSignal('critical', 'Technical redesign signal', detail))
    uxIssues.forEach((detail) => addSignal('warning', 'UX redesign signal', detail))
    contentIssues.forEach((detail) => addSignal('warning', 'Content/contact weakness', detail))
    trustIssues.forEach((detail) => addSignal('warning', 'Trust and security gap', detail))
    localSeoIssues.forEach((detail) => addSignal('suggestion', 'Local SEO opportunity', detail))
    freshnessIssues.forEach((detail) => addSignal('suggestion', 'Modernization opportunity', detail))
    if (domainAge.status === 'found' && domainAge.age?.totalMonths < 12) {
      addSignal(
        'suggestion',
        'Newer domain signal',
        `Domain age is ${Contacts.domainAgeSummary(domainAge)}`
      )
    }
    if (domainAge.status && !['unknown', 'found'].includes(domainAge.status)) {
      addSignal(
        'suggestion',
        'Domain age unavailable',
        Contacts.domainAgeStatusLabel(domainAge.status)
      )
    }


    if (!signals.length) {
      addSignal('pass', 'No major redesign signal', 'Core website signals look healthy')
    }

    return {
      score: Math.min(100, score),
      recommendation:
        score >= 80
          ? 'Looks healthy'
          : score >= 60
          ? 'Needs improvement'
          : score >= 40
          ? 'Needs major work'
          : 'Redesign candidate',
      categories: [
        { label: 'SEO foundation', score: seoScore },
        { label: 'Technical basics', score: technicalScore },
        { label: 'UX readiness', score: uxScore },
        { label: 'Content/contact', score: contentScore },
        { label: 'Trust/security', score: trustScore },
        { label: 'Local SEO', score: localSeoScore },
        { label: 'Modernization', score: freshnessScore },
        { label: 'Domain maturity', score: domainMaturityScore },
        { label: 'Lead readiness', score: contactScore },
      ],
      signals: signals.slice(0, 24),
    }
  },

  healthGrade(score) {
    if (score >= 80) return 'good'
    if (score >= 60) return 'warn'
    return 'bad'
  },

  formatSeoScore(score) {
    return score === null || typeof score === 'undefined' || Number.isNaN(score)
      ? '-'
      : `${score}`
  },

  seoGrade(score) {
    if (score === null || typeof score === 'undefined' || Number.isNaN(score)) {
      return 'unknown'
    }

    if (score >= 80) return 'good'
    if (score >= 60) return 'warn'

    return 'bad'
  },

  formatDate(iso) {
    if (!iso) return '-'

    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      return iso
    }
  },

  cssToken(value) {
    return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'
  },

  safeFilename(value) {
    return String(value || 'leadlens')
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'leadlens'
  },

  esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  },
}

document.addEventListener('DOMContentLoaded', () => {
  Contacts.installInitialLoadWatchdog()
  Utils.withTimeout(Contacts.init(), 18000, 'Lead Vault initialization timed out')
    .catch((error) => Contacts.handleInitFailure(error))
})
