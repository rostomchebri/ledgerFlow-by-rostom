import { describe, expect, it } from "vitest";

import {
  assertSameTenant,
  firmScopedWhere,
  isSameTenant,
  TenantIsolationError,
} from "@/lib/tenancy";

/**
 * FIRM-05 cross-tenant harness: two firms, one resource each. Every helper is
 * exercised from both sides so a regression that drops the firm filter fails
 * here instead of leaking data in production.
 */
const firmA = { firmId: "firm_a" };
const firmB = { firmId: "firm_b" };

const clientA = { id: "client_1", firmId: "firm_a", name: "Atlas" };
const clientB = { id: "client_2", firmId: "firm_b", name: "Nour" };

describe("tenant isolation", () => {
  it("accepts resources from the same firm", () => {
    expect(isSameTenant(firmA, clientA)).toBe(true);
    expect(() => assertSameTenant(firmA, clientA)).not.toThrow();
  });

  it("rejects a resource from another firm", () => {
    expect(isSameTenant(firmA, clientB)).toBe(false);
    expect(() => assertSameTenant(firmA, clientB)).toThrow(TenantIsolationError);
  });

  it("treats missing resources as a tenant violation", () => {
    expect(isSameTenant(firmA, null)).toBe(false);
    expect(() => assertSameTenant(firmA, undefined)).toThrow(TenantIsolationError);
  });

  it("always overwrites a caller-supplied firmId", () => {
    const where = firmScopedWhere("firm_a", { firmId: "firm_b", status: "ACTIVE" });

    expect(where).toEqual({ firmId: "firm_a", status: "ACTIVE" });
  });

  it("produces disjoint queries for two firms", () => {
    const whereA = firmScopedWhere(firmA.firmId, { status: "ACTIVE" });
    const whereB = firmScopedWhere(firmB.firmId, { status: "ACTIVE" });

    expect(whereA.firmId).not.toBe(whereB.firmId);
  });
});
