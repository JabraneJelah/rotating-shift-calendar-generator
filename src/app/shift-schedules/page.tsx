import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { pageSeo } from "@/content/site-pages";
import { shiftScheduleList } from "@/content/shift-schedules";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(pageSeo.schedules);

export default function ShiftSchedulesPage() {
  return (
    <main id="main-content">
      <article className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <Breadcrumbs
          items={[
            { label: "Home", path: "/" },
            { label: "Shift schedules", path: "/shift-schedules" },
          ]}
        />

        <header className="mt-8 max-w-3xl">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Pattern library
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
            Rotating shift schedule patterns
          </h1>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            A repeating shift pattern assigns Day, Night, or Off to each
            position in a cycle. A confirmed start date anchors position 1, and
            the sequence repeats across exact calendar dates.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          <section aria-labelledby="compare-heading">
            <h2
              id="compare-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Compare the reviewed guides
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              The generator supports six verified presets. These two
              individually reviewed guides cover fixed schedules whose working
              positions can be labeled Day or Night. Counts refer to cycle
              positions, not hours or compensation.
            </p>
            <div className="border-border mt-5 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Reviewed fixed shift pattern comparison
                </caption>
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Pattern
                    </th>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Cycle length
                    </th>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Working positions
                    </th>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Off positions
                    </th>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Working shift
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shiftScheduleList.map((guide) => (
                    <tr className="border-border border-t" key={guide.presetId}>
                      <th className="px-4 py-3 font-semibold" scope="row">
                        <Link
                          className="text-primary underline-offset-4 hover:underline"
                          href={guide.seo.path}
                        >
                          {guide.label}
                        </Link>
                      </th>
                      <td className="px-4 py-3">{guide.cycleLength} days</td>
                      <td className="px-4 py-3">{guide.workPositions}</td>
                      <td className="px-4 py-3">{guide.offPositions}</td>
                      <td className="px-4 py-3">Fixed Day or Night</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="choose-heading">
            <h2
              id="choose-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Choose by sequence, not name alone
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {shiftScheduleList.map((guide) => (
                <article
                  className="border-border bg-card rounded-xl border p-5"
                  key={guide.presetId}
                >
                  <h3 className="text-xl font-bold">{guide.label}</h3>
                  <p className="text-muted-foreground mt-2 leading-7">
                    {guide.definition}
                  </p>
                  <Link
                    className="text-primary mt-4 inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
                    href={guide.seo.path}
                  >
                    Read the {guide.label} guide
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="custom-heading">
            <h2
              id="custom-heading"
              className="text-2xl font-bold tracking-tight"
            >
              Your rota may use a different cycle
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              Shift Calendar also supports custom Day, Night, and Off sequences.
              Use a custom pattern when no preset exactly matches a confirmed
              rota; do not force an employer variation into a similarly named
              preset.
            </p>
          </section>

          <aside className="border-primary/20 bg-primary/8 rounded-xl border p-5 sm:p-6">
            <h2 className="text-xl font-bold">
              Turn a confirmed pattern into dates
            </h2>
            <p className="text-muted-foreground mt-2 leading-7">
              Open the generator, select a preset or custom cycle, and enter a
              known position-1 date. Always compare the result with your actual
              rota.
            </p>
            <Link
              className="bg-primary text-primary-foreground focus-visible:ring-ring/45 mt-5 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold outline-none hover:opacity-90 focus-visible:ring-3"
              href="/#generator"
            >
              Create a shift calendar
            </Link>
          </aside>

          <p className="text-muted-foreground border-border border-t pt-8 leading-7">
            These guides explain the product’s calculation rules, not employer
            policy, working hours, pay, overtime, legal requirements, or health
            advice. Read more about the{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/about"
            >
              calculation and content methodology
            </Link>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
