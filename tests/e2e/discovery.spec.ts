import { expect, test } from "@playwright/test";

test("navigates from the homepage through a schedule guide to the generator", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Shift schedules", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /rotating shift schedule patterns/i,
    }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /read the 4 on \/ 4 off guide/i })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /4 on \/ 4 off shift schedule/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/eight-day cycle/i).first()).toBeVisible();

  await page
    .getByRole("link", { name: /create your 4 on 4 off calendar/i })
    .click();
  await expect(page.locator("#generator")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: /generate schedule/i }),
  ).toBeEnabled();
});

test("explains the fixed 2-2-3 implementation and links to the related guide", async ({
  page,
}) => {
  await page.goto("/shift-schedules/2-2-3");
  await expect(page).toHaveTitle(
    "2-2-3 Shift Schedule Calendar & Guide | Shift Calendar",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: /2-2-3 shift schedule/i }),
  ).toBeVisible();
  await expect(page.getByText(/fourteen-day cycle/i).first()).toBeVisible();
  await expect(page.getByText(/terminology is not universal/i)).toBeVisible();
  await expect(
    page.getByText(/does not automatically rotate working positions/i),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /read the 4 on \/ 4 off guide/i })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: /4 on \/ 4 off/i }),
  ).toBeVisible();
});

test("About documents purpose, methodology, and limitations and returns to the generator", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: /about shift calendar/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /calculation methodology/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /current limitations/i }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /open the shift calendar generator/i })
    .click();
  await expect(page.locator("#generator")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: /generate schedule/i }),
  ).toBeEnabled();
});

const routeExpectations = [
  {
    path: "/shift-schedules",
    h1: "Rotating shift schedule patterns",
    title: "Rotating Shift Schedule Patterns | Shift Calendar",
  },
  {
    path: "/shift-schedules/4-on-4-off",
    h1: "4 on / 4 off shift schedule",
    title: "4 On 4 Off Schedule Calendar & Guide | Shift Calendar",
  },
  {
    path: "/shift-schedules/2-2-3",
    h1: "2-2-3 shift schedule",
    title: "2-2-3 Shift Schedule Calendar & Guide | Shift Calendar",
  },
  {
    path: "/about",
    h1: "About Shift Calendar",
    title: "About Shift Calendar",
  },
] as const;

for (const route of routeExpectations) {
  test(`${route.path} has crawlable route metadata and meaningful initial HTML`, async ({
    page,
  }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    expect(await page.content()).toContain(route.h1);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.+/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${route.path.replaceAll("/", "\\/")}$`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`content routes have usable navigation and no overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const route of routeExpectations) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: /primary navigation/i }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
}
