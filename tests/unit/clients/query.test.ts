import { describe, expect, it } from "vitest";

import { buildClientOrderBy, buildClientWhere } from "@/lib/clients/query";

describe("buildClientWhere", () => {
  it("always scopes the query to the firm", () => {
    const where = buildClientWhere("firm_1", { q: "", status: "all", type: "all" });
    expect(where.firmId).toBe("firm_1");
  });

  it("maps status and type filters", () => {
    const where = buildClientWhere("firm_1", {
      q: "",
      status: "active",
      type: "company",
    });

    expect(where.status).toBe("ACTIVE");
    expect(where.type).toBe("COMPANY");
  });

  it("omits filters set to all", () => {
    const where = buildClientWhere("firm_1", { q: "", status: "all", type: "all" });

    expect(where).not.toHaveProperty("status");
    expect(where).not.toHaveProperty("type");
    expect(where).not.toHaveProperty("OR");
  });

  it("builds a case-insensitive search across identifying fields", () => {
    const where = buildClientWhere("firm_1", { q: "  atlas ", status: "active", type: "all" });

    expect(where.OR).toHaveLength(7);
    expect(where.OR).toContainEqual({ name: { contains: "atlas", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ email: { contains: "atlas", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ taxId: { contains: "atlas", mode: "insensitive" } });
  });
});

describe("buildClientOrderBy", () => {
  it("always adds a stable id tie-breaker", () => {
    for (const sort of [
      "name-asc",
      "name-desc",
      "created-desc",
      "created-asc",
      "updated-desc",
    ] as const) {
      const orderBy = buildClientOrderBy(sort);
      expect(orderBy.at(-1)).toEqual({ id: "asc" });
    }
  });

  it("maps each sort option", () => {
    expect(buildClientOrderBy("name-asc")[0]).toEqual({ name: "asc" });
    expect(buildClientOrderBy("name-desc")[0]).toEqual({ name: "desc" });
    expect(buildClientOrderBy("created-asc")[0]).toEqual({ createdAt: "asc" });
    expect(buildClientOrderBy("created-desc")[0]).toEqual({ createdAt: "desc" });
    expect(buildClientOrderBy("updated-desc")[0]).toEqual({ updatedAt: "desc" });
  });
});
