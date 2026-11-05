import { expect, test } from "@playwright/test";

import { uniqueSuffix, useEnglishLocale } from "./helpers";

/** OPS-04 — task creation, inline status change, and list search. */
test.describe("tasks", () => {
  test("creates a task and updates its status", async ({ page }) => {
    await useEnglishLocale(page);
    const title = `E2E Task ${uniqueSuffix()}`;

    await page.goto("/tasks/new");
    await expect(page).toHaveURL(/\/tasks\/new$/);

    await page.locator("#title").fill(title);
    await page.locator("#description").fill("Created by the Playwright suite.");
    await page.getByRole("button", { name: "Save task" }).click();
    await page.waitForURL(
      (url) => /^\/tasks\/[^/]+$/.test(url.pathname) && url.pathname !== "/tasks/new",
    );
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // The select updates optimistically; wait for the PATCH to land before
    // navigating so the list page reads the persisted status.
    const statusSaved = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/tasks\/[^/]+\/status$/.test(new URL(response.url()).pathname),
    );
    await page.getByLabel("Status").selectOption("IN_PROGRESS");
    expect((await statusSaved).ok()).toBeTruthy();
    await expect(page.getByLabel("Status")).toHaveValue("IN_PROGRESS");

    await page.goto(`/tasks?q=${encodeURIComponent(title)}`);
    const row = page.getByRole("row", { name: title });
    await expect(row).toBeVisible();
    await expect(row.getByLabel("Status")).toHaveValue("IN_PROGRESS");
  });
});
