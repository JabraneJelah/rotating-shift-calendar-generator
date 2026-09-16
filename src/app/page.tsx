import { ArrowRight, CalendarCheck2, FileDown, Printer } from "lucide-react";

import { GeneratorPlaceholder } from "@/features/schedule/components/generator-placeholder";

const outcomes = [
  { label: "See your rotation clearly", icon: CalendarCheck2 },
  { label: "Print a useful calendar", icon: Printer },
  { label: "Export it when it is ready", icon: FileDown },
];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_80%_0%,oklch(0.91_0.06_183),transparent_48%)]"
          aria-hidden="true"
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:py-24">
          <div>
            <p className="border-primary/20 bg-primary/8 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold">
              A practical planner for rotating work
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              Your shift pattern, made easier to see.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
              Shift Calendar is being built to turn repeating day, night, and
              off-duty patterns into a clear monthly or yearly calendar.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {outcomes.map(({ label, icon: Icon }) => (
                <li
                  className="text-foreground flex items-center gap-2.5 text-sm font-medium"
                  key={label}
                >
                  <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <a
              className="text-primary focus-visible:ring-ring/45 mt-9 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3"
              href="#generator-preview"
            >
              Preview the foundation
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>

          <div id="generator-preview" className="scroll-mt-6">
            <GeneratorPlaceholder />
          </div>
        </div>
      </section>

      <section className="border-border bg-muted/35 border-t">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
          <h2 className="text-lg font-bold tracking-tight">
            Built for clarity
          </h2>
          <p className="text-muted-foreground mt-2 max-w-3xl leading-7">
            The full generator will arrive in a later phase. This foundation
            focuses first on speed, accessibility, dependable dates, and a calm
            mobile experience.
          </p>
        </div>
      </section>
    </main>
  );
}
