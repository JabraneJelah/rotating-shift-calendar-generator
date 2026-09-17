import type { MetadataRoute } from "next";

import { indexablePaths } from "@/content/site-pages";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths.map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
    changeFrequency: path === "/" ? "monthly" : "yearly",
    priority: path === "/" ? 1 : path === "/shift-schedules" ? 0.8 : 0.7,
  }));
}
