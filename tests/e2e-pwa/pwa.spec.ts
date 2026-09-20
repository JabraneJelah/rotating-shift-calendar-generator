import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

async function waitForServiceWorkerControl(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.__SHIFT_CALENDAR_ENABLE_PWA_TEST__ = true;
  });
});

test("serves the approved manifest, icons, worker headers and complete precache", async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = (await manifestResponse.json()) as {
    id: string;
    start_url: string;
    scope: string;
    display: string;
    orientation: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
  });
  expect(manifest.icons).toHaveLength(4);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()["content-type"]).toContain(
    "application/javascript",
  );
  expect(workerResponse.headers()["cache-control"]).toContain("no-store");
  expect(workerResponse.headers()["service-worker-allowed"]).toBe("/");
  expect(workerResponse.headers()["x-content-type-options"]).toBe("nosniff");

  await waitForServiceWorkerControl(page);
  const cacheState = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith("shift-calendar-"),
    );
    const urls: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map(({ url }) => url));
    }
    return { names, urls };
  });
  expect(cacheState.names).toHaveLength(1);
  expect(cacheState.names[0]).toMatch(/^shift-calendar-precache-/);
  expect(cacheState.urls).toHaveLength(24);
  expect(cacheState.urls.every((url) => !new URL(url).search)).toBe(true);
});

test("restores and edits a saved planner offline and keeps exports local", async ({
  page,
  context,
}) => {
  await waitForServiceWorkerControl(page);
  await page.getByLabel("Shift pattern").selectOption("2-day-2-night-4-off");
  await page.getByText("Shift details (optional)").click();
  const day = page.getByRole("group", { name: "Day details" });
  const night = page.getByRole("group", { name: "Night details" });
  await day.getByLabel(/start time/i).fill("08:00");
  await day.getByLabel(/end time/i).fill("16:00");
  await night.getByLabel(/start time/i).fill("22:00");
  await night.getByLabel(/end time/i).fill("06:00");
  await page.getByLabel("Pattern start date").fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByLabel("Planner name").fill("Offline rotation");
  await page.getByRole("button", { name: "Save planner" }).click();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Current: Offline rotation")).toBeVisible();
  await expect(
    page.getByText("Offline — saved planners remain available on this device."),
  ).toBeVisible();
  const offlineRequests: string[] = [];
  page.on("request", (request) => offlineRequests.push(request.url()));
  await page.getByLabel("Pattern start date").fill("2026-11-01");
  await page.getByRole("button", { name: /update schedule/i }).click();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  expect(offlineRequests).toEqual([]);
  await page.getByRole("radio", { name: "Year" }).check();
  await expect(
    page.getByRole("heading", { name: /2026 yearly schedule/i }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Month" }).check();

  const jsonDownload = page.waitForEvent("download");
  await page.getByText(/manage saved planners/i).click();
  await page.getByRole("button", { name: "Export all JSON" }).click();
  const backup = await jsonDownload;
  expect(backup.suggestedFilename()).toMatch(/\.json$/);
  const backupPath = await backup.path();
  expect(backupPath).not.toBeNull();
  await page.getByLabel("Import JSON backup").setInputFiles({
    name: "offline-backup.json",
    mimeType: "application/json",
    buffer: await readFile(backupPath!),
  });
  await expect(
    page.getByRole("heading", { name: "Review import" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import as new" }).click();
  await expect(page.getByText(/manage saved planners \(2\)/i)).toBeVisible();

  const allDayDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /export this month/i }).click();
  expect((await allDayDownload).suggestedFilename()).toMatch(/\.ics$/);

  await page
    .getByRole("button", { name: /export timed work calendar/i })
    .click();
  await page.getByLabel("Time zone").fill("Africa/Casablanca");
  const timedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /download timed calendar/i }).click();
  expect((await timedDownload).suggestedFilename()).toContain("timed.ics");

  const cacheText = await page.evaluate(async () => {
    const values: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("shift-calendar-")) continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        values.push(request.url, await (await cache.match(request))!.text());
      }
    }
    return values.join("\n");
  });
  expect(cacheText).not.toContain("Offline rotation");
});

test("uses one cached root for V1 URLs and a dedicated unknown-route fallback", async ({
  page,
  context,
}) => {
  await waitForServiceWorkerControl(page);
  await context.setOffline(true);
  await page.goto(
    "/?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10",
  );
  await expect(page.getByLabel("Pattern start date")).toHaveValue("2026-10-01");
  expect(page.url()).toContain("?v=1&kind=preset");

  await page.goto("/?v=2&kind=preset");
  await expect(
    page.getByRole("alert", { name: /unable to open this schedule link/i }),
  ).toContainText(/unsupported version/i);

  await page.goto("/about");
  await expect(
    page.getByRole("heading", { name: /about shift calendar/i }),
  ).toBeVisible();

  const crossOrigin = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/pwa-exclusion-check");
      return "unexpected-success";
    } catch {
      return "network-failed";
    }
  });
  expect(crossOrigin).toBe("network-failed");

  const cacheUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("shift-calendar-")) continue;
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map(({ url }) => url));
    }
    return urls;
  });
  expect(cacheUrls.every((url) => !new URL(url).search)).toBe(true);

  const response = await page.goto("/not-a-real-route");
  expect(response?.status()).toBe(503);
  await expect(
    page.getByRole("heading", {
      name: "This page is not available offline.",
    }),
  ).toBeVisible();
});

