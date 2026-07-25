import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260725184500_plan_aware_scan_quota.sql", "utf8");
const authorize = readFileSync("src/routes/api/public/scan/authorize.ts", "utf8");
const batch = readFileSync("src/routes/api/public/scan/batch.ts", "utf8");

describe("plan-aware scan quota contract", () => {
  it("resolves quota limits inside the database with free fallback and override support", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_effective_scan_limits");
    expect(migration).toContain("public.user_quota_overrides");
    expect(migration).toContain("ELSE v_free_daily");
    expect(migration).toContain("fallback_free");
  });

  it("keeps consume_scan_quota authoritative and service-role only", () => {
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.consume_scan_quota");
    expect(migration).toContain("PERFORM pg_advisory_xact_lock");
    expect(migration).toContain("v_duplicate := TRUE");
    expect(migration).toContain("v_daily_limit IS NOT NULL AND v_daily_used >= v_daily_limit");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.consume_scan_quota");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.consume_scan_quota");
    expect(migration).toContain("TO service_role");
  });

  it("does not let API endpoints provide the authoritative scan limit", () => {
    expect(authorize).toContain('admin.rpc("consume_scan_quota"');
    expect(authorize).toContain("_limit: null");
    expect(authorize).toContain("You've reached today's scan limit");
    expect(batch).toContain('admin.rpc("consume_scan_quota"');
    expect(batch).toContain("quotaBlocked = true");
    expect(batch).toContain("nonCountableStatuses");
  });
});
