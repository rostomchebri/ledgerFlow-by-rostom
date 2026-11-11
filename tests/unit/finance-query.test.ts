import { describe, expect, it } from "vitest";

import {
  buildTransactionOrderBy,
  formatDateInput,
  parseDateBoundary,
  parseTransactionQuery,
} from "@/lib/finance/query";
import { parseInvoiceListFilters } from "@/lib/invoices/schema";

describe("parseTransactionQuery", () => {
  it("applies safe defaults", () => {
    const query = parseTransactionQuery({});

    expect(query).toMatchObject({
      q: "",
      type: "ALL",
      category: "ALL",
      sort: "date-desc",
      page: 1,
    });
    expect(query.from).toBeUndefined();
    expect(query.to).toBeUndefined();
  });

  it("normalizes type, category and sort filters", () => {
    const query = parseTransactionQuery({
      type: "income",
      category: "software",
      sort: "amount-asc",
    });

    expect(query.type).toBe("INCOME");
    expect(query.category).toBe("SOFTWARE");
    expect(query.sort).toBe("amount-asc");
  });

  it("falls back when a filter value is unknown", () => {
    const query = parseTransactionQuery({
      type: "transfer",
      category: "unknown",
      sort: "sideways",
    });

    expect(query.type).toBe("ALL");
    expect(query.category).toBe("ALL");
    expect(query.sort).toBe("date-desc");
  });

  it("parses inclusive date boundaries", () => {
    const query = parseTransactionQuery({ from: "2026-01-05", to: "2026-01-20" });

    expect(query.from).toBeDefined();
    expect(query.to).toBeDefined();
    expect(query.from?.getFullYear()).toBe(2026);
    expect(query.from?.getMonth()).toBe(0);
    expect(query.from?.getDate()).toBe(5);
    expect(query.from?.getHours()).toBe(0);
    expect(query.to?.getHours()).toBe(23);
    expect(query.to?.getMinutes()).toBe(59);
  });

  it("drops a reversed date range instead of returning nothing", () => {
    const query = parseTransactionQuery({ from: "2026-02-10", to: "2026-02-01" });

    expect(query.from).toBeUndefined();
    expect(query.to).toBeUndefined();
  });

  it("ignores malformed dates", () => {
    const query = parseTransactionQuery({ from: "not-a-date", to: "2026-13-45" });

    expect(query.from).toBeUndefined();
    expect(query.to).toBeUndefined();
  });

  it("clamps the page and bounds the search text", () => {
    expect(parseTransactionQuery({ page: "0" }).page).toBe(1);
    expect(parseTransactionQuery({ page: "nope" }).page).toBe(1);
    expect(parseTransactionQuery({ page: "3" }).page).toBe(3);
    expect(parseTransactionQuery({ q: "  hello  " }).q).toBe("hello");
    expect(parseTransactionQuery({ q: "x".repeat(200) }).q).toHaveLength(120);
  });

  it("reads the first value when a parameter repeats", () => {
    const query = parseTransactionQuery({ type: ["INCOME", "EXPENSE"], page: ["2", "9"] });

    expect(query.type).toBe("INCOME");
    expect(query.page).toBe(2);
  });
});

describe("date helpers", () => {
  it("round-trips a calendar date", () => {
    expect(formatDateInput(parseDateBoundary("2026-07-04"))).toBe("2026-07-04");
    expect(formatDateInput(undefined)).toBe("");
  });

  it("returns undefined for an empty value", () => {
    expect(parseDateBoundary(undefined)).toBeUndefined();
    expect(parseDateBoundary("")).toBeUndefined();
  });
});

describe("buildTransactionOrderBy", () => {
  it("always includes a deterministic tie-breaker", () => {
    for (const sort of ["date-desc", "date-asc", "amount-desc", "amount-asc"] as const) {
      const orderBy = buildTransactionOrderBy(sort);
      expect(orderBy.at(-1)).toEqual({ id: "asc" });
    }
  });

  it("sorts by the requested field", () => {
    expect(buildTransactionOrderBy("date-asc")[0]).toEqual({ occurredAt: "asc" });
    expect(buildTransactionOrderBy("amount-desc")[0]).toEqual({ amount: "desc" });
    expect(buildTransactionOrderBy("amount-asc")[0]).toEqual({ amount: "asc" });
  });
});

describe("parseInvoiceListFilters", () => {
  it("applies safe defaults", () => {
    const query = parseInvoiceListFilters({});

    expect(query).toMatchObject({
      q: "",
      status: "ALL",
      clientId: "",
      sort: "issue-desc",
      page: 1,
    });
  });

  it("normalizes status and sort", () => {
    const query = parseInvoiceListFilters({ status: "paid", sort: "due-asc" });

    expect(query.status).toBe("PAID");
    expect(query.sort).toBe("due-asc");
  });

  it("drops reversed date ranges", () => {
    const query = parseInvoiceListFilters({ from: "2026-05-10", to: "2026-05-01" });

    expect(query.from).toBeUndefined();
    expect(query.to).toBeUndefined();
  });

  it("bounds client ids and search text", () => {
    expect(parseInvoiceListFilters({ clientId: "c".repeat(120) }).clientId).toHaveLength(64);
    expect(parseInvoiceListFilters({ q: "x".repeat(200) }).q).toHaveLength(120);
  });
});
