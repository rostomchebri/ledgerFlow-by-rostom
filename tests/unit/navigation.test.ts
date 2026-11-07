import { describe, expect, it } from "vitest";

import {
  findActiveNavItem,
  getMobileActiveKey,
  isActivePath,
  MOBILE_OVERFLOW_ITEMS,
  MOBILE_PRIMARY_ITEMS,
  NAV_ITEMS,
} from "@/lib/navigation";

describe("navigation config", () => {
  it("keeps every destination unique", () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    const hrefs = NAV_ITEMS.map((item) => item.href);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps the documented destination order", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dashboard",
      "/transactions",
      "/reports",
      "/invoices",
      "/clients",
      "/documents",
      "/tasks",
      "/notifications",
      "/settings",
    ]);
  });

  it("matches exact and nested routes", () => {
    expect(isActivePath("/dashboard", "/dashboard")).toBe(true);
    expect(isActivePath("/clients/42/edit", "/clients")).toBe(true);
    expect(isActivePath("/clients-archive", "/clients")).toBe(false);
    expect(isActivePath("/settings/audit", "/settings")).toBe(true);
    expect(isActivePath(null, "/dashboard")).toBe(false);
  });

  it("resolves the active destination", () => {
    expect(findActiveNavItem("/invoices/2026-018")?.key).toBe("invoices");
    expect(findActiveNavItem("/unknown")).toBeUndefined();
  });

  it("partitions mobile primary and overflow destinations without gaps", () => {
    const mobile = [...MOBILE_PRIMARY_ITEMS, ...MOBILE_OVERFLOW_ITEMS];
    const hrefs = mobile.map((item) => item.href).sort();

    expect(mobile).toHaveLength(NAV_ITEMS.length);
    expect(hrefs).toEqual(NAV_ITEMS.map((item) => item.href).sort());
    expect(MOBILE_PRIMARY_ITEMS).toHaveLength(4);
  });

  it("highlights More for overflow routes", () => {
    expect(getMobileActiveKey("/dashboard")).toBe("dashboard");
    expect(getMobileActiveKey("/clients/42")).toBe("clients");
    expect(getMobileActiveKey("/reports")).toBe("more");
    expect(getMobileActiveKey("/settings/audit")).toBe("more");
    expect(getMobileActiveKey("/unknown")).toBe("more");
  });
});
