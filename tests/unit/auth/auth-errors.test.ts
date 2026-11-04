import { describe, expect, it } from "vitest";

import { authErrorKey, isEmailNotVerified, isInvalidToken, isRateLimited } from "@/lib/auth-errors";

describe("auth error mapping", () => {
  it("maps missing errors to the generic message", () => {
    expect(authErrorKey(null)).toBe("errors.generic");
    expect(authErrorKey(undefined)).toBe("errors.generic");
  });

  it("maps rate limiting", () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(authErrorKey({ status: 429 })).toBe("errors.rateLimited");
  });

  it("detects unverified email addresses", () => {
    const error = { status: 403, code: "EMAIL_NOT_VERIFIED", message: "Email not verified" };

    expect(isEmailNotVerified(error)).toBe(true);
    expect(authErrorKey(error)).toBe("errors.emailNotVerified");
  });

  it("keeps credential failures generic", () => {
    expect(authErrorKey({ status: 401, message: "Invalid email or password" })).toBe(
      "errors.invalidCredentials",
    );
  });

  it("maps malformed requests", () => {
    expect(authErrorKey({ status: 400 })).toBe("errors.invalidRequest");
    expect(authErrorKey({ status: 422 })).toBe("errors.invalidRequest");
  });

  it("maps server-side password policy failures", () => {
    expect(authErrorKey({ status: 400, code: "WEAK_PASSWORD" })).toBe("errors.weakPassword");
  });

  it("maps forbidden actions", () => {
    expect(authErrorKey({ status: 403 })).toBe("errors.forbidden");
  });

  it("detects invalid reset tokens", () => {
    expect(isInvalidToken({ code: "INVALID_TOKEN" })).toBe(true);
    expect(isInvalidToken({ status: 400, message: "Token expired" })).toBe(true);
    expect(isInvalidToken({ status: 400, message: "Password too short" })).toBe(false);
    expect(isInvalidToken({ status: 500, message: "Internal error" })).toBe(false);
  });
});
