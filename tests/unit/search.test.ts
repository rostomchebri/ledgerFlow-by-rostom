import { describe, expect, it } from "vitest";

import {
  EMPTY_SEARCH_RESULTS,
  normalizeSearchTerm,
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
} from "@/lib/search";

describe("normalizeSearchTerm", () => {
  it("rejects empty and whitespace-only input", () => {
    expect(normalizeSearchTerm(undefined)).toBeNull();
    expect(normalizeSearchTerm(null)).toBeNull();
    expect(normalizeSearchTerm("   ")).toBeNull();
  });

  it("rejects terms shorter than the minimum", () => {
    expect(normalizeSearchTerm("a")).toBeNull();
    expect(normalizeSearchTerm(" a ")).toBeNull();
  });

  it("keeps a term at the minimum length", () => {
    expect(normalizeSearchTerm("ab")).toBe("ab");
    expect(normalizeSearchTerm(" ab ")).toBe("ab");
  });

  it("trims and bounds long terms", () => {
    const long = "x".repeat(SEARCH_MAX_LENGTH + 40);
    expect(normalizeSearchTerm(long)).toHaveLength(SEARCH_MAX_LENGTH);
  });

  it("exposes an empty result set with every group", () => {
    expect(EMPTY_SEARCH_RESULTS).toEqual({
      clients: [],
      invoices: [],
      transactions: [],
      tasks: [],
    });
    expect(SEARCH_MIN_LENGTH).toBeLessThan(SEARCH_MAX_LENGTH);
  });
});
