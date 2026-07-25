import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { generateBackendBusinessIntelligence } from "../src/lib/server-intelligence";

const batch = readFileSync("src/routes/api/public/scan/batch.ts", "utf8");
const queue = readFileSync("extension/js/scan-queue.js", "utf8");
const gate = readFileSync("extension/js/apikey-gate.js", "utf8");
const driver = readFileSync("extension/js/driver.js", "utf8");
const contacts = readFileSync("extension/js/contacts.js", "utf8");
const runtime = readFileSync("extension/js/intelligence-runtime.js", "utf8");

describe("backend business intelligence authority", () => {
  it("backend generator returns final intelligence contract", () => {
    const intelligence = generateBackendBusinessIntelligence({
      url: "https://example-restaurant.test/",
      host: "example-restaurant.test",
      pageTitle: "Example Restaurant - menu and reservations",
      scanStatus: "scanned",
      contacts: { emailCount: 1, directEmailCount: 1, socialCount: 1, phoneCount: 1 },
      technologies: [{ name: "WordPress", categories: ["CMS"] }],
      page: { description: "Restaurant menu, table reservation and catering", schemaTypes: ["Restaurant", "LocalBusiness"] },
      seo: { score: 58, h1Count: 0, images: 10, imagesWithAlt: 3 },
      conversionAndTrust: { aboveFoldCtaCount: 0, contactPageLinks: 1, bookingLinks: 0 },
      text: { preview: "restaurant cafe menu order online book a table" },
    });

    expect(intelligence.source).toBe("backend_generated");
    expect(intelligence.authority).toBe("backend");
    expect(intelligence.final).toBe(true);
    expect(intelligence.classification).toHaveProperty("id");
    expect(intelligence.eligibility).toHaveProperty("status");
    expect(intelligence.verdict).toHaveProperty("label");
    expect(intelligence.outreachReadiness).toHaveProperty("score");
    expect(intelligence.websiteOpportunity).toHaveProperty("score");
    expect(Array.isArray(intelligence.outreachAngles)).toBe(true);
    expect(intelligence.confidenceLabels).toHaveProperty("classification");
    expect(intelligence.suppression).toHaveProperty("researchOnly");
  });

  it("batch endpoint returns backend-generated intelligence on successful countable rows", () => {
    expect(batch).toContain("generateBackendBusinessIntelligence");
    expect(batch).toContain("evidence: z.record(z.any()).optional()");
    expect(batch).toContain('intelligenceStatus = "backend_generated"');
    expect(batch).toContain("intelligence_status: intelligenceStatus");
    expect(batch).toContain("website_url: ev.website_url");
  });

  it("extension sends normalized evidence through existing chunked batch flow", () => {
    expect(queue).toContain("collectBackendIntelligenceEvidence(ctx)");
    expect(queue).toContain("evidence,");
    expect(queue).toContain("evidence: it.evidence");
    expect(gate).toContain("out.evidence = e.evidence");
    expect(gate).toContain("/api/public/scan/batch");
    expect(gate).not.toContain("/api/public/scan/intelligence");
  });

  it("extension stores backend intelligence returned by batch", () => {
    expect(queue).toContain("row.intelligence_status === 'backend_generated'");
    expect(queue).toContain("applyBackendIntelligence(item.website_url, row.intelligence, 'backend_generated')");
    expect(driver).toContain("businessIntelligence: status === 'backend_generated' && intelligence ? intelligence : null");
    expect(driver).toContain("intelligenceStatus: status === 'backend_generated' ? 'backend_generated' : 'pending_backend'");
  });

  it("backend failure or missing backend intelligence marks pending_backend", () => {
    expect(queue).toContain("applyBackendIntelligence(ctx.url, null, 'pending_backend')");
    expect(queue).toContain("applyBackendIntelligence(item.website_url, null, 'pending_backend')");
    expect(batch).toContain('intelligenceStatus: "backend_generated" | "pending_backend" = "pending_backend"');
    expect(contacts).toContain("status: 'pending_backend'");
    expect(contacts).toContain("Final verdict must come from backend");
    expect(contacts).toContain("angle: 'Pending backend intelligence'");
    expect(contacts).toContain("outreachAngles: []");
    expect(contacts).toContain("provider: 'LeadLens backend pending'");
  });

  it("extension does not treat local runtime intelligence as final authority", () => {
    expect(contacts).toContain("backendIntelligence(site = {})");
    expect(contacts).toContain("return 'local_fallback'");
    expect(contacts).toContain("final: false");
    expect(contacts).toContain("provider: 'LeadLens local fallback'");
    expect(contacts).not.toContain("source of truth. Model-style candidates never overwrite captured facts.");
    expect(runtime).toContain("classifyBusiness");
  });
});

