import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const extensionDir = join(root, "extension");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return [full];
  });
}

const extensionFiles = files(extensionDir);
const codeFiles = extensionFiles.filter((file) => /\.(js|json|html|css)$/i.test(file));
const codeText = codeFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const manifest = JSON.parse(readFileSync(join(extensionDir, "manifest.json"), "utf8"));
const content = readFileSync(join(extensionDir, "js", "content.js"), "utf8");

describe("extension package security audit", () => {
  it("does not include env files, source maps, or private signing keys", () => {
    const bad = extensionFiles
      .map((file) => relative(extensionDir, file).split(sep).join("/"))
      .filter((name) => /(^|\/)\.env(?:\.development)?$|\.map$|\.(pem|key|p12|pfx)$/i.test(name));

    expect(bad).toEqual([]);
  });

  it("does not include backend/admin/provider secrets in extension code", () => {
    expect(codeText).not.toMatch(/service[_-]?role|SUPABASE_SERVICE|admin[_-]?secret|admin[_-]?token|PRIVATE KEY/i);
    expect(codeText).not.toMatch(/OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|sk-proj|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}/);
  });

  it("does not read/export browser cookie values", () => {
    expect(codeText).not.toContain("document.cookie");
    expect(codeText).not.toContain("chrome.cookies");
    expect(codeText).not.toContain("getAll");
    expect(content).toContain("const cookies = {}");
    expect(manifest.permissions || []).not.toContain("cookies");
  });

  it("does not load remote executable code", () => {
    expect(codeText).not.toMatch(/eval\(|new Function\(|import\(["']https?:|importScripts\(["']https?:|script\.src\s*=\s*["']https?:/);
    expect(manifest.content_security_policy.extension_pages).toContain("script-src 'self'");
  });

  it("keeps cookie auto-accept bounded to one click per explicit scan", () => {
    expect(content).toContain("Run a user-requested page scan");
    expect(content).toContain("Content.cookieAutoAcceptClicked = false");
    expect(content).toContain("already-clicked-this-scan");
    expect(content).toContain("SENSITIVE_PATH_RE");
    expect(content).toContain("rejectPattern");
    expect(content).toContain("acceptPattern");
  });

  it("keeps manifest permissions free of unnecessary privileged cookie access", () => {
    expect(manifest.permissions).toEqual(expect.arrayContaining(["storage", "tabs", "scripting", "webRequest"]));
    expect(manifest.permissions).not.toEqual(expect.arrayContaining(["cookies", "history", "bookmarks", "downloads", "debugger"]));
  });
});
