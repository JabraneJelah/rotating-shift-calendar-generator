import Link from "next/link";

import type { BreadcrumbItem } from "@/content/content-types";
import { createBreadcrumbList, serializeJsonLd } from "@/lib/structured-data";

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  const jsonLd = createBreadcrumbList(items);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map((item, index) => {
            const isCurrent = index === items.length - 1;

            return (
              <li className="flex items-center gap-2" key={item.path}>
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {isCurrent ? (
                  <span aria-current="page" className="text-foreground">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    className="focus-visible:ring-ring/45 rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3"
                    href={item.path}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </>
  );
}
