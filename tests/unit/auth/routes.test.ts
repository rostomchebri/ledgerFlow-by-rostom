import { describe, expect, it } from "vitest";

import {
  buildLoginRedirect,
  isAuthPath,
  isGuestOnlyPath,
  isProtectedPath,
  normalizePath,
} from "@/lib/routes";

describe("normalizePath", () => {
  it("handles empty and root paths", () => {
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/")).toBe("/");
  });

  it("removes the query string", () => {
    expect(normalizePath("/dashboard?tab=activity")).toBe("/dashboard");
  });

  it("collapses duplicate slashes and a trailing slash", () => {
    expect(normalizePath("//clients///")).toBe("/clients");
    expect(normalizePath("/clients/")).toBe("/clients");
  });
});

describe("route protection", () => {
  it("protects the app surface and its nested routes", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/settings")).toBe(true);
    expect(isProtectedPath("/clients")).toBe(true);
    expect(isProtectedPath("/clients/abc/edit")).toBe(true);
    expect(isProtectedPath("/clients/?page=2")).toBe(true);
    expect(isProtectedPath("/settings/team")).toBe(true);
    expect(isProtectedPath("/onboarding")).toBe(true);
    expect(isProtectedPath("/invitations/token_123")).toBe(true);
  });

  it("does not match paths that only share a prefix", () => {
    expect(isProtectedPath("/client")).toBe(false);
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("treats login, registration and password recovery as guest-only", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/register")).toBe(true);
    expect(isGuestOnlyPath("/forgot-password")).toBe(true);
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
    expect(isGuestOnlyPath("/verify-email")).toBe(false);
  });

  it("groups every auth page", () => {
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ]) {
      expect(isAuthPath(path)).toBe(true);
    }

    expect(isAuthPath("/dashboard")).toBe(false);
  });
});

describe("buildLoginRedirect", () => {
  it("encodes the requested path and query", () => {
    expect(buildLoginRedirect("/clients", "?page=2")).toBe(
      "/login?callbackUrl=%2Fclients%3Fpage%3D2",
    );
  });

  it("normalizes the callback path", () => {
    expect(buildLoginRedirect("/clients/")).toBe("/login?callbackUrl=%2Fclients");
  });
});
