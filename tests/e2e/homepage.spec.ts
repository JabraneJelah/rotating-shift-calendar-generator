import { expect, test, type Page } from "@playwright/test";

const startDate = (page: Page) => page.getByLabel(/pattern start date/i);

test("generates and navigates a fixed-shift monthly schedule", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /generate your rotating work calendar in seconds/i,
    }),
  ).toBeVisible();
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).focus();
  await page.keyboard.press("Enter");

  const october = page.getByRole("table", {
    name: /october 2026 work schedule/i,
  });
  await expect(october).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: /thursday, october 1, 2026 — day shift/i,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /\?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10$/,
  );

  await page.getByRole("button", { name: /show next month/i }).click();
  await expect(
    page.getByRole("table", { name: /november 2026 work schedule/i }),
  ).toBeVisible();
  await expect(page).toHaveURL(/m=2026-11$/);
});

test("builds a custom cycle and restores it after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /^custom cycle/i }).check();
  await page.getByLabel(/shift for cycle day 2/i).selectOption("night");
  await startDate(page).fill("2028-02-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();

  await expect(
    page.getByRole("table", { name: /february 2028 work schedule/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /tuesday, february 1, 2028 — day shift/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: /wednesday, february 2, 2028 — night shift/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /thursday, february 3, 2028 — off/i }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /kind=custom.*(?:cycle=d%2Cn%2Co%2Co|cycle=d,n,o,o)/,
  );

  await page.reload();
  await expect(
    page.getByRole("radio", { name: /^custom cycle/i }),
  ).toBeChecked();
  await expect(startDate(page)).toHaveValue("2028-02-01");
  await expect(
    page.getByRole("cell", { name: /tuesday, february 29, 2028/i }),
  ).toBeVisible();
});

test("restores generated schedules through browser history", async ({
  page,
}) => {
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();

  await startDate(page).fill("2026-12-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await expect(
    page.getByRole("heading", { name: "December 2026" }),
  ).toBeVisible();

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
  await expect(startDate(page)).toHaveValue("2026-10-01");

  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "December 2026" }),
  ).toBeVisible();
  await expect(startDate(page)).toHaveValue("2026-12-01");
});

test("focuses useful errors and recovers from an invalid shared link", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /generate schedule/i }).click();

  const summary = page.getByRole("alert", {
    name: /check your schedule details/i,
  });
  await expect(summary).toBeFocused();
  await expect(startDate(page)).toHaveAttribute("aria-invalid", "true");

  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await expect(
    page.getByRole("table", { name: /october 2026 work schedule/i }),
  ).toBeVisible();

  await page.goto("/?v=2&kind=preset");
  await expect(
    page.getByRole("alert", { name: /unable to open this schedule link/i }),
  ).toContainText(/unsupported version/i);
  await expect(
    page.getByRole("button", { name: /generate schedule/i }),
  ).toBeEnabled();
});

for (const width of [320, 390, 768, 1440]) {
  test(`has no page overflow after generation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await startDate(page).fill("2026-10-01");
    await page.getByRole("button", { name: /generate schedule/i }).click();
    await expect(
      page.getByRole("table", { name: /october 2026/i }),
    ).toBeVisible();

    if (width === 390) {
      await page.getByRole("button", { name: /show next month/i }).click();
      await expect(
        page.getByRole("table", { name: /november 2026/i }),
      ).toBeVisible();
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
