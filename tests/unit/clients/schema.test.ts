import { describe, expect, it } from "vitest";

import {
  clientInputSchema,
  clientUpdateSchema,
  fieldErrorsFromZod,
  parseClientListQuery,
} from "@/lib/clients/schema";

describe("clientInputSchema", () => {
  it("applies defaults and trims text", () => {
    const parsed = clientInputSchema.parse({ name: "  Atlas Consulting  " });

    expect(parsed).toMatchObject({
      type: "COMPANY",
      name: "Atlas Consulting",
      country: "DZ",
    });
  });

  it("converts blank optional fields to undefined", () => {
    const parsed = clientInputSchema.parse({
      name: "Atlas",
      contactName: "   ",
      email: "",
      phone: "",
      notes: "",
    });

    expect(parsed.contactName).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("requires a non-empty name", () => {
    const result = clientInputSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["name"]);
    }
  });

  it("rejects invalid emails", () => {
    const result = clientInputSchema.safeParse({ name: "Atlas", email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "email")).toBe(true);
    }
  });

  it("normalises the country code to uppercase", () => {
    const parsed = clientInputSchema.parse({ name: "Atlas", country: "dz" });
    expect(parsed.country).toBe("DZ");
  });

  it("rejects unknown fields", () => {
    const result = clientInputSchema.safeParse({ name: "Atlas", unexpected: "value" });
    expect(result.success).toBe(false);
  });
});

describe("clientUpdateSchema", () => {
  it("accepts a partial payload without applying create defaults", () => {
    const parsed = clientUpdateSchema.parse({ city: "Alger" });

    expect(parsed).toEqual({ city: "Alger" });
    expect(parsed.type).toBeUndefined();
  });

  it("rejects an empty payload", () => {
    const result = clientUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("parseClientListQuery", () => {
  it("falls back to safe defaults", () => {
    expect(parseClientListQuery({})).toEqual({
      q: "",
      status: "active",
      type: "all",
      sort: "name-asc",
      page: 1,
      pageSize: 20,
    });
  });

  it("coerces and clamps numeric values", () => {
    const query = parseClientListQuery({
      q: "  atlas  ",
      status: "archived",
      type: "company",
      sort: "updated-desc",
      page: "3",
      pageSize: "50",
    });

    expect(query).toMatchObject({
      q: "atlas",
      status: "archived",
      type: "company",
      sort: "updated-desc",
      page: 3,
      pageSize: 50,
    });
  });

  it("replaces invalid values with defaults instead of throwing", () => {
    const query = parseClientListQuery({
      status: "bogus",
      type: "bogus",
      sort: "bogus",
      page: "0",
      pageSize: "999",
    });

    expect(query).toMatchObject({
      status: "active",
      type: "all",
      sort: "name-asc",
      page: 1,
      pageSize: 20,
    });
  });

  it("uses the first value when Next.js provides arrays", () => {
    const query = parseClientListQuery({ page: ["2", "9"], q: ["atlas", "other"] });

    expect(query.page).toBe(2);
    expect(query.q).toBe("atlas");
  });

  it("reads URLSearchParams", () => {
    const query = parseClientListQuery(new URLSearchParams("q=nour&status=all&page=2"));

    expect(query).toMatchObject({ q: "nour", status: "all", page: 2 });
  });
});

describe("fieldErrorsFromZod", () => {
  it("keeps the first message per field", () => {
    const result = clientInputSchema.safeParse({ name: "", email: "nope" });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(errors.name).toBeTruthy();
      expect(errors.email).toBeTruthy();
    }
  });
});
