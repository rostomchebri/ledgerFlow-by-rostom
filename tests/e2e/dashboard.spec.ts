import { expect, test } from "@playwright/test";

import { useEnglishLocale } from "./helpers";

/** OPS-04 — the seeded dashboard renders its KPIs and quick actions. */
test.describe("dashboard", () => {
  test("shows the financial overview for the seeded workspace", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText("Total Revenue", { exact: true })).toBeVisible();
    await expect(page.getByText("Total Expenses", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Financial overview" })).toBeVisible();

    await page.getByRole("link", { name: "Add client" }).click();
    await expect(page).toHaveURL(/\/clients\/new$/);
  });
});
