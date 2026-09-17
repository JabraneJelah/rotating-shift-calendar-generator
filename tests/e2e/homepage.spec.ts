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
  await page.getByRole("button", { name: /export this month/i }).click();
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

test("shows a complete yearly overview and keeps its navigation transient", async ({
  page,
}) => {
  await page.goto("/");
  await startDate(page).fill("2028-02-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  const monthlyUrl = page.url();

  await page.getByRole("radio", { name: "Year" }).check();
  await expect(
    page.getByRole("heading", { name: /2028 yearly schedule/i }),
  ).toBeFocused();
  await expect(page.getByRole("table")).toHaveCount(12);
  await expect(
    page.getByRole("table", { name: /february 2028/i }).locator("time"),
  ).toHaveCount(29);
  await expect(page.locator(".year-grid time")).toHaveCount(366);
  await expect(page.getByLabel(/yearly shift totals/i)).toContainText(
    "Total dates366",
  );
  await expect(page.getByLabel(/yearly shift totals/i)).toContainText(
    /Weekend dates\d+ of 106 worked/,
  );
  await expect(page.getByRole("region", { name: /up next/i })).toHaveCount(1);
  expect(page.url()).toBe(monthlyUrl);

  await page.getByRole("button", { name: "Show 2029" }).click();
  await expect(
    page.getByRole("heading", { name: /2029 yearly schedule/i }),
  ).toBeVisible();
  expect(page.url()).toBe(monthlyUrl);

  await page.getByRole("radio", { name: "Month" }).check();
  await expect(
    page.getByRole("table", { name: /february 2028/i }),
  ).toBeVisible();
});

test("invokes native printing for the active view", async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      (globalThis as { __printCalls?: number }).__printCalls =
        ((globalThis as { __printCalls?: number }).__printCalls ?? 0) + 1;
    };
  });
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByRole("button", { name: /print month view/i }).click();
  await page.getByRole("radio", { name: "Year" }).check();
  await page.getByRole("button", { name: /print year view/i }).click();

  expect(
    await page.evaluate(
      () => (globalThis as { __printCalls?: number }).__printCalls,
    ),
  ).toBe(2);
});

test("print media exposes only the active calendar and print context", async ({
  page,
}) => {
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();

  const monthTable = page.getByRole("table", { name: /october 2026/i });
  await page.emulateMedia({ media: "print" });
  await expect(monthTable.getByRole("columnheader").first()).toHaveText("Mon");

  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: "Sunday" }).check();
  await page.emulateMedia({ media: "print" });
  await expect(monthTable.getByRole("columnheader").first()).toHaveText("Sun");

  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: "Year" }).check();
  await page.emulateMedia({ media: "print" });

  await expect(
    page.getByRole("heading", { name: /2026 yearly schedule/i }),
  ).toBeVisible();
  await expect(page.locator(".print-site-name")).toHaveText("Shift Calendar");
  await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
  await expect(
    page.getByRole("button", { name: /generate schedule/i }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: /print year view/i }),
  ).toBeHidden();
  await expect(page.getByRole("table")).toHaveCount(12);
  await expect(
    page.getByRole("table").first().getByRole("columnheader").first(),
  ).toHaveAttribute("abbr", "Sunday");
});

test("restores Sunday-first presentation through reload", async ({ page }) => {
  await page.goto(
    "/?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10",
  );
  const table = page.getByRole("table", { name: /october 2026/i });
  await expect(table.getByRole("columnheader").first()).toHaveText("Mon");
  await expect(page.getByRole("radio", { name: "Monday" })).toBeChecked();

  await page.getByRole("radio", { name: "Sunday" }).check();
  await expect(table.getByRole("columnheader").first()).toHaveText("Sun");
  await expect(page).toHaveURL(/&m=2026-10&ws=sun$/);

  await page.reload();
  await expect(page.getByRole("radio", { name: "Sunday" })).toBeChecked();
  await expect(
    page
      .getByRole("table", { name: /october 2026/i })
      .getByRole("columnheader")
      .first(),
  ).toHaveText("Sun");
});

test("restores different URL-backed week preferences with Back and Forward", async ({
  page,
}) => {
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByRole("radio", { name: "Sunday" }).check();

  await startDate(page).fill("2026-12-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByRole("radio", { name: "Monday" }).check();
  await expect(page).toHaveURL(/s=2026-12-01.*m=2026-12$/);

  await page.goBack();
  await expect(startDate(page)).toHaveValue("2026-10-01");
  await expect(page.getByRole("radio", { name: "Sunday" })).toBeChecked();
  await expect(page).toHaveURL(/s=2026-10-01.*ws=sun$/);

  await page.goForward();
  await expect(startDate(page)).toHaveValue("2026-12-01");
  await expect(page.getByRole("radio", { name: "Monday" })).toBeChecked();
});

test("shows monthly next information and scoped weekend dates", async ({
  page,
}) => {
  await page.goto("/");
  await startDate(page).fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();

  await expect(page.getByRole("region", { name: /up next/i })).toContainText(
    "Next schedule position",
  );
  await expect(page.getByRole("region", { name: /up next/i })).toContainText(
    "Next working day",
  );
  await expect(page.getByLabel(/monthly shift totals/i)).toContainText(
    /Weekend dates\d+ of 9 worked/,
  );
});

for (const [year, eventCount] of [
  [2026, 365],
  [2028, 366],
] as const) {
  test(`downloads exactly ${eventCount} events for ${year}`, async ({
    page,
  }) => {
    await page.goto("/");
    await startDate(page).fill(`${year}-01-01`);
    await page.getByRole("button", { name: /generate schedule/i }).click();
    await page.getByRole("radio", { name: "Year" }).check();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export this year/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(download.suggestedFilename()).toBe(`shift-calendar-${year}.ics`);
    expect(downloadPath).not.toBeNull();
    const content = await readFile(downloadPath!, "utf8");
    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(eventCount);
    const exportedDates = [
      ...content.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g),
    ].map((match) => match[1]);
    expect(exportedDates).toHaveLength(eventCount);
    expect(exportedDates.every((value) => value.startsWith(`${year}`))).toBe(
      true,
    );
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
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

    await page.getByRole("radio", { name: "Year" }).check();
    await expect(page.getByRole("table")).toHaveCount(12);

    if (width === 390) {
      await page.getByRole("radio", { name: "Month" }).check();
      await page.getByRole("button", { name: /show next month/i }).click();
      await expect(
        page.getByRole("table", { name: /november 2026/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: /copy schedule link/i }).click();
      await expect(
        page.getByLabel(/schedule link for manual copying/i),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /export this month/i }),
      ).toBeVisible();
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
