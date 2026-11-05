import { expect, test as setup } from "@playwright/test";

import { DEMO_USER, useEnglishLocale } from "./helpers";

const AUTH_FILE = "tests/e2e/.auth/user.json";

/**
 * OPS-04 — sign in once and reuse the session cookie across the browser
 * projects. Keeping this in a setup project avoids a sign-in per test and
 * stays below the Better Auth rate limit.
 */
setup("authenticate as the seeded demo user", async ({ page, context }) => {
  await useEnglishLocale(page);

  await page.goto("/login");
  await page.locator("#login-email").fill(DEMO_USER.email);
  await page.locator("#login-password").fill(DEMO_USER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  await context.storageState({ path: AUTH_FILE });
});
