import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { pageSeo } from "@/content/site-pages";
import { shiftScheduleList } from "@/content/shift-schedules";
import { createPageMetadata } from "@/lib/metadata";
import { createBreadcrumbList, serializeJsonLd } from "@/lib/structured-data";

const seoPages = [
  pageSeo.schedules,
  ...shiftScheduleList.map((guide) => guide.seo),
  pageSeo.about,
];

describe("content discovery metadata", () => {
  it("has unique titles, descriptions, canonical URLs, and Open Graph URLs", () => {
    expect(new Set(seoPages.map((page) => page.title)).size).toBe(
      seoPages.length,
    );
    expect(new Set(seoPages.map((page) => page.description)).size).toBe(
      seoPages.length,
    );

    for (const page of seoPages) {
      const metadata = createPageMetadata(page);
      const expectedUrl = `http://localhost:3000${page.path}`;
      expect(metadata.alternates?.canonical).toBe(expectedUrl);
      expect(metadata.openGraph?.url).toBe(expectedUrl);
      expect(metadata.openGraph?.title).toBe(page.title);
      expect(metadata.openGraph?.description).toBe(page.description);
    }
  });

  it("lists exactly the approved canonical routes in the sitemap", () => {
    const entries = sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/shift-schedules",
      "http://localhost:3000/shift-schedules/4-on-4-off",
      "http://localhost:3000/shift-schedules/2-2-3",
      "http://localhost:3000/about",
    ]);
    expect(entries.every((entry) => !entry.url.includes("?"))).toBe(true);
    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true);
  });

  it("keeps robots open and points at the canonical sitemap", () => {
    expect(robots()).toMatchObject({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "http://localhost:3000/sitemap.xml",
      host: "http://localhost:3000",
    });
  });

  it("creates safe absolute BreadcrumbList JSON-LD without unsupported schema", () => {
    const breadcrumbs = createBreadcrumbList([
      { label: "Home", path: "/" },
      { label: "Shift schedules", path: "/shift-schedules" },
      { label: "4 on / 4 off", path: "/shift-schedules/4-on-4-off" },
    ]);
    const serialized = serializeJsonLd(breadcrumbs);
    const parsed = JSON.parse(serialized);

    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(3);
    expect(
      parsed.itemListElement.map((item: { item: string }) => item.item),
    ).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/shift-schedules",
      "http://localhost:3000/shift-schedules/4-on-4-off",
    ]);
    expect(serialized).not.toMatch(/FAQPage|Review|Rating|author/i);
    expect(serializeJsonLd({ value: "</script>" })).toContain(
      "\\u003c/script>",
    );
  });
});
