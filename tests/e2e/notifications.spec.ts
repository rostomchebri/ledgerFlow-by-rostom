import { expect, test } from "@playwright/test";

import { useEnglishLocale } from "./helpers";

/** OPS-04 — notification center and bell. */
test.describe("notifications", () => {
  test("renders the notification center and opens it from the bell", async ({ page }) => {
    await useEnglishLocale(page);
    await page.goto("/notifications");

    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark all read" })).toBeVisible();

    // Either the empty state or at least one notification row is rendered.
    const empty = page.getByText("You're all caught up");
    const list = page.getByRole("listitem");
    await expect(empty.or(list.first())).toBeVisible();

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("link", { name: "View all notifications" })).toBeVisible();
  });
});
