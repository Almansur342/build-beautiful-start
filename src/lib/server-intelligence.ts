type AnyRecord = Record<string, any>;

const VERSION = "backend-intelligence-v1";

const clamp = (value: unknown, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const list = (value: unknown): any[] => Array.isArray(value) ? value : value ? [value] : [];

const unique = (items: unknown[]) => [
  ...new Set(items.map((item) => text(item)).filter(Boolean)),
];

function evidenceText(evidence: AnyRecord = {}) {
  return text([
    evidence.host,
    evidence.url,
    evidence.pageTitle,
    evidence.page?.title,
    evidence.page?.description,
    evidence.text?.preview,
    list(evidence.text?.intentKeywords).join(" "),
    list(evidence.page?.schemaTypes).join(" "),
    list(evidence.technologies)
      .map((item: any) => `${String(item?.name || item)} ${list(item?.categories).join(" ")}`)
      .join(" "),
  ].join(" ")).toLowerCase().slice(0, 24000);
}

function confidence(score: number) {
  return score >= 80 ? "High" : score >= 55 ? "Medium" : "Low";
}

function classify(evidence: AnyRecord = {}) {
  const haystack = evidenceText(evidence);
  const rules: Array<[string, string, RegExp, number]> = [
    ["agency", "IT / digital agency", /\b(web|website|software|app|product)s?\s+(design|development|engineering)\b|\bdigital\s+agency\b|\bseo\s+agency\b|\bwhite[- ]?label\b/i, 34],
    ["saas", "Software / SaaS company", /\bsaas\b|\bsoftware\b|\bplatform\b|\bbook\s+a\s+demo\b|\bfree\s+trial\b|\bapi\b|\bintegrations?\b/i, 30],
    ["ecommerce", "Ecommerce / retail", /\bshop\s+now\b|\badd\s+to\s+cart\b|\bcheckout\b|\bshopify\b|\bwoocommerce\b|\bproducts?\b/i, 30],
    ["restaurant", "Restaurant / food business", /\brestaurant\b|\bcafe\b|\bmenu\b|\border\s+online\b|\bbook\s+a\s+table\b/i, 34],
    ["healthcare", "Healthcare / clinic", /\bclinic\b|\bhospital\b|\bdoctor\b|\bdentist\b|\bappointment\b|\bpatient\b/i, 32],
    ["legal", "Law firm / legal services", /\blaw\s+firm\b|\battorney\b|\bsolicitor\b|\blawyer\b|\blegal\s+services\b/i, 32],
    ["realEstate", "Real estate", /\breal\s+estate\b|\brealtor\b|\bproperty\b|\bhomes?\s+for\s+(sale|rent)\b/i, 30],
    ["hospitality", "Hotel / hospitality", /\bhotel\b|\bresort\b|\bguesthouse\b|\baccommodation\b|\bbook\s+a\s+room\b/i, 28],
    ["education", "Education / university", /\buniversity\b|\bcollege\b|\bschool\b|\bfaculty\b|\badmissions?\b/i, 34],
    ["government", "Government / public sector", /\bgovernment\b|\bministry\b|\bpublic\s+service\b|\bmunicipality\b|\.(gov|mil)(\.|\/|$)/i, 38],
    ["media", "Media / publisher", /\bnews\b|\bnewspaper\b|\bpublisher\b|\bbreaking\s+news\b/i, 28],
    ["localService", "Local service business", /\bplumber\b|\belectrician\b|\broofing\b|\bcleaning\b|\brepair\b|\bservice\s+area\b|\bget\s+a\s+quote\b/i, 28],
  ];
  const matched = rules
    .map(([id, label, pattern, points]) => ({
      id,
      label,
      points: pattern.test(haystack) ? points : 0,
    }))
    .sort((a, b) => b.points - a.points)[0];
  const id = matched && matched.points > 0 ? matched.id : "general";
  const label = matched && matched.points > 0 ? matched.label : "General business";
  const score = id === "general" ? 46 : clamp(52 + (matched?.points || 0));
  const techCount = list(evidence.technologies).length;
  const sizeScore =
    techCount > 18 || /\benterprise|global|worldwide|investors|careers\b/i.test(haystack)
      ? 82
      : techCount > 8
        ? 62
        : 42;
  return {
    id,
    label,
    confidence: confidence(score),
    confidenceScore: Math.round(score),
    reasons: id === "general"
      ? ["No dominant industry pattern in submitted evidence."]
      : [`Backend evidence matched ${label.toLowerCase()} signals.`],
    size: {
      id: sizeScore >= 80 ? "enterprise" : sizeScore >= 60 ? "mid-market" : "small",
      label: sizeScore >= 80 ? "Enterprise" : sizeScore >= 60 ? "Mid-market" : "Small",
      confidence: confidence(sizeScore),
      reasons: [`Technology and page evidence size score: ${sizeScore}`],
    },
  };
}

function suppressionRules(evidence: AnyRecord, classification: AnyRecord) {
  const haystack = evidenceText(evidence);
  const host = text(evidence.host || evidence.url).toLowerCase();
  const reasons: string[] = [];
  if (/\.(gov|mil|edu)(\.|\/|$)|\.(gov|edu|ac)\.[a-z]{2,}$/i.test(host)) {
    reasons.push("government/education domain");
  }
  if (["government", "education", "media"].includes(classification.id)) {
    reasons.push(`${classification.label} is research-only for SMB outreach`);
  }
  if (["saas", "agency"].includes(classification.id)) {
    reasons.push(`${classification.label} needs partnership/product positioning, not generic SMB outreach`);
  }
  if (["enterprise", "large"].includes(classification.size?.id)) {
    reasons.push("large organization size estimate");
  }
  if (
    /\b(login|dashboard|account|admin|search results|directory|marketplace|platform|portal)\b/i.test(haystack)
    && !/\b(restaurant|clinic|law firm|service area|book a table|get a quote)\b/i.test(haystack)
  ) {
    reasons.push("research-only or non-owned page intent");
  }
  return {
    suppressed: reasons.length > 0,
    researchOnly: reasons.length > 0,
    reasons: unique(reasons).slice(0, 6),
  };
}

function opportunity(evidence: AnyRecord, suppression: AnyRecord) {
  if (suppression.suppressed) {
    return {
      score: 0,
      label: "Suppressed",
      pitch: "Website opportunity is suppressed until the business fit is verified.",
      factors: {},
      reasons: suppression.reasons,
    };
  }
  const seo = evidence.seo || {};
  const conversion = evidence.conversionAndTrust || {};
  const security = evidence.securityAndInfrastructure || {};
  const perf = evidence.performance || {};
  let score = 20;
  const reasons: string[] = [];
  if (Number(seo.score) > 0 && Number(seo.score) < 70) {
    score += 24;
    reasons.push(`SEO score ${seo.score}/100`);
  }
  if (Number(seo.h1Count || 0) !== 1) {
    score += 8;
    reasons.push("H1 structure needs review");
  }
  if (Number(seo.images || 0) - Number(seo.imagesWithAlt || 0) > 2) {
    score += 10;
    reasons.push("Image alt coverage gap");
  }
  if (!conversion.aboveFoldCtaCount) {
    score += 12;
    reasons.push("No above-fold CTA captured");
  }
  if (!conversion.contactPageLinks && !conversion.bookingLinks) {
    score += 10;
    reasons.push("Weak contact/booking path");
  }
  if (
    security.protocol === "http:"
    || Number(security.mixedContentResources || 0) > 0
    || Number(security.insecureForms || 0) > 0
  ) {
    score += 16;
    reasons.push("Security/trust hardening signal");
  }
  if (Number(perf.loadTimeMs || 0) > 3500 || Number(perf.largestContentfulPaintMs || 0) > 2500) {
    score += 12;
    reasons.push("Performance review signal");
  }
  const finalScore = clamp(score);
  return {
    score: finalScore,
    label: finalScore >= 70 ? "Strong" : finalScore >= 45 ? "Moderate" : "Low",
    pitch: finalScore >= 70
      ? "Strong website improvement opportunity."
      : finalScore >= 45
        ? "Moderate website improvement opportunity."
        : "Low improvement pressure from submitted evidence.",
    factors: { seoScore: seo.score ?? null, conversionSignals: conversion, securitySignals: security },
    reasons: unique(reasons).slice(0, 6),
  };
}

function readiness(evidence: AnyRecord, suppression: AnyRecord, opp: AnyRecord) {
  if (suppression.suppressed) {
    return {
      score: 0,
      label: "Not ready",
      fit: "Research only",
      reasons: suppression.reasons.map((reason: string) => `- ${reason}`),
    };
  }
  const contacts = evidence.contacts || {};
  let score = 0;
  const reasons: string[] = [];
  if (Number(contacts.directEmailCount || 0) > 0) {
    score += 35;
    reasons.push("+ direct email evidence");
  } else if (Number(contacts.emailCount || 0) > 0) {
    score += 15;
    reasons.push("+ email evidence needs review");
  }
  if (Number(contacts.phoneCount || 0) > 0 || Number(contacts.socialCount || 0) > 0) {
    score += 20;
    reasons.push("+ alternate contact channel evidence");
  }
  if (opp.score >= 45) {
    score += 30;
    reasons.push("+ website opportunity evidence");
  }
  if (evidence.scanStatus && !/blocked|failed|timeout/i.test(text(evidence.scanStatus))) {
    score += 15;
    reasons.push("+ usable scan status");
  }
  const finalScore = clamp(score);
  return {
    score: finalScore,
    label: finalScore >= 75 ? "Ready" : finalScore >= 50 ? "Needs review" : "Not ready",
    fit: finalScore >= 75 ? "Ready for reviewed outreach" : "Manual review first",
    reasons,
  };
}

function angles(classification: AnyRecord, suppression: AnyRecord, opp: AnyRecord) {
  if (suppression.suppressed) {
    return [
      {
        id: "research-only",
        title: "Research-only / suppressed",
        reason: "Backend suppression rules blocked generic outreach.",
        evidence: suppression.reasons,
        confidence: "High",
        direction: "Keep for research or manual qualification only.",
        score: 100,
      },
    ];
  }
  const items: AnyRecord[] = [];
  if (opp.reasons?.some((reason: string) => /seo/i.test(reason))) {
    items.push({
      id: "seo",
      title: "SEO and search presentation",
      reason: "Backend evidence shows SEO improvement signals.",
      evidence: opp.reasons,
      confidence: "Medium",
      direction: "Offer a concise SEO and search-snippet audit.",
      score: 88,
    });
  }
  if (opp.reasons?.some((reason: string) => /CTA|contact|booking/i.test(reason))) {
    items.push({
      id: "conversion",
      title: "Conversion path improvement",
      reason: "Backend evidence shows a contact, booking, or CTA gap.",
      evidence: opp.reasons,
      confidence: "Medium",
      direction: "Discuss clearer enquiry, booking, quote, or contact paths.",
      score: 82,
    });
  }
  if (opp.reasons?.some((reason: string) => /Security/i.test(reason))) {
    items.push({
      id: "security",
      title: "Security and trust hardening",
      reason: "Backend evidence shows trust or transport hardening signals.",
      evidence: opp.reasons,
      confidence: "Medium",
      direction: "Offer HTTPS, headers, mixed-content, and form hardening review.",
      score: 78,
    });
  }
  if (!items.length) {
    items.push({
      id: "website-audit",
      title: "Evidence-backed website review",
      reason: "Backend evidence supports a careful website review angle.",
      evidence: classification.reasons || [],
      confidence: classification.confidence || "Low",
      direction: "Use a soft audit offer tied to verified page evidence.",
      score: 50,
    });
  }
  return items.slice(0, 5);
}

export function generateBackendBusinessIntelligence(evidence: AnyRecord = {}, meta: AnyRecord = {}) {
  const normalized = {
    ...evidence,
    url: evidence.url || meta.websiteUrl || "",
    host: evidence.host || "",
  };
  const classification = classify(normalized);
  const suppression = suppressionRules(normalized, classification);
  const websiteOpportunity = opportunity(normalized, suppression);
  const outreachReadiness = readiness(normalized, suppression, websiteOpportunity);
  const outreachAngles = angles(classification, suppression, websiteOpportunity);
  const eligibility = suppression.suppressed
    ? {
      status: "manual_review",
      entityType: "research-only",
      label: "Research Only",
      reason: suppression.reasons[0] || "Backend suppression rule matched.",
      reasons: suppression.reasons,
      excluded: false,
      suppressed: true,
    }
    : {
      status: "eligible",
      entityType: "smb-prospect",
      label: "Eligible prospect",
      reason: "Backend evidence supports reviewed lead scoring.",
      reasons: ["Backend evidence passed suppression checks."],
      excluded: false,
      suppressed: false,
    };
  const verdict = suppression.suppressed
    ? {
      excluded: false,
      status: "manual_review",
      label: "Research only",
      reason: suppression.reasons[0] || "Manual qualification required.",
    }
    : websiteOpportunity.score >= 65 && outreachReadiness.score >= 60
      ? {
        excluded: false,
        status: "eligible",
        label: "Outreach-ready opportunity",
        reason: "Backend opportunity and contact-readiness signals are both usable.",
      }
      : {
        excluded: false,
        status: "review",
        label: "Review before contact",
        reason: "Backend intelligence requires manual review before outreach.",
      };
  return {
    source: "backend_generated",
    authority: "backend",
    final: true,
    version: VERSION,
    generatedAt: new Date().toISOString(),
    classification,
    eligibility,
    verdict,
    outreachReadiness,
    websiteOpportunity,
    outreachAngles,
    confidenceLabels: {
      classification: classification.confidence,
      outreachReadiness: confidence(outreachReadiness.score),
      websiteOpportunity: confidence(websiteOpportunity.score),
      evidence: confidence(Math.max(classification.confidenceScore || 0, outreachReadiness.score || 0)),
    },
    suppression,
  };
}
