import { readFile } from "node:fs/promises";

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

test("copies a canonical navigated schedule link and restores it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (globalThis as { __copiedScheduleUrl?: string }).__copiedScheduleUrl =
            value;
        },
      },
    });
  });
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByRole("button", { name: /show next month/i }).click();
  await page.getByRole("button", { name: /copy schedule link/i }).click();

  await expect(page.getByRole("status")).toContainText(/schedule link copied/i);
  const copiedUrl = await page.evaluate(
    () =>
      (globalThis as { __copiedScheduleUrl?: string }).__copiedScheduleUrl ??
      "",
  );
  expect(copiedUrl).toMatch(
    /\?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-11$/,
  );

  await page.goto(copiedUrl);
  await expect(startDate(page)).toHaveValue("2026-10-01");
  await expect(
    page.getByRole("table", { name: /november 2026 work schedule/i }),
  ).toBeVisible();
});

test("offers a canonical manual-copy fallback when clipboard access fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard denied for test");
        },
      },
    });
  });
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByRole("button", { name: /copy schedule link/i }).click();

  const manualLink = page.getByLabel(/schedule link for manual copying/i);
  await expect(manualLink).toBeVisible();
  await expect(manualLink).toHaveAttribute("readonly", "");
  await expect(manualLink).toHaveValue(
    /\?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10$/,
  );
  await expect(page.getByRole("status")).toContainText(
    /copy this link manually/i,
  );
});

test("downloads the visible month as an all-day ICS calendar", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /^custom cycle/i }).check();
  await page.getByLabel(/shift for cycle day 2/i).selectOption("night");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download calendar file/i }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe("shift-calendar-2026-10.ics");
  expect(downloadPath).not.toBeNull();
  const content = await readFile(downloadPath!, "utf8");
  expect(content.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(content.endsWith("END:VCALENDAR\r\n")).toBe(true);
  expect(content).toContain("SUMMARY:Day Shift\r\n");
  expect(content).toContain("SUMMARY:Night Shift\r\n");
  expect(content).toContain("SUMMARY:Off Day\r\n");
  const exportedDates = [
    ...content.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g),
  ].map((match) => match[1]);
  expect(exportedDates).toHaveLength(31);
  expect(exportedDates.every((value) => value.startsWith("202610"))).toBe(true);
});

for (const width of [320, 390, 768, 1440]) {
  test(`has no page overflow after generation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    if (width === 390) {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error("Clipboard denied for mobile fallback test");
            },
          },
        });
      });
    }
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
      await page.getByRole("button", { name: /copy schedule link/i }).click();
      await expect(
        page.getByLabel(/schedule link for manual copying/i),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /download calendar file/i }),
      ).toBeVisible();
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
