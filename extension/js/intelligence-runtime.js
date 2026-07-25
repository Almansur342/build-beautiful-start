'use strict'
/* eslint-env browser, node */

;(function exposeLeadLensIntelligence(globalScope) {
  const VERSION = '1.5.0'
  const toArray = (value) => Array.isArray(value) ? value : value instanceof Set ? [...value] : value instanceof Map ? [...value.values()] : value ? [value] : []
  const text = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
  const bounded = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0))
  const unique = (items) => [...new Set(toArray(items).map((item) => text(item)).filter(Boolean))]

  function techList(site = {}) {
    const raw = site.technologies instanceof Map ? [...site.technologies.values()] : toArray(site.technologies)
    return raw.map((item = {}) => ({
      name: text(item.name || item),
      version: text(item.version),
      categories: toArray(item.categories).map((category) => text(category?.name || category)).filter(Boolean),
      confidence: Number(item.confidence || 0),
    })).filter((item) => item.name)
  }

  function audit(site = {}) {
    const raw = site.seoAudit && typeof site.seoAudit === 'object' ? site.seoAudit : {}
    return {
      ...raw,
      rawEvidence: raw.rawEvidence && typeof raw.rawEvidence === 'object' ? raw.rawEvidence : {},
      seoInfrastructure: raw.seoInfrastructure && typeof raw.seoInfrastructure === 'object' ? raw.seoInfrastructure : {},
    }
  }

  function evidenceText(site = {}) {
    const a = audit(site)
    const raw = a.rawEvidence || {}
    const main = raw.mainContent || {}
    const identity = raw.businessIdentity || {}
    const explicit = raw.explicitPageSignals || {}
    const technology = techList(site).map((item) => `${item.name} ${item.version} ${item.categories.join(' ')}`).join(' ')
    const related = toArray(raw.relatedPageEvidence).map((item) => `${item?.title || ''} ${item?.textPreview || ''}`).join(' ')
    return text([
      site.host, site.websiteUrl, site.pageTitle,
      a.title, a.description, a.pageTextPreview,
      raw.title, raw.description, raw.pageTextPreview,
      main.title, main.byline, main.excerpt, main.textContent,
      toArray(raw.rawTextChunks).join(' '),
      Object.values(raw.rawTextChunks || {}).join(' '),
      toArray(a.intentKeywords).join(' '),
      toArray(identity.names).join(' '),
      toArray(identity.legalNames).join(' '),
      toArray(identity.entityTypes).join(' '),
      toArray(identity.areaServed).join(' '),
      toArray(identity.openingHours).join(' '),
      toArray(explicit.offerings).join(' '),
      toArray(explicit.policies).map((item) => item?.text || item?.type || '').join(' '),
      related,
      technology,
      toArray(site.leadMeta?.tags).join(' '),
      site.leadMeta?.industry || '',
    ].join(' ')).toLowerCase().slice(0, 140000)
  }

  function scorePatterns(haystack, patterns = []) {
    let score = 0
    const reasons = []
    for (const item of patterns) {
      const pattern = item[0]
      const points = Number(item[1] || 0)
      const reason = item[2] || ''
      if (pattern.test(haystack)) {
        score += points
        if (reason) reasons.push(reason)
      }
    }
    return { score, reasons }
  }

  const CATEGORY_RULES = {
    platform: [
      [/\b(?:marketplace|directory|listing platform|booking platform|travel platform|social network|blog platform|video platform|developer platform|documentation platform|cloud platform|app platform|portal)\b/i, 34, 'platform/portal language'],
      [/\b(?:sign up|log in|login|create account|free trial|start free|developers?|api|integrations?|pricing|plans?)\b.*\b(?:platform|software|hosting|docs?|cloud|dashboard)\b/i, 22, 'product/platform navigation'],
      [/\b(?:alibaba|telegram|livejournal|hatena|netlify|kayak|trip\.com|read the docs|apache|arch linux|niconico|telegra\.ph)\b/i, 40, 'known large platform or community product'],
    ],
    agency: [
      [/\b(?:web|website|mobile|app|software|product)\s+(?:design|development|engineering)\s+(?:agency|company|studio|services?)\b/i, 22, 'web/software service language'],
      [/\b(?:digital|creative|marketing|seo|ppc|branding|design)\s+agency\b/i, 24, 'agency language'],
      [/\bwhite[- ]?label\b|\boverflow\s+(?:development|delivery)\b|\bdedicated\s+(?:developers?|team)\b/i, 24, 'delivery/white-label language'],
      [/\bour\s+work\b|\bcase\s+stud(?:y|ies)\b|\bclient\s+(?:work|success|portfolio)\b/i, 8, 'agency portfolio language'],
      [/\bit\s+(?:services?|consulting|solutions?)\b|\bmanaged\s+services\b|\bcybersecurity\s+(?:services?|consulting)\b/i, 20, 'IT service provider language'],
    ],
    saas: [
      [/\bsaas\b|\bsoftware[- ]as[- ]a[- ]service\b/i, 30, 'SaaS language'],
      [/\bbook\s+a\s+demo\b|\brequest\s+a\s+demo\b|\bstart\s+(?:a\s+)?free\s+trial\b|\bfree\s+trial\b/i, 20, 'product demo/trial language'],
      [/\bpricing\s+(?:plans?|tiers?)\b|\bsubscription\b|\bplatform\s+for\b|\bcloud\s+platform\b/i, 15, 'software product language'],
      [/\bapi\s+(?:docs?|documentation)\b|\bdeveloper\s+(?:portal|documentation)\b|\bintegrations?\b/i, 10, 'developer/integration language'],
      [/\bantivirus\b|\bvpn\b|\bpodcast\s+hosting\b|\boffice\s+suite\b|\bgis\s+software\b|\bsoftware\s+platform\b/i, 26, 'software product language'],
    ],
    ecommerce: [
      [/\bshop\s+now\b|\badd\s+to\s+cart\b|\bcheckout\b|\bshopping\s+cart\b/i, 28, 'shopping flow language'],
      [/\bshopify\b|\bwoocommerce\b|\bmagento\b|\bbigcommerce\b|\bprestashop\b/i, 20, 'ecommerce technology'],
      [/\bproduct\s+catalog\b|\bfree\s+shipping\b|\breturns?\s+policy\b|\bshop\s+all\b/i, 12, 'retail/catalog language'],
    ],
    restaurant: [
      [/\brestaurant\b|\bcafe\b|\bbistro\b|\bbakery\b|\bpizzeria\b|\bfood\s+menu\b/i, 30, 'restaurant/food language'],
      [/\bview\s+(?:our\s+)?menu\b|\border\s+online\b|\btable\s+reservation\b|\bbook\s+a\s+table\b/i, 18, 'menu/order/reservation language'],
    ],
    healthcare: [
      [/\bclinic\b|\bhospital\b|\bmedical\s+(?:centre|center|practice)\b|\bhealthcare\b/i, 26, 'healthcare language'],
      [/\bdoctor\b|\bdentist\b|\bphysician\b|\bpatient\b|\bappointment\b/i, 12, 'patient/appointment language'],
    ],
    education: [
      [/\buniversity\b|\bcollege\b|\bschool\b|\bacademic\b|\bfaculty\b|\badmissions?\b|universit[éeä]|universidad|università|universiteit/i, 26, 'education/institution language'],
      [/\bcourses?\b|\bdegree\s+programs?\b|\bresearch\s+(?:institute|centre|center)\b|formation|étudiants?|studium|forschung|学习|教育|大学|课程|学生|学校/i, 12, 'course/research language'],
    ],
    government: [
      [/\bgovernment\b|\bministry\b|\bdepartment\s+of\b|\bpublic\s+service\b|\bmunicipality\b/i, 28, 'public-sector language'],
      [/\.(?:gov|gouv)\.[a-z]{2,}$/i, 28, 'government domain'],
    ],
    nonprofit: [
      [/\bnonprofit\b|\bnon-profit\b|\bcharity\b|\bfoundation\b|\bdonate\b|\bvolunteer\b/i, 24, 'nonprofit/charity language'],
    ],
    finance: [
      [/\bbank\b|\bcredit\s+union\b|\bfinancial\s+services\b|\binsurance\b|\binvestment\b/i, 24, 'financial-service language'],
    ],
    legal: [
      [/\blaw\s+firm\b|\blegal\s+services\b|\battorney\b|\bsolicitor\b|\blawyer\b/i, 26, 'legal-service language'],
    ],
    realEstate: [
      [/\breal\s+estate\b|\brealtor\b|\bproperty\s+(?:management|listing|sales)\b|\bhomes?\s+for\s+sale\b/i, 26, 'real-estate language'],
    ],
    hospitality: [
      [/\bhotel\b|\bresort\b|\bguesthouse\b|\baccommodation\b|\brooms?\s+(?:and|&)\s+suites?\b/i, 24, 'hospitality language'],
      [/\bbook\s+(?:a\s+)?room\b|\bcheck[- ]in\b|\bcheck[- ]out\b/i, 12, 'booking language'],
    ],
    manufacturer: [
      [/\bmanufacturer\b|\bmanufacturing\b|\bwholesale\b|\bdistributor\b|\boem\b|\bindustrial\s+solutions\b|\bleading\s+brand\b|gaming\s+laptop/i, 24, 'manufacturer/distributor language'],
    ],
    venue: [
      [/\b(?:event|exhibition|convention|conference)\s+(?:venue|centre|center|space|hall)\b/i, 32, 'event/convention venue language'],
      [/\bvenue\s+spaces?\b|\bevent\s+halls?\b|\bmeeting\s+rooms?\b|\bauditorium\b|\bconference\s+facilit(?:y|ies)\b/i, 20, 'venue facilities language'],
    ],
    media: [
      [/\bnews\b|\bjournalism\b|\bnewspaper\b|\bpublisher\b|\bbreaking\s+news\b/i, 22, 'media/publisher language'],
      [/новини|новости|hírek|novice|noticias|actualités|politike|gospodarstva|športa|friss\s+hírek/i, 24, 'news/publisher language'],
    ],
    localService: [
      [/\bplumber\b|\belectrician\b|\broofing\b|\bcleaning\s+services?\b|\bhome\s+services?\b|\brepair\s+services?\b/i, 24, 'local service language'],
      [/\bserving\s+(?:the\s+)?[a-z ]+\s+area\b|\bservice\s+area\b|\bget\s+a\s+quote\b/i, 10, 'service-area/quote language'],
    ],
    professional: [
      [/\bconsulting\b|\bconsultancy\b|\bprofessional\s+services\b|\badvisory\b/i, 14, 'professional-service language'],
    ],
  }

  const LABELS = {
    platform: 'Platform / marketplace / large product',
    agency: 'IT / digital agency', saas: 'Software / SaaS company', ecommerce: 'Ecommerce / retail', restaurant: 'Restaurant / food business', healthcare: 'Healthcare / clinic', education: 'Education / university', government: 'Government / public sector', nonprofit: 'Nonprofit / charity', finance: 'Financial services', legal: 'Law firm / legal services', realEstate: 'Real estate', hospitality: 'Hotel / hospitality', manufacturer: 'Manufacturer / distributor', venue: 'Convention / event venue', media: 'Media / publisher', localService: 'Local service business', professional: 'Professional services', general: 'General business',
  }


  const KNOWN_RESEARCH_ONLY_DOMAINS = [
    ['alibaba.com', 'Alibaba'], ['avast.com', 'Avast'], ['msi.com', 'MSI'], ['hatena.blog', 'Hatena Blog'], ['hatena.ne.jp', 'Hatena'],
    ['sapo.pt', 'SAPO'], ['livejournal.com', 'LiveJournal'], ['trip.com', 'Trip.com'], ['kayak.com', 'KAYAK'], ['kayak.co.in', 'KAYAK'],
    ['jd.com', 'JD.com'], ['netlify.app', 'Netlify hosted app'], ['appspot.com', 'Google App Engine'], ['t.me', 'Telegram'], ['telegra.ph', 'Telegraph'],
    ['buzzsprout.com', 'Buzzsprout'], ['readthedocs.com', 'Read the Docs'], ['apache.org', 'Apache Software Foundation'], ['archlinux.org', 'Arch Linux'],
    ['frontiersin.org', 'Frontiers'], ['inform.kz', 'Kazinform'], ['ria.ru', 'RIA'], ['onet.pl', 'Onet'], ['itmedia.co.jp', 'ITmedia'],
    ['err.ee', 'ERR'], ['uefa.com', 'UEFA'], ['nicovideo.jp', 'Niconico'], ['libretexts.org', 'LibreTexts'], ['diva-portal.org', 'DiVA Portal'], ['narod.ru', 'Narod hosted pages'], ['ligazakon.net', 'LigaZakon legal information platform'], ['banggood.com', 'Banggood marketplace'], ['seesaa.net', 'Seesaa Blog'], ['antaranews.com', 'ANTARA News'], ['ceskatelevize.cz', 'Czech Television'], ['linternaute.com', 'Linternaute'],
    ['sch.gr', 'Greek School Network'], ['umd.edu', 'University of Maryland'], ['ucm.es', 'Universidad Complutense de Madrid'], ['hse.ru', 'HSE University'], ['upenn.edu', 'University of Pennsylvania'], ['usu.edu', 'Utah State University'], ['nii.ac.jp', 'NII'],
    ['canada.ca', 'Government of Canada'], ['mn.gov', 'Minnesota government'], ['wa.gov', 'Washington government'], ['in.gov', 'Indiana government'],
  ]

  function hostMatches(host, domain) {
    const h = text(host).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    const d = text(domain).toLowerCase().replace(/^www\./, '')
    return h === d || h.endsWith(`.${d}`)
  }

  function knownResearchOnlySignal(site = {}) {
    const host = text(site.host || site.websiteUrl)
    const match = KNOWN_RESEARCH_ONLY_DOMAINS.find(([domain]) => hostMatches(host, domain))
    return match ? { matched: true, name: match[1], reasons: [`known research-only/non-SMB domain: ${match[0]}`] } : { matched: false, name: '', reasons: [] }
  }

  function nonSmbResearchSignal(site = {}, classification = null, quality = null) {
    const cls = classification || classifyBusiness(site)
    const haystack = evidenceText(site)
    const host = text(site.host || site.websiteUrl).toLowerCase()
    const known = knownResearchOnlySignal(site)
    const reasons = []
    if (known.matched) reasons.push(...known.reasons)
    if (quality && ['blocked', 'failed'].includes(quality.id)) reasons.push(`scan is ${quality.label}`)
    if (['platform', 'government', 'education', 'media'].includes(cls.id)) reasons.push(`${cls.label} category is research-only for SMB outreach`)
    if (['saas', 'agency'].includes(cls.id)) reasons.push(`${cls.label} requires partnership/product route, not generic SMB SEO/redesign outreach`)
    if (['large', 'enterprise'].includes(cls.size?.id)) reasons.push(`${cls.size.label} organization size estimate`)
    if (/\b(?:global|worldwide|official|public sector|government|university|news|publisher|marketplace|platform|portal|documentation|open source foundation|foundation)\b/i.test(haystack) && !/\b(?:restaurant|salon|clinic|plumber|law firm|dentist|service area|get a quote|book a table)\b/i.test(haystack)) {
      reasons.push('institution/platform language without local-business evidence')
    }
    if (/\.(?:gov|edu)$|\.(?:gov|edu|ac)\.[a-z]{2,}$/i.test(host)) reasons.push('government/education domain')
    return { matched: reasons.length > 0, reasons: unique(reasons).slice(0, 6) }
  }

  function classifyBusiness(site = {}) {
    const haystack = evidenceText(site)
    const a = audit(site)
    const raw = a.rawEvidence || {}
    const schema = unique([...(toArray(a.schemaTypes)), ...(toArray(raw.schemaTypes)), ...(toArray(raw.businessIdentity?.entityTypes))]).join(' ').toLowerCase()
    const scores = {}
    const reasons = {}
    Object.entries(CATEGORY_RULES).forEach(([id, rules]) => {
      const result = scorePatterns(haystack, rules)
      scores[id] = result.score
      reasons[id] = result.reasons
    })
    const knownResearchOnly = knownResearchOnlySignal(site)
    if (knownResearchOnly.matched) {
      scores.platform = Math.max(scores.platform || 0, 96)
      reasons.platform = unique([...(reasons.platform || []), ...knownResearchOnly.reasons])
    }
    if (/\bsoftwareapplication\b|\bwebapplication\b|\bproduct\b|\bservice\b/.test(schema)) scores.saas = (scores.saas || 0) + 12
    if (/\blocalbusiness\b|\bstore\b|\bprofessionalservice\b/.test(schema)) scores.localService = (scores.localService || 0) + 8
    if (/\brestaurant\b|\bfoodestablishment\b/.test(schema)) scores.restaurant = (scores.restaurant || 0) + 16
    if (/\bmedicalorganization\b|\bphysician\b|\bdentist\b/.test(schema)) scores.healthcare = (scores.healthcare || 0) + 16
    if (/\bcollegeoruniversity\b|\beducationalorganization\b/.test(schema)) scores.education = (scores.education || 0) + 18
    if (/\bgovernmentorganization\b/.test(schema)) scores.government = (scores.government || 0) + 18
    if (/\bnewsmediaorganization\b|\bnewspaper\b/.test(schema)) scores.media = (scores.media || 0) + 28
    if (/\beventvenue\b|\bcivicstructure\b/.test(schema)) scores.venue = (scores.venue || 0) + 18
    if (/\borganization\b|\bcorporation\b/.test(schema)) scores.professional = (scores.professional || 0) + 3

    const host = text(site.host || site.websiteUrl).toLowerCase()
    const titleDescription = text(`${site.pageTitle || ''} ${a.title || ''} ${a.description || ''} ${raw.title || ''} ${raw.description || ''}`).toLowerCase()
    if (/\b(?:antivirus|vpn|software|podcast hosting|cloud platform|office suite|gis software)\b/.test(titleDescription)) scores.saas = (scores.saas || 0) + 24
    if (/\b(?:event|exhibition|convention|conference)\s+(?:venue|centre|center|space|hall)\b/.test(titleDescription) || /\bvenue\s+spaces?\b/.test(titleDescription)) scores.venue = (scores.venue || 0) + 30
    if (/学习|教育|大学|课程|学生|学校/.test(titleDescription)) scores.education = (scores.education || 0) + 26
    if (/新闻|новини|новости|hírek|novice|noticias|actualités/.test(titleDescription)) scores.media = (scores.media || 0) + 24
    if (/\.(?:edu|ac)\.[a-z]{2,}$|\.edu$|^(?:www\.)?uni[-.]/.test(host)) scores.education = (scores.education || 0) + 24
    if (/\.(?:gov|gouv)\.[a-z]{2,}$|\.gov$|beniculturali/.test(host)) scores.government = (scores.government || 0) + 24

    let ranked = Object.entries(scores).sort((a1, b1) => b1[1] - a1[1])
    let id = ranked[0]?.[0] || 'general'
    let top = ranked[0]?.[1] || 0
    const second = ranked[1]?.[1] || 0
    if (top < 8) id = 'general'
    if ((scores.platform || 0) >= 60) id = 'platform'
    if (id === 'professional' && scores.agency >= 14) id = 'agency'
    if (id === 'localService' && scores.restaurant >= 14) id = 'restaurant'
    if (id === 'professional' && scores.legal >= 14) id = 'legal'
    const strongRestaurantTitle = /\brestaurant\b|\bcafe\b|\bbistro\b|\bpizzeria\b|\bfood\s+business\b/i.test(titleDescription)
    const strongVenueTitle = /\b(?:convention|conference|congress|reception|banquet|wedding|event|meeting|training|formation)\s+(?:centre|center|hall|venue|space|room|rooms)|\b(?:room|hall|venue)\s+rental|location de salles|réserver une salle|capacit[ée] maximale/i.test(titleDescription + ' ' + haystack)
    const strongEducationTitle = /\buniversity\b|universit[éeä]|universidad|università|universiteit|大学|学校/i.test(titleDescription) || /\.(?:edu|ac)\.[a-z]{2,}$|\.edu$/.test(host)
    const strongGovernmentHost = /\.(?:gov|gouv)\.[a-z]{2,}$|\.gov$/.test(host)
    const strongManufacturerTitle = /\bleading\s+brand\b|\bmanufacturer\b|gaming\s+laptop/i.test(titleDescription)
    if ((scores.platform || 0) >= 60) id = 'platform'
    else if (strongVenueTitle && (scores.venue || 0) >= 18) id = 'venue'
    else if (strongEducationTitle && (scores.education || 0) >= 24) id = 'education'
    else if (strongGovernmentHost && (scores.government || 0) >= 24) id = 'government'
    else if (strongRestaurantTitle && (scores.restaurant || 0) >= 24) id = 'restaurant'
    else if (strongManufacturerTitle && (scores.manufacturer || 0) >= 24) id = 'manufacturer'
    else if ((scores.venue || 0) >= 24 && (scores.venue || 0) >= (scores.hospitality || 0)) id = 'venue'
    else if ((scores.saas || 0) >= 24 && (scores.saas || 0) >= (scores.hospitality || 0) && (scores.saas || 0) >= (scores.agency || 0)) id = 'saas'
    else if ((scores.media || 0) >= 24 && (scores.media || 0) >= (scores.professional || 0)) id = 'media'
    top = scores[id] || top

    const confidenceScore = id === 'general' ? Math.max(42, Math.min(62, 42 + Math.floor(top / 2))) : bounded(48 + top + Math.max(0, top - second) / 2, 50, 96)
    const confidence = confidenceScore >= 82 ? 'High' : confidenceScore >= 64 ? 'Medium' : 'Low'
    const categoryReasons = id === 'general'
      ? ['No single sector dominated; classified as a general business using available page context.']
      : unique(reasons[id]).slice(0, 5)

    const size = estimateCompanySize(site, { id, haystack, schema, scores })
    const approach = approachFor(id, size.id)
    return {
      id,
      label: LABELS[id] || LABELS.general,
      confidence,
      confidenceScore: Math.round(confidenceScore),
      reasons: categoryReasons,
      scores,
      size,
      approach,
      isItCompany: id === 'agency' || id === 'saas' || id === 'platform',
      runtimeVersion: VERSION,
    }
  }

  function estimateCompanySize(site = {}, context = {}) {
    const haystack = context.haystack || evidenceText(site)
    const a = audit(site)
    const raw = a.rawEvidence || {}
    const techCount = techList(site).length
    const languages = unique([a.lang, raw.lang, ...toArray(raw.declaredLanguages), ...toArray(raw.hreflangLinks).map((item) => item?.hreflang)]).length
    const officeCount = toArray(raw.businessIdentity?.addresses).length
    const entityText = `${context.schema || ''} ${toArray(raw.businessIdentity?.entityTypes).join(' ')}`.toLowerCase()
    let enterprise = 0
    let small = 0
    const reasons = []
    const add = (points, reason, condition) => { if (condition) { enterprise += points; reasons.push(reason) } }
    add(22, 'investor relations, annual-report, or public-company language', /\binvestor\s+relations\b|\bannual\s+report\b|\bpublicly\s+traded\b|\bstock\s+exchange\b|上市|纽交所|估值|独角兽/i.test(haystack))
    add(18, 'global/enterprise language', /\bglobal\s+(?:leader|company|offices?|operations?)\b|\benterprise\s+(?:customers?|solutions?|platform)\b|\bfortune\s+500\b/i.test(haystack))
    add(12, 'careers and multiple departments', /\bcareers?\b/.test(haystack) && /\b(?:sales|support|press|media|investor|partners?)\b/.test(haystack))
    add(12, 'multiple offices or geographic markets', officeCount >= 3 || languages >= 4)
    add(12, 'large technical footprint', techCount >= 18)
    add(14, 'enterprise analytics or experience stack', techList(site).some((item) => /Adobe Experience Manager|Adobe Analytics|Salesforce|Quantum Metric|Akamai mPulse|Contentsquare/i.test(item.name)))
    add(10, 'corporation schema', /\bcorporation\b/.test(entityText))
    add(8, 'large content footprint', Number(a.wordCount || 0) >= 12000)
    add(10, 'institutional organization context', context.id === 'education' || context.id === 'government')
    add(22, 'known platform or research-only domain', context.id === 'platform')
    add(10, 'publisher/content organization footprint', context.id === 'media' && Number(a.wordCount || 0) >= 4000)
    add(10, 'large venue/content footprint', context.id === 'venue' && Number(a.wordCount || 0) >= 5000)
    add(8, 'substantial technology footprint', ['media', 'venue', 'education', 'government'].includes(context.id) && techCount >= 12)

    if (a.hasLocalBusinessSchema || a.addressSignals || a.openingHourSignals) small += 12
    if (officeCount === 1) small += 8
    if (techCount > 0 && techCount <= 8) small += 4
    if (/\bfamily[- ]owned\b|\blocal\s+business\b|\bserving\s+our\s+community\b/i.test(haystack)) small += 12

    let id = 'small'
    if (context.id === 'platform') id = 'enterprise'
    else if (enterprise >= 52) id = 'enterprise'
    else if (enterprise >= 36) id = 'large'
    else if (enterprise >= 20) id = 'medium'
    else if (['education', 'government'].includes(context.id) && enterprise >= 10) id = 'medium'
    else if (small >= 20 || context.id === 'restaurant' || context.id === 'localService') id = 'small'
    else if (Number(a.wordCount || 0) > 0 && Number(a.wordCount || 0) < 900 && techCount <= 5) id = 'micro'
    else id = 'small'

    const labels = { micro: 'Solo / micro', small: 'Small', medium: 'Medium', large: 'Large', enterprise: 'Enterprise' }
    const confidenceScore = bounded(54 + Math.abs(enterprise - small), 52, 92)
    return {
      id,
      label: labels[id],
      confidence: confidenceScore >= 80 ? 'High' : confidenceScore >= 64 ? 'Medium' : 'Low',
      confidenceScore: Math.round(confidenceScore),
      reasons: unique(reasons).slice(0, 5),
      exactEmployeeCount: null,
    }
  }

  function approachFor(category, size) {
    if (size === 'enterprise' || size === 'large') return 'Vendor, partnership, integration, or procurement route; avoid a generic small-business pitch.'
    if (category === 'platform') return 'Research-only platform/company record; suppress generic SMB redesign or SEO outreach.'
    if (category === 'agency') return 'Peer-to-peer collaboration, white-label delivery, overflow development, referral, or specialist implementation.'
    if (category === 'saas') return 'Technical/product collaboration, integration, conversion, or specialist implementation.'
    if (category === 'government' || category === 'education' || category === 'nonprofit') return 'Institutional/vendor route with a specific evidence-backed improvement; avoid generic cold sales.'
    if (category === 'ecommerce') return 'Conversion, product SEO, trust, performance, and checkout confidence.'
    if (category === 'venue') return 'Direct B2B opportunity using event-enquiry, booking, venue SEO, accessibility, and conversion evidence.'
    if (category === 'restaurant' || category === 'healthcare' || category === 'localService' || category === 'legal' || category === 'realEstate' || category === 'hospitality') return 'Direct service opportunity using a specific local visibility, conversion, trust, or contact-path issue.'
    return 'Short evidence-backed audit approach focused on the clearest business-impact issue.'
  }

  function oldTechnologySignals(site = {}) {
    const matches = []
    for (const item of techList(site)) {
      const name = item.name.toLowerCase()
      const version = item.version
      const major = Number(String(version).match(/^\d+/)?.[0] || NaN)
      if (name === 'jquery' && Number.isFinite(major) && major <= 2) matches.push(`${item.name} ${version}`)
      if (name === 'bootstrap' && Number.isFinite(major) && major <= 3) matches.push(`${item.name} ${version}`)
      if (/angularjs|microsoft frontpage|adobe flash|flash|prototype\.js|mootools/i.test(item.name)) matches.push(`${item.name}${version ? ` ${version}` : ''}`)
      if (name === 'php' && Number.isFinite(major) && major <= 7) matches.push(`${item.name} ${version}`)
    }
    return unique(matches)
  }

  function scanQuality(site = {}) {
    const a = audit(site)
    const raw = a.rawEvidence || {}
    const challenge = raw.challenge || site.challenge
    const meaningfulContacts = toArray(site.contacts).filter((row) => {
      const type = text(row?.type).toLowerCase()
      const sources = toArray(row?.sources).join(' ').toLowerCase()
      return type !== 'site' && !(/^bulk scan$/.test(sources) && !row?.phoneRecord)
    })
    const hasEvidence = Boolean(Object.keys(raw).length || toArray(a.checks).length || Number(a.wordCount || 0) || techList(site).length || meaningfulContacts.length)
    const hasFull = Boolean(Object.keys(raw).length && (Number(a.wordCount || 0) > 0 || toArray(a.checks).length > 0))
    const statusText = `${site.scanStatus || ''} ${site.status || ''} ${a.status || ''}`.toLowerCase()
    const pageText = `${site.pageTitle || ''} ${a.title || ''} ${a.description || ''} ${raw.title || ''} ${raw.description || ''}`.toLowerCase()
    const challengeText = /access denied|website firewall|captcha|just a moment|checking your browser|verify you are human|security check|forbidden|error\s*403|\b403\b/.test(pageText)
    if (challenge?.challenge || challengeText || /blocked|challenge|403|captcha/.test(statusText)) return { id: 'blocked', label: 'Blocked', complete: false }
    if (/timeout|failed|error|retry/.test(statusText) && !hasFull) return { id: 'failed', label: 'Failed / retry', complete: false }
    if (hasFull) return { id: 'completed', label: 'Completed', complete: true }
    if (hasEvidence) return { id: 'partial', label: 'Partial', complete: false }
    return { id: 'failed', label: 'Failed / no evidence', complete: false }
  }

  function buildOutreachAngles(site = {}, maxAngles = 5) {
    const classification = classifyBusiness(site)
    const quality = scanQuality(site)
    if (quality.id === 'blocked' || quality.id === 'failed') {
      return [
        { id: 'retry-scan', title: 'Retry evidence scan', reason: 'The website was blocked, timed out, or did not provide enough reliable page evidence.', evidence: [quality.label], confidence: 'High', direction: 'Retry the scan or open the real business page before choosing a sales angle.', score: 100 },
        { id: 'identity-research', title: 'Verify business identity and contact route', reason: 'A reliable business category and website opportunity should not be claimed from a blocked or empty page.', evidence: [text(site.pageTitle || site.host || 'Website record')], confidence: 'High', direction: 'Confirm the real homepage, business type, and appropriate contact path first.', score: 90 },
      ].slice(0, Math.max(1, Math.min(2, maxAngles)))
    }
    const nonSmb = nonSmbResearchSignal(site, classification, quality)
    if (nonSmb.matched) {
      return [
        {
          id: 'research-only',
          title: 'Research-only / non-SMB record',
          reason: 'This website is not a normal SMB/local-business outreach prospect. Suppress generic SEO/redesign sales angles.',
          evidence: nonSmb.reasons,
          confidence: 'High',
          direction: 'Keep the evidence for research, exclusion logic, vendor/partnership review, or manual qualification only.',
          score: 100,
        },
        {
          id: 'no-generic-outreach',
          title: 'Do not generate generic outreach',
          reason: 'Website issues may exist, but outreach readiness is unsafe until the entity type and contact route are verified.',
          evidence: [classification.label, classification.size?.label || '', quality.label].filter(Boolean),
          confidence: 'High',
          direction: 'Only create outreach if a human changes the record to an allowed SMB prospect or a clear partnership path.',
          score: 95,
        },
      ].slice(0, Math.max(1, Math.min(2, maxAngles)))
    }
    const a = audit(site)
    const raw = a.rawEvidence || {}
    const acc = raw.accessibilityAudit || raw.accessibilitySignals || {}
    const infra = a.seoInfrastructure || {}
    const technologies = techList(site)
    const oldTech = oldTechnologySignals(site)
    const emails = toArray(site.emails).length || toArray(site.contacts).filter((row) => row?.type === 'email').length
    const phones = toArray(site.contacts).filter((row) => row?.type === 'phone' || row?.phoneRecord).length + toArray(site.phones).length
    const socials = toArray(site.socials).length
    const angles = []
    const add = (id, title, reason, evidence, confidence, direction, score) => {
      if (angles.some((item) => item.id === id)) return
      angles.push({ id, title, reason, evidence: unique(evidence).slice(0, 5), confidence, direction, score: Number(score || 0) })
    }

    if (classification.id === 'agency') {
      add('collaboration', 'White-label / delivery collaboration', 'This appears to be an IT, software, web, or digital service provider, so a peer-to-peer partnership angle is safer than a generic redesign pitch.', classification.reasons, classification.confidence, 'Discuss overflow delivery, specialist backend/automation support, referrals, or white-label implementation.', 100)
    } else if (classification.id === 'saas') {
      add('product-collaboration', 'Technical or product collaboration', 'The website appears to represent a software product or platform.', classification.reasons, classification.confidence, 'Lead with integration, implementation, product-page conversion, technical SEO, or specialist engineering support.', 96)
    }
    if (['large', 'enterprise'].includes(classification.size.id)) {
      add('enterprise-route', 'Enterprise vendor / partnership route', 'The available signals suggest a large organization where a generic small-business service pitch is unlikely to reach the right buyer.', classification.size.reasons, classification.size.confidence, 'Use a specific vendor, procurement, partnership, integration, or department-level approach.', 98)
    }

    const seoScore = a.score === null || typeof a.score === 'undefined' ? null : Number(a.score)
    const seoIssues = unique(a.issues)
    if ((seoScore !== null && seoScore < 72) || seoIssues.length >= 3 || Number(a.h1Count || 0) !== 1) {
      add('seo', 'SEO and search-presentation improvement', seoScore !== null ? `The captured SEO evidence score is ${seoScore}/100.` : 'Multiple on-page SEO signals need review.', [
        ...(seoIssues.slice(0, 3)),
        Number(a.h1Count || 0) !== 1 ? `H1 count: ${Number(a.h1Count || 0)}` : '',
        !a.canonical ? 'Canonical URL not detected' : '',
        !a.description && !raw.description ? 'Meta description not detected' : '',
      ], seoScore !== null && seoScore < 60 ? 'High' : 'Medium', 'Offer a concise on-page SEO and search-snippet audit tied to discoverability.', 88 - Math.max(0, seoScore || 65) / 4)
    }

    const loadMs = Number(a.loadTime || a.navTiming?.loadTime || 0)
    const lcp = Number(a.largestContentfulPaint || 0)
    const ttfb = Number(a.navTiming?.ttfb || 0)
    const resources = Number(a.resources || 0)
    const domNodes = Number(a.domNodeCount || 0)
    const performanceEvidence = []
    if (loadMs > 3500) performanceEvidence.push(`Observed page-load completion: ${Math.round(loadMs)} ms`)
    if (lcp > 2500) performanceEvidence.push(`Observed LCP: ${Math.round(lcp)} ms`)
    if (ttfb > 800) performanceEvidence.push(`Observed TTFB: ${Math.round(ttfb)} ms`)
    if (resources > 110) performanceEvidence.push(`${resources} resources observed`)
    if (domNodes > 2500) performanceEvidence.push(`${domNodes} DOM elements observed`)
    if (performanceEvidence.length >= 2 || loadMs > 5000 || lcp > 4000) {
      add('performance', 'Performance and loading-efficiency review', 'Browser observations and page complexity indicate a possible performance opportunity. Results can vary by device, cache, location, and network.', performanceEvidence, performanceEvidence.length >= 3 ? 'High' : 'Medium', 'Discuss image/script reduction, render-blocking work, caching, and Core Web Vitals—without claiming a universal load time.', 84)
    }

    if (oldTech.length) {
      add('modernization', 'Technology modernization', 'Legacy or older-generation technologies were detected and may increase maintenance, compatibility, or security risk.', oldTech, 'High', 'Offer a modernization assessment rather than declaring the entire website obsolete.', 86)
    }

    const missingEmail = emails === 0
    const hasContactForm = Number(a.contactForms || 0) > 0
    const hasPhone = phones > 0 || Number(a.phoneLinks || 0) > 0
    if (missingEmail && !hasContactForm && !hasPhone) {
      add('contact-path', 'Lead capture and contact accessibility', 'No public business email, contact form, or phone path was captured.', ['No public business email detected', 'No contact form detected', 'No phone path detected'], 'High', 'Discuss making enquiries easier with a clear contact form, business mailbox, booking, or call path.', 92)
    } else if (missingEmail) {
      add('contact-clarity', 'Contact-path clarity', 'No public business email was captured, although another enquiry path may exist.', [hasContactForm ? 'Contact form detected' : '', hasPhone ? 'Phone path detected' : '', `${socials} social profile(s) detected`], 'Medium', 'Suggest clearer enquiry options; do not claim the business is poorly maintained solely because email is not public.', 64)
    }

    const ctaMissing = Number(a.ctaCount || 0) === 0 && Number(a.aboveFoldCtaCount || 0) === 0
    const bookingMissing = ['restaurant', 'healthcare', 'hospitality', 'realEstate'].includes(classification.id) && Number(a.bookingPageLinks || 0) === 0
    if (ctaMissing || bookingMissing || (Number(a.formCount || 0) > 0 && Number(a.formsWithoutSubmit || 0) > 0)) {
      add('conversion', 'Conversion-path improvement', 'The captured page signals suggest the next action may not be clear or complete.', [ctaMissing ? 'No clear CTA detected' : '', bookingMissing ? 'No booking/reservation path detected' : '', Number(a.formsWithoutSubmit || 0) ? `${a.formsWithoutSubmit} form(s) without a clear submit control` : ''], ctaMissing && bookingMissing ? 'High' : 'Medium', 'Discuss improving the primary CTA, booking, quote, order, or contact journey.', 82)
    }

    const accCount = Number(acc.violationCount || acc.issueCount || 0) + Number(a.unlabeledControls || 0) + Number(a.emptyHeadingCount || 0)
    const missingAlt = Math.max(0, Number(a.images || 0) - Number(a.imagesWithAlt || 0))
    if (accCount > 0 || missingAlt > 2 || Number(a.unlabeledControls || 0) > 0) {
      add('accessibility', 'Accessibility and usability improvement', 'Automated preflight signals found elements that may be harder to use with assistive technology.', [missingAlt ? `${missingAlt} image(s) without captured alt text` : '', Number(a.unlabeledControls || 0) ? `${a.unlabeledControls} unlabeled control(s)` : '', Number(a.emptyHeadingCount || 0) ? `${a.emptyHeadingCount} empty heading(s)` : ''], accCount > 4 || missingAlt > 6 ? 'High' : 'Medium', 'Offer a focused accessibility remediation review; do not present it as full WCAG certification.', 78)
    }

    if (!a.viewport || a.mobileOverflow) {
      add('mobile', 'Mobile experience improvement', 'The scan found a missing viewport signal or horizontal-overflow concern.', [!a.viewport ? 'Viewport meta not detected' : '', a.mobileOverflow ? 'Horizontal overflow observed' : ''], 'High', 'Discuss responsive layout, touch targets, mobile navigation, and conversion on smaller screens.', 80)
    }

    if ((Number(a.ogCount || 0) < 3) || (Number(a.twitterCount || 0) < 3)) {
      add('social-preview', 'Social sharing and brand-preview cleanup', 'Open Graph or social-card metadata appears incomplete.', [`Open Graph fields: ${Number(a.ogCount || 0)}`, `Twitter/X card fields: ${Number(a.twitterCount || 0)}`], 'Medium', 'Offer better link previews, brand consistency, and click-through presentation.', 58)
    }

    const local = ['restaurant', 'healthcare', 'localService', 'legal', 'realEstate', 'hospitality', 'venue'].includes(classification.id)
    if (local && (!a.addressSignals || !a.mapSignals || !a.hasLocalBusinessSchema || !a.openingHourSignals)) {
      add('local-seo', 'Local visibility and trust signals', 'A local-service business appears to be missing one or more location-specific trust signals.', [!a.addressSignals ? 'Address signal not detected' : '', !a.mapSignals ? 'Map/location link not detected' : '', !a.hasLocalBusinessSchema ? 'LocalBusiness schema not detected' : '', !a.openingHourSignals ? 'Opening-hours signal not detected' : ''], 'High', 'Discuss local search visibility, map/address consistency, hours, and structured data.', 90)
    }

    const securityHeaders = infra.pageResponse?.securityHeaders || {}
    const missingSecurity = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy'].filter((key) => !securityHeaders[key])
    if (a.protocol === 'http:' || Number(a.mixedContentResources || 0) > 0 || Number(a.insecureForms || 0) > 0 || missingSecurity.length >= 3) {
      add('security', 'Security and trust hardening', 'The scan found transport, mixed-content, form, or response-header signals worth reviewing.', [a.protocol === 'http:' ? 'Page served over HTTP' : '', Number(a.mixedContentResources || 0) ? `${a.mixedContentResources} mixed-content resource(s)` : '', Number(a.insecureForms || 0) ? `${a.insecureForms} insecure form(s)` : '', missingSecurity.length ? `Headers not observed: ${missingSecurity.join(', ')}` : ''], a.protocol === 'http:' || Number(a.insecureForms || 0) ? 'High' : 'Medium', 'Offer a security-header, HTTPS, form, and mixed-content hardening review.', 76)
    }

    if (!angles.length) {
      add('search-polish', 'Search and content presentation review', 'No severe issue dominated, but the website can still be reviewed for clearer positioning, metadata, and conversion paths.', ['Available page content and technical evidence captured'], 'Low', 'Use a soft, optional audit offer and avoid claiming the website is broken.', 45)
      add('partnership-fallback', classification.id === 'agency' ? 'Collaboration opportunity' : 'Business-impact audit', classification.approach, classification.reasons, classification.confidence, classification.approach, 44)
    }

    return angles.sort((x, y) => y.score - x.score).slice(0, Math.max(2, Math.min(5, maxAngles)))
  }

  function isLikelyTimestamp(digits) {
    if (!/^\d+$/.test(digits)) return false
    if (digits.length === 10) {
      const value = Number(digits)
      return value >= 946684800 && value <= 4102444800
    }
    if (digits.length === 13) {
      const value = Number(digits)
      return value >= 946684800000 && value <= 4102444800000
    }
    return false
  }

  function phoneCandidate(value = '', options = {}) {
    const original = text(value)
    const source = text(options.source).toLowerCase()
    let raw = original.replace(/^tel:/i, '').split('?')[0]
    let digits = raw.replace(/\D/g, '')
    let plus = /^\s*\+/.test(raw)
    if (!plus && /^00\d+/.test(digits)) {
      if (digits.length < 11) return { possible: false, reason: 'short-international-prefix' }
      digits = digits.slice(2)
      raw = `+${digits}`
      plus = true
    }
    const callingCodes = ['998','996','995','994','993','992','977','976','975','974','973','972','971','970','968','967','966','965','964','963','962','961','960','886','880','856','855','853','852','850','692','691','690','689','688','687','686','685','683','682','681','680','679','678','677','676','675','674','673','672','670','599','598','597','595','594','593','592','591','590','509','508','507','506','505','504','503','502','501','500','423','421','420','389','387','386','385','383','382','381','380','378','377','376','375','374','373','372','371','370','359','358','357','356','355','354','353','352','351','350','299','298','297','291','290','269','268','267','266','265','264','263','262','261','260','258','257','256','255','254','253','252','251','250','249','248','247','246','245','244','243','242','241','240','239','238','237','236','235','234','233','232','231','230','229','228','227','226','225','224','223','222','221','220','218','216','213','212','211','20','98','95','94','93','92','91','90','86','84','82','81','66','65','64','63','62','61','60','58','57','56','55','54','53','52','51','49','48','47','46','45','44','43','41','40','39','36','34','33','32','31','30','27','7','1']
    const callingCode = plus ? callingCodes.find((code) => digits.startsWith(code)) || '' : ''
    if (plus && !callingCode) return { possible: false, reason: 'unknown-calling-code' }
    if (plus && callingCode && digits.charAt(callingCode.length) === '0') digits = `${callingCode}${digits.slice(callingCode.length + 1)}`
    const exactInternationalLengths = { '1': 11, '33': 11, '44': 12, '61': 11, '380': 12, '880': 13, '886': 12 }
    if (plus && callingCode && exactInternationalLengths[callingCode] && digits.length !== exactInternationalLengths[callingCode]) return { possible: false, reason: 'country-length' }
    const trusted = /tel\s*link|schema|telephone|phone\s*link|contact\s*(?:section|page)|whatsapp/.test(source)
    const labelled = /\b(?:tel|phone|telephone|mobile|call|hotline|contact|fax|whatsapp)\b/i.test(`${source} ${options.context || ''}`)
    if (digits.length < 7 || digits.length > 15) return { possible: false, reason: 'length' }
    if (isLikelyTimestamp(digits)) return { possible: false, reason: 'timestamp' }
    if (/^(?:19|20)\d{6}$/.test(digits)) return { possible: false, reason: 'date-like' }
    if (/^(?:214748364[0-9]|429496729[0-9])$/.test(digits)) return { possible: false, reason: 'integer-limit-like' }
    if (/^(.)\1{6,}$/.test(digits) || /^(?:0123456789|1234567890|9876543210)$/.test(digits)) return { possible: false, reason: 'sequence' }
    if (!plus && !trusted && !labelled && !/[\s().-]/.test(raw)) return { possible: false, reason: 'unlabelled-plain-number' }
    if (!plus && !trusted && digits.length < 10) return { possible: false, reason: 'short-untrusted' }

    const lib = globalScope.libphonenumber || globalScope.libphonenumberjs || null
    if (lib?.parsePhoneNumberFromString) {
      try {
        const parsed = lib.parsePhoneNumberFromString(raw, text(options.defaultCountry).toUpperCase() || undefined)
        if (!parsed || !parsed.isPossible()) return { possible: false, reason: 'libphonenumber-impossible' }
        return { possible: true, valid: parsed.isValid(), e164: parsed.number, country: parsed.country || '', reason: 'libphonenumber' }
      } catch (error) { /* use conservative fallback */ }
    }
    return { possible: true, valid: trusted || plus || labelled, e164: plus ? `+${digits}` : '', national: plus ? '' : digits, country: '', reason: 'conservative-fallback' }
  }

  function emailCandidate(value = '', options = {}) {
    const email = text(value).toLowerCase()
    const source = text(options.source).toLowerCase()
    const siteHost = text(options.siteHost).toLowerCase().replace(/^www\./, '')
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?\.[a-z]{2,24}$/.test(email)) return { valid: false, reason: 'format' }
    const [local, domain] = email.split('@')
    if (/^(?:u00(?:2f|3c|3e|22|27|26)|u002f|found|is|href|src|mailto|http|https)$/i.test(local) && !/mailto|data attribute|schema|contact/.test(source)) return { valid: false, reason: 'contaminated-local-part' }
    if (/^(?:example|test|sample|yourname|name|email|noreply|no-reply)$/i.test(local)) return { valid: false, reason: 'placeholder' }
    if (/\.(?:png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|pdf)$/i.test(domain)) return { valid: false, reason: 'asset-domain' }
    if (/u00(?:2f|3c|3e|22|27|26)/i.test(email)) return { valid: false, reason: 'escaped-code' }
    const root = (host) => host.split('.').slice(-2).join('.')
    const unrelatedCommonWord = /^(?:is|found|read|more|click|here|this|that|and|or)$/i.test(local) && siteHost && root(domain) !== root(siteHost)
    if (unrelatedCommonWord && !/mailto|schema/.test(source)) return { valid: false, reason: 'sentence-fragment' }
    const validator = globalScope.validator
    if (validator?.isEmail && !validator.isEmail(email, { allow_utf8_local_part: true, require_tld: true })) return { valid: false, reason: 'validator' }
    return { valid: true, reason: 'accepted' }
  }

  globalScope.LeadLensIntelligence = Object.freeze({
    version: VERSION,
    toArray,
    evidenceText,
    classifyBusiness,
    estimateCompanySize,
    buildOutreachAngles,
    oldTechnologySignals,
    scanQuality,
    nonSmbResearchSignal,
    knownResearchOnlySignal,
    phoneCandidate,
    emailCandidate,
  })
})(typeof self !== 'undefined' ? self : globalThis)
