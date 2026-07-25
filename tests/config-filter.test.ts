import { describe, it, expect } from "vitest";

// Whitelist copied from src/routes/api/public/config.ts. Any drift means the
// extension could either miss config or receive keys it shouldn't — this
// test is the guard.
const PUBLIC_KEYS = [
  "free_tier_enabled",
  "free_daily_limit",
  "scan_disabled",
  "remote_config_ttl_minutes",
  "batch_max_events",
  "session_ttl_hint_minutes",
  "notice",
] as const;

function filterConfig(rows: Array<{ key: string; value: unknown }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if ((PUBLIC_KEYS as readonly string[]).includes(row.key)) out[row.key] = row.value;
  }
  return out;
}

describe("config filter", () => {
  it("passes through whitelisted keys", () => {
    const out = filterConfig([
      { key: "free_daily_limit", value: 100 },
      { key: "scan_disabled", value: false },
    ]);
    expect(out).toEqual({ free_daily_limit: 100, scan_disabled: false });
  });

  it("drops secret / admin-only keys", () => {
    const out = filterConfig([
      { key: "stripe_secret_key", value: "sk_live_XXX" },
      { key: "admin_notes", value: "internal" },
      { key: "free_tier_enabled", value: true },
    ]);
    expect(out).toEqual({ free_tier_enabled: true });
    expect(out).not.toHaveProperty("stripe_secret_key");
    expect(out).not.toHaveProperty("admin_notes");
  });

  it("returns empty when no whitelisted keys present", () => {
    expect(filterConfig([{ key: "random", value: 1 }])).toEqual({});
  });
});