test("waits for safe multi-tab approval before activating release B", async ({
  page,
  context,
}) => {
  await waitForServiceWorkerControl(page);
  await page.getByLabel("Pattern start date").fill("2026-10-01");
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await page.getByLabel("Planner name").fill("Update-safe planner");
  await page.getByRole("button", { name: "Save planner" }).click();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();

  const otherPage = await context.newPage();
  await otherPage.goto("/");
  await expect(
    otherPage.getByText("Current: Update-safe planner"),
  ).toBeVisible();
  await otherPage.getByLabel("Pattern start date").fill("2026-11-01");

  const workerPath = path.join(process.cwd(), "public", "sw.js");
  const releaseA = await readFile(workerPath, "utf8");
  const releaseB = releaseA.replace(
    /"releaseId":"[a-f0-9]+"/,
    '"releaseId":"bbbbbbbbbbbbbbbbbbbbbbbb"',
  );
  expect(releaseB).not.toBe(releaseA);

  try {
    await writeFile(workerPath, releaseB, "utf8");
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      if (registration.waiting !== null) return;
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Release B did not finish installing.")),
          10_000,
        );
        registration.addEventListener(
          "updatefound",
          () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed") {
                window.clearTimeout(timeout);
                resolve();
              }
            });
          },
          { once: true },
        );
      });
    });

    await expect(page.getByText("Update available")).toBeVisible();
    await page.getByRole("button", { name: "Later" }).click();
    const applicationStatus = page.getByRole("complementary", {
      name: "Application status",
    });
    await expect(applicationStatus.getByRole("status")).toContainText(
      "Update postponed",
    );

    await page.getByRole("button", { name: "Update now" }).click();
    await expect(applicationStatus.getByRole("status")).toContainText(
      "Close other Shift Calendar tabs",
    );

    await otherPage.close();
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Update now" }).click(),
    ]);
    await expect(page.getByText("Current: Update-safe planner")).toBeVisible();
    const applicationCaches = await page.evaluate(async () =>
      (await caches.keys()).filter((name) =>
        name.startsWith("shift-calendar-precache-"),
      ),
    );
    expect(applicationCaches.length).toBeLessThanOrEqual(2);
  } finally {
    await writeFile(workerPath, releaseA, "utf8");
    await otherPage.close().catch(() => undefined);
  }
});

test("keeps the application free of document overflow at required widths", async ({
  page,
}) => {
  await waitForServiceWorkerControl(page);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

for (const width of [390, 1024]) {
  test(`distinguishes "Update schedule" from "Update now" by icon at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await waitForServiceWorkerControl(page);
    await page.getByLabel(/pattern start date/i).fill("2026-10-01");
    await page.getByRole("button", { name: /generate schedule/i }).click();
    await expect(
      page.getByRole("table", { name: /october 2026/i }),
    ).toBeVisible();

    const workerPath = path.join(process.cwd(), "public", "sw.js");
    const releaseA = await readFile(workerPath, "utf8");
    const releaseB = releaseA.replace(
      /"releaseId":"[a-f0-9]+"/,
      '"releaseId":"cccccccccccccccccccccccc"',
    );
    expect(releaseB).not.toBe(releaseA);

    try {
      await writeFile(workerPath, releaseB, "utf8");
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        if (registration.waiting !== null) return;
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(
            () => reject(new Error("Release B did not finish installing.")),
            10_000,
          );
          registration.addEventListener(
            "updatefound",
            () => {
              const worker = registration.installing;
              worker?.addEventListener("statechange", () => {
                if (worker.state === "installed") {
                  window.clearTimeout(timeout);
                  resolve();
                }
              });
            },
            { once: true },
          );
        });
      });
      await expect(page.getByText("Update available")).toBeVisible();

      // A generator edit while a PWA update is also pending is the exact
      // same-screen collision Phase 7A flagged: two buttons whose names both
      // start with "Update", now visible at the same time.
      await page.getByLabel(/pattern start date/i).fill("2026-11-01");

      const scheduleButton = page.getByRole("button", {
        name: /update schedule/i,
      });
      const pwaButton = page.getByRole("button", { name: "Update now" });
      await expect(scheduleButton).toBeVisible();
      await expect(pwaButton).toBeVisible();

      await expect(
        scheduleButton.locator("svg.lucide-calendar-sync"),
      ).toHaveCount(1);
      await expect(
        scheduleButton.locator("svg.lucide-refresh-cw"),
      ).toHaveCount(0);
      await expect(pwaButton.locator("svg.lucide-refresh-cw")).toHaveCount(1);
      await expect(
        pwaButton.locator("svg.lucide-calendar-sync"),
      ).toHaveCount(0);
    } finally {
      await writeFile(workerPath, releaseA, "utf8");
    }
  });
}
