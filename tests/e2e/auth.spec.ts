import { expect, test } from "@playwright/test";

import { useEnglishLocale } from "./helpers";

/**
 * OPS-04 — authentication surface.
 *
 * Guest tests use an empty storage state; the authenticated redirect test uses
 * the session created by auth.setup.ts. Invalid credentials are not submitted so
 * the suite stays well below the Better Auth sign-in rate limit.
 */
test.describe("guest", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects unauthenticated visitors to sign in", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/clients");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("validates the sign-in form before calling the API", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/login");

    await page.locator("#login-email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("This field is required.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("authenticated", () => {
  test("redirects signed-in users away from the sign-in page", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
