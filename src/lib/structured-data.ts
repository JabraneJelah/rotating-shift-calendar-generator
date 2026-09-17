import type { BreadcrumbItem } from "@/content/content-types";
import { siteConfig } from "@/lib/site";

export type BreadcrumbListData = {
  readonly "@context": "https://schema.org";
  readonly "@type": "BreadcrumbList";
  readonly itemListElement: readonly {
    readonly "@type": "ListItem";
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }[];
};

export function createBreadcrumbList(
  items: readonly BreadcrumbItem[],
): BreadcrumbListData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: new URL(item.path, siteConfig.url).toString(),
    })),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
