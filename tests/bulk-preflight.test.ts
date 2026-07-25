import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const contacts = readFileSync("extension/js/contacts.js", "utf8");
const contentScript = readFileSync("extension/js/content.js", "utf8");
const driver = readFileSync("extension/js/driver.js", "utf8");
const gate = readFileSync("extension/js/apikey-gate.js", "utf8");
const preflight = readFileSync("src/routes/api/public/scan/preflight.ts", "utf8");
const batch = readFileSync("src/routes/api/public/scan/batch.ts", "utf8");

describe("bulk preflight before evidence collection", () => {
  it("authorizes the bulk queue once before opening scan tabs", () => {
    const preflightIndex = contacts.indexOf("const preflight = await Contacts.authorizeBulkQueue()");
    const captureIndex = contacts.indexOf("await Contacts.captureBulkOriginalTab()");
    const tabOpenIndex = contacts.indexOf("chrome.tabs.create({ active: false, url }");
    expect(preflightIndex).toBeGreaterThan(-1);
    expect(captureIndex).toBeGreaterThan(preflightIndex);
    expect(tabOpenIndex).toBeGreaterThan(captureIndex);
    expect(contacts).toContain("sendMessage('contacts.js', 'preflightPageScans', [queued])");
    expect(driver).toContain("async preflightPageScans(urls = [])");
    expect(driver).toContain("const preflight = await self.LeadLensGate.preflight(requests)");
  });

  it("does not run one preflight per bulk URL in the pump", () => {
    const pump = contacts.slice(contacts.indexOf("async bulkPump()"), contacts.indexOf("async captureBulkOriginalTab()"));
    expect(pump).not.toContain("preflightPageScans");
    expect(pump).not.toContain("LeadLensGate.preflight");
    expect(pump).toContain("Contacts.bulkAuthorizations.get(url)");
    expect(pump).toContain("[url, 'bulk', authorization]");
  });

  it("blocks backend-preflight failure before evidence collection", () => {
    const start = contacts.slice(contacts.indexOf("async startBulkImport()"), contacts.indexOf("async authorizeBulkQueue()"));
    expect(start).toContain("if (!preflight.ok)");
    expect(start).toContain("Bulk scan authorization failed before any website was opened");
    expect(start).toContain("return");
  });

  it("quota zero and limited remaining quota return blocked URL rows", () => {
    expect(preflight).toContain("allowed_count: 0");
    expect(preflight).toContain("results: requests.map");
    expect(preflight).toContain('reason: "quota_blocked"');
    expect(preflight).toContain("const allowedCount = limit == null ? requests.length : Math.min(requests.length, remaining ?? 0)");
    expect(preflight).toContain("results.filter((x) => x.allowed).length >= allowedCount");
  });

  it("quota-blocked URLs are removed from the scan queue and never opened", () => {
    expect(contacts).toContain("Contacts.bulkQueue = allowed");
    expect(contacts).toContain("Contacts.recordBulkResult(url, reason");
    expect(contacts).toContain("'quota-blocked'");
    expect(contacts).toContain("Missing bulk scan authorization token");
  });

  it("bulk tokens are passed through content scan without another backend preflight", () => {
    expect(contentScript).toContain("async startLeadLensScan(source = 'manual', authorization = null)");
    expect(contentScript).toContain("Content.driver('beginPageScan', [location.href, source, authorization])");
    expect(driver).toContain("if (!serverAuthorization?.scan_token)");
    expect(driver).toContain("self.LeadLensGate.preflight([{ website_url: draftContext.url");
  });

  it("the preflight helper sends all prepared bulk requests, not only the first 50", () => {
    expect(gate).toContain("const payload = requests.map");
    expect(gate).not.toContain("requests.slice(0, 50).map");
    expect(preflight).toContain("MAX_PREFLIGHT_REQUESTS = 500");
  });

  it("quota_blocked result submissions are non-countable", () => {
    expect(batch).toContain('"quota_blocked"');
    expect(batch).toContain("nonCountableStatuses.has(status)");
    expect(batch).toContain("counted: false");
  });
});
