import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeRedirectPath("/clients")).toBe("/clients");
    expect(safeRedirectPath("/clients?page=2#top")).toBe("/clients?page=2#top");
  });

  it("uses the fallback for missing values", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath(undefined, "/login")).toBe("/login");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("http://evil.example/login")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
  });

  it("rejects backslashes and control characters", () => {
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("/dashboard\u0000")).toBe("/dashboard");
    expect(safeRedirectPath("/dashboard\nLocation: https://evil.example")).toBe("/dashboard");
  });

  it("rejects oversized values", () => {
    expect(safeRedirectPath(`/${"a".repeat(2048)}`)).toBe("/dashboard");
  });

  it("uses the first value when the query parameter is repeated", () => {
    expect(safeRedirectPath(["/clients", "/dashboard"])).toBe("/clients");
    expect(safeRedirectPath(["https://evil.example", "/dashboard"])).toBe("/dashboard");
  });
});
