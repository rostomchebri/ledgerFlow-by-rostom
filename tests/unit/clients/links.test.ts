import { describe, expect, it } from "vitest";

import { buildClientsHref, hasActiveClientFilters } from "@/lib/clients/links";

describe("buildClientsHref", () => {
  it("returns the bare list URL for defaults", () => {
    expect(buildClientsHref({})).toBe("/clients");
    expect(
      buildClientsHref({
        q: "  ",
        status: "active",
        type: "all",
        sort: "name-asc",
        page: 1,
        pageSize: 20,
      }),
    ).toBe("/clients");
  });

  it("preserves active filters", () => {
    expect(
      buildClientsHref({
        q: "atlas",
        status: "archived",
        type: "company",
        sort: "updated-desc",
        page: 2,
        pageSize: 50,
      }),
    ).toBe("/clients?q=atlas&status=archived&type=company&sort=updated-desc&page=2&pageSize=50");
  });

  it("applies overrides and drops reset values", () => {
    expect(buildClientsHref({ q: "atlas", page: 3 }, { page: 1 })).toBe("/clients?q=atlas");
  });
});

describe("hasActiveClientFilters", () => {
  it("is false for defaults", () => {
    expect(hasActiveClientFilters({ status: "active", type: "all", sort: "name-asc" })).toBe(false);
  });

  it("detects search, status, type and sort changes", () => {
    expect(hasActiveClientFilters({ q: "atlas" })).toBe(true);
    expect(hasActiveClientFilters({ status: "archived" })).toBe(true);
    expect(hasActiveClientFilters({ type: "individual" })).toBe(true);
    expect(hasActiveClientFilters({ sort: "name-desc" })).toBe(true);
  });
});
