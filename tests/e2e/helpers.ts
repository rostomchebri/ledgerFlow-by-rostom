import type { Page } from "@playwright/test";

/**
 * OPS-04 — shared E2E helpers.
 *
 * The suite runs against a migrated and seeded database (see README). The
 * seeded demo account is verified, so the spec can sign in without opening
 * Mailpit. Override the credentials with DEMO_USER_EMAIL / DEMO_USER_PASSWORD
 * when CI seeds a different account.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const DEMO_USER = {
  email: process.env.DEMO_USER_EMAIL ?? "demo@ledgerflow.local",
  password: process.env.DEMO_USER_PASSWORD ?? "LedgerFlowDemo123",
};

/** Collision-resistant suffix for data created by parallel spec files. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The app defaults to French. Every spec sets NEXT_LOCALE=en so selectors stay
 * stable; storageState created by auth.setup.ts already carries the cookie.
 */
export async function useEnglishLocale(page: Page): Promise<void> {
  await page.context().addCookies([{ name: "NEXT_LOCALE", value: "en", url: APP_URL }]);
}
