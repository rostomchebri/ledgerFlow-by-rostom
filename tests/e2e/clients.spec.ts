import { expect, test } from "@playwright/test";

import { uniqueSuffix, useEnglishLocale } from "./helpers";

/** OPS-04 — client management happy path. */
test.describe("clients", () => {
  test("creates a client and finds it through search", async ({ page }) => {
    await useEnglishLocale(page);
    const suffix = uniqueSuffix();
    const name = `E2E Client ${suffix}`;

    await page.goto("/clients");
    await page.getByRole("link", { name: "New client" }).click();
    await expect(page).toHaveURL(/\/clients\/new$/);

    await page.locator("#name").fill(name);
    await page.locator("#contactName").fill("Playwright Tester");
    await page.getByRole("button", { name: "Create client" }).click();

    await page.waitForURL(
      (url) => /^\/clients\/[^/]+$/.test(url.pathname) && url.pathname !== "/clients/new",
    );
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();

    await page.goto(`/clients?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  });
});
