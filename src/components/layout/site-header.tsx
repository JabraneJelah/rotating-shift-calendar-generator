import { CalendarDays } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="print-hidden border-border/80 bg-background/95 border-b">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2 sm:px-8">
        <Link
          className="focus-visible:ring-ring/45 inline-flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3"
          href="/"
          aria-label="Shift Calendar home"
        >
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg">
            <CalendarDays aria-hidden="true" className="size-5" />
          </span>
          <span>Shift Calendar</span>
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="flex flex-wrap items-center gap-x-1 sm:gap-x-2">
            {[
              { href: "/#generator", label: "Generator" },
              { href: "/shift-schedules", label: "Shift schedules" },
              { href: "/about", label: "About" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/45 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold outline-none focus-visible:ring-3 sm:px-3"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
