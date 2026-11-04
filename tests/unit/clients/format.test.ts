import { describe, expect, it } from "vitest";

import {
  clientInitials,
  clientReference,
  formatClientAddress,
  formatDate,
} from "@/lib/clients/format";

describe("clientInitials", () => {
  it("uses the first letters of the first two words", () => {
    expect(clientInitials("Atlas Consulting SARL")).toBe("AC");
  });

  it("handles a single word", () => {
    expect(clientInitials("Nour")).toBe("N");
  });

  it("falls back for blank names", () => {
    expect(clientInitials("   ")).toBe("?");
  });
});

describe("formatClientAddress", () => {
  it("joins the parts that are present", () => {
    expect(
      formatClientAddress({
        addressLine1: "12 rue Didouche Mourad",
        addressLine2: null,
        postalCode: "16000",
        city: "Alger",
        country: "DZ",
      }),
    ).toBe("12 rue Didouche Mourad, 16000 Alger, DZ");
  });

  it("ignores blank parts", () => {
    expect(
      formatClientAddress({
        addressLine1: "  ",
        addressLine2: null,
        postalCode: null,
        city: "Oran",
        country: "",
      }),
    ).toBe("Oran");
  });

  it("returns an empty string when nothing is known", () => {
    expect(
      formatClientAddress({
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        country: "",
      }),
    ).toBe("");
  });
});

describe("formatDate", () => {
  it("formats a date", () => {
    expect(formatDate(new Date("2026-11-01T12:00:00Z"))).toBe("01 Nov 2026");
  });

  it("handles missing and invalid values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("clientReference", () => {
  it("prefers the stored reference", () => {
    expect(clientReference("abc123def", "CL-0001")).toBe("CL-0001");
  });

  it("derives a reference from the id when none is stored", () => {
    expect(clientReference("abc123def", null)).toBe("CL-123DEF");
    expect(clientReference("abc123def", "   ")).toBe("CL-123DEF");
  });
});
