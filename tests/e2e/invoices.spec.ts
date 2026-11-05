import { expect, test } from "@playwright/test";

import { uniqueSuffix, useEnglishLocale } from "./helpers";

/** OPS-04 — invoice creation, status transition, and register search. */
test.describe("invoices", () => {
  test("creates an invoice, marks it sent, and finds it in the register", async ({ page }) => {
    await useEnglishLocale(page);
    const number = `E2E-${uniqueSuffix()}`;
    // Duplicate detection keys on client + issue date + total + currency, so the
    // total must be unique across runs that share the default issue date.
    const unitPrice = String(1_000_000 + Math.floor(Math.random() * 800_000_000));

    await page.goto("/invoices/new");
    await expect(page).toHaveURL(/\/invoices\/new$/);

    const firstClient = await page.locator("#clientId option").nth(1).getAttribute("value");
    expect(firstClient).toBeTruthy();
    await page.locator("#clientId").selectOption(firstClient!);

    await page.locator("#number").fill(number);
    await page.locator("#line-description-0").fill("E2E accounting services");
    await page.locator("#line-quantity-0").fill("1");
    await page.locator("#line-price-0").fill(unitPrice);

    await page.getByRole("button", { name: "Save invoice" }).click();
    await page.waitForURL(
      (url) => /^\/invoices\/[^/]+$/.test(url.pathname) && url.pathname !== "/invoices/new",
    );

    await expect(page.getByRole("heading", { name: number })).toBeVisible();

    // DRAFT → SENT exposes the next transition (Mark paid) after the refresh.
    const statusSaved = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/invoices\/[^/]+\/status$/.test(new URL(response.url()).pathname),
    );
    await page.getByRole("button", { name: "Mark sent" }).click();
    expect((await statusSaved).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("button", { name: "Mark paid" })).toBeVisible();

    await page.goto(`/invoices?q=${encodeURIComponent(number)}`);
    await expect(page.getByText(number, { exact: true }).first()).toBeVisible();
  });
});
