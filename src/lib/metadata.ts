import type { Metadata } from "next";

import type { PageSeo } from "@/content/content-types";
import { siteConfig } from "@/lib/site";

export function createPageMetadata(page: PageSeo): Metadata {
  const url = new URL(page.path, siteConfig.url).toString();

  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: "en",
      title: page.title,
      description: page.description,
      url,
    },
  };
}
