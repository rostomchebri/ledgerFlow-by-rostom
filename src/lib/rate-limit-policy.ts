/**
 * AUTH-04 — rate-limit policy for the auth surface.
 *
 * The values live in one place so they can be reviewed, tested, and reused by
 * documentation. Better Auth enforces them (database-backed) against the
 * client IP and the auth path.
 */
export type RateLimitRule = {
  /** Rolling window in seconds. */
  window: number;
  /** Maximum requests allowed inside the window. */
  max: number;
};

export const RATE_LIMIT_DEFAULT: RateLimitRule = {
  window: 60,
  max: 60,
};

export const RATE_LIMIT_RULES = {
  /** Credential stuffing / brute force. */
  "/sign-in/email": { window: 15 * 60, max: 5 },
  /** Bulk account creation and verification-email spam. */
  "/sign-up/email": { window: 60 * 60, max: 5 },
  /** Password-reset email bombing and token probing. */
  "/request-password-reset": { window: 60 * 60, max: 3 },
  "/reset-password": { window: 60 * 60, max: 5 },
  /** Verification-email bombing and token probing. */
  "/send-verification-email": { window: 60 * 60, max: 3 },
  "/verify-email": { window: 15 * 60, max: 10 },
  /** Authenticated credential changes. */
  "/change-password": { window: 60 * 60, max: 5 },
  /** Session polling from many tabs should not trip the global limit. */
  "/get-session": { window: 60, max: 120 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitedPath = keyof typeof RATE_LIMIT_RULES;

export function getRateLimitRule(path: string): RateLimitRule {
  return RATE_LIMIT_RULES[path as RateLimitedPath] ?? RATE_LIMIT_DEFAULT;
}
