import type { Metadata } from "next";
import Link from "next/link";

import { pageSeo } from "@/content/site-pages";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(pageSeo.about);

export default function AboutPage() {
  return (
    <main id="main-content">
      <article className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            About the tool
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
            About Shift Calendar
          </h1>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            Shift Calendar turns a confirmed repeating Day, Night, and Off
            sequence into readable monthly and yearly date views. It is for
            people who need to inspect, plan around, print, or export a rotating
            rota.
          </p>
        </header>

        <div className="mt-12 space-y-10">
          <section aria-labelledby="method-heading">
            <h2
              id="method-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Calculation methodology
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              A schedule consists of an ordered cycle and an exact start date.
              The start date is position 1. For each requested calendar date,
              the tool measures its whole-day offset from that anchor and maps
              it back to a cycle position. This date-only approach avoids
              treating a rota position as a clock time or time-zone conversion.
            </p>
            <p className="text-muted-foreground mt-3 leading-7">
              Preset facts and examples in the schedule guides are generated
              from the same tested domain rules as the interactive calendar.
              Editorial explanations are checked against those rules and avoid
              claims about shift duration, compensation, or employer policy.
            </p>
          </section>

          <section aria-labelledby="privacy-heading">
            <h2
              id="privacy-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Local and private by design
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              Schedule calculation happens in your browser. The current product
              has no accounts, database, analytics, or remote schedule storage.
              A configured schedule link places the schedule settings in the
              URL, so anyone you share that link with can read and reproduce
              those settings.
            </p>
          </section>

          <section aria-labelledby="outputs-heading">
            <h2
              id="outputs-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Calendar files and printing
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              Generated schedules can be viewed by month or year and printed
              using the browser’s print dialog. ICS export covers the visible
              month as all-day calendar events; importing, reminders, and later
              edits are controlled by the receiving calendar application.
            </p>
          </section>

          <section aria-labelledby="limits-heading">
            <h2
              id="limits-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Current limitations
            </h2>
            <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 leading-7">
              <li>
                Presets model fixed Day or fixed Night working positions; they
                do not automatically rotate between them.
              </li>
              <li>
                The tool does not know employer exceptions, leave, swaps,
                overtime, holidays, or shift times.
              </li>
              <li>
                ICS export is limited to the visible month rather than a full
                year.
              </li>
              <li>
                It is a planning aid, not legal, payroll, employment, or medical
                advice.
              </li>
            </ul>
          </section>

          <section aria-labelledby="accuracy-heading">
            <h2
              id="accuracy-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Accuracy and responsibility
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              The calculation engine is covered by unit and browser tests,
              including date boundaries, leap years, preset cycles, custom
              cycles, sharing, export, and print controls. Software checks do
              not establish which rota an employer uses. Verify the cycle, start
              date, and known dates against an official source before relying on
              a calendar.
            </p>
          </section>

          <nav
            aria-label="Explore Shift Calendar"
            className="border-border border-t pt-8"
          >
            <h2 className="text-xl font-bold">Explore the product</h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <li>
                <Link
                  className="text-primary font-semibold underline-offset-4 hover:underline"
                  href="/#generator"
                >
                  Open the shift calendar generator
                </Link>
              </li>
              <li>
                <Link
                  className="text-primary font-semibold underline-offset-4 hover:underline"
                  href="/shift-schedules"
                >
                  Compare supported shift patterns
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </article>
    </main>
  );
}
