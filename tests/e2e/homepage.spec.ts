import { expect, test } from "@playwright/test";

test("homepage presents the Phase 1 foundation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /your shift pattern, made easier to see/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /generator coming in phase 2/i }),
  ).toBeDisabled();
});
