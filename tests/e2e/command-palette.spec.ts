import { expect, test } from "@playwright/test";

import { useEnglishLocale, waitForAppReady } from "./helpers";

const MODIFIER = process.platform === "darwin" ? "Meta" : "Control";

/** UX-03 — command palette, workspace search and the shortcut reference. */
test.describe("command palette", () => {
  test("opens with the keyboard and navigates to a destination", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/dashboard");
    await waitForAppReady(page);

    await page.keyboard.press(`${MODIFIER}+k`);
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("combobox").fill("Invoices");
    await expect(dialog.getByRole("option", { name: /Invoices/ }).first()).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/invoices$/);
  });

  test("searches tenant-scoped workspace records", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/dashboard");
    await waitForAppReady(page);

    await page.keyboard.press(`${MODIFIER}+k`);
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await dialog.getByRole("combobox").fill("Atlas");

    await expect(
      dialog.getByRole("option", { name: /Atlas Consulting SARL/ }).first(),
    ).toBeVisible();
  });

  test("opens the shortcut reference with ?", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/dashboard");
    await waitForAppReady(page);

    await page.keyboard.press("Shift+/");
    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Open command palette")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
