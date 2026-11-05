import { expect, test } from "@playwright/test";

import { uniqueSuffix, useEnglishLocale } from "./helpers";

/** OPS-04 — invitation flow visible to an owner. */
test.describe("team", () => {
  test("sends an invitation and lists it as pending", async ({ page }) => {
    await useEnglishLocale(page);
    const email = `e2e-${uniqueSuffix()}@firm.example`;

    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Comptable Démo/ })).toBeVisible();

    await page.locator("#invite-email").fill(email);
    const invitationSent = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/firms/invitations",
    );
    await page.getByRole("button", { name: "Send invitation" }).click();
    expect((await invitationSent).ok()).toBeTruthy();

    await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  });
});
