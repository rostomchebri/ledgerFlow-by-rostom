import { describe, expect, it } from "vitest";

import { slugifyFirmName, suffixedSlug } from "@/lib/firms/slug";

describe("slugifyFirmName", () => {
  it("normalises accents and punctuation", () => {
    expect(slugifyFirmName("Cabinet Bensalem & Associés")).toBe("cabinet-bensalem-associes");
    expect(slugifyFirmName("  Étude   Comptable  ")).toBe("etude-comptable");
  });

  it("collapses separators and trims dashes", () => {
    expect(slugifyFirmName("---Cabinet///Demo---")).toBe("cabinet-demo");
  });

  it("falls back to a stable slug for non-Latin names", () => {
    expect(slugifyFirmName("مكتب بن سالم")).toBe("firm");
    expect(slugifyFirmName("!!!")).toBe("firm");
  });

  it("caps the base slug at 40 characters", () => {
    expect(slugifyFirmName("a".repeat(80))).toHaveLength(40);
  });
});

describe("suffixedSlug", () => {
  it("keeps the final slug within 48 characters", () => {
    const long = suffixedSlug("a".repeat(40), 12);
    expect(long.length).toBeLessThanOrEqual(48);
    expect(long.endsWith("-12")).toBe(true);
  });
});
