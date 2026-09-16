import { CalendarDays } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="print-hidden border-border/80 bg-background/95 border-b">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center px-5 sm:px-8">
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
      </div>
    </header>
  );
}
