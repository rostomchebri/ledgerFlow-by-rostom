import { describe, expect, it } from "vitest";

import { getRateLimitRule, RATE_LIMIT_DEFAULT, RATE_LIMIT_RULES } from "@/lib/rate-limit-policy";

describe("rate-limit policy", () => {
  it("keeps a conservative global default", () => {
    expect(RATE_LIMIT_DEFAULT.window).toBeGreaterThan(0);
    expect(RATE_LIMIT_DEFAULT.max).toBeGreaterThan(0);
  });

  it("limits credential sign-in attempts", () => {
    expect(getRateLimitRule("/sign-in/email")).toEqual({ window: 900, max: 5 });
  });

  it("limits sign-up and password-reset e-mails", () => {
    expect(getRateLimitRule("/sign-up/email")).toEqual({ window: 3600, max: 5 });
    expect(getRateLimitRule("/request-password-reset")).toEqual({ window: 3600, max: 3 });
    expect(getRateLimitRule("/send-verification-email")).toEqual({ window: 3600, max: 3 });
  });

  it("falls back to the default for unknown paths", () => {
    expect(getRateLimitRule("/not-an-auth-route")).toEqual(RATE_LIMIT_DEFAULT);
  });

  it("only declares positive windows and limits", () => {
    for (const rule of Object.values(RATE_LIMIT_RULES)) {
      expect(rule.window).toBeGreaterThan(0);
      expect(rule.max).toBeGreaterThan(0);
    }
  });
});
