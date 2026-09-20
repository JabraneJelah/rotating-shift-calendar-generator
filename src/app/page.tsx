import {
  ArrowRight,
  CalendarCheck2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { ScheduleGenerator } from "@/features/schedule";

const outcomes = [
  { label: "Choose a proven pattern", icon: Sparkles },
  { label: "See a clear monthly calendar", icon: CalendarCheck2 },
  { label: "No account required", icon: ShieldCheck },
];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="print-hidden">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
          <div className="max-w-4xl">
            <p className="text-primary text-sm font-semibold">
              A practical planner for rotating work
            </p>
            <h1 className="mt-3 max-w-4xl text-lg font-bold tracking-tight sm:text-xl">
              Generate your rotating work calendar in seconds.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
              Turn repeating day, night, and off-duty patterns into a clear
              monthly schedule—free, private, and ready whenever you need it.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {outcomes.map(({ label, icon: Icon }) => (
                <li
                  className="text-foreground flex items-center gap-2 text-sm font-medium"
                  key={label}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>

            <a
              className="text-primary focus-visible:ring-ring/45 mt-9 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3"
              href="#generator"
            >
              Start building your calendar
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <div
        id="generator"
        className="mx-auto w-full max-w-6xl scroll-mt-5 px-3 pb-14 sm:px-8 sm:pb-20"
      >
        <ScheduleGenerator />
      </div>

      <section className="print-hidden border-border border-t">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Explore shift patterns
          </h2>
          <p className="text-muted-foreground mt-2 max-w-3xl leading-7">
            Compare the exact cycles supported by the generator, see verified
            dated examples, and learn how to choose the correct start date.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Link
              className="text-primary font-semibold underline-offset-4 hover:underline"
              href="/shift-schedules"
            >
              Compare all shift schedules
            </Link>
            <Link
              className="text-primary font-semibold underline-offset-4 hover:underline"
              href="/shift-schedules/4-on-4-off"
            >
              4 on / 4 off guide
            </Link>
            <Link
              className="text-primary font-semibold underline-offset-4 hover:underline"
              href="/shift-schedules/2-2-3"
            >
              2-2-3 guide
            </Link>
            <Link
              className="text-primary font-semibold underline-offset-4 hover:underline"
              href="/about"
            >
              About the methodology
            </Link>
          </div>
        </div>
      </section>

      <section className="print-hidden border-border bg-muted/35 border-t">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
          <h2 className="text-lg font-bold tracking-tight">
            Private by design
          </h2>
          <p className="text-muted-foreground mt-2 max-w-3xl leading-7">
            Your schedule is calculated locally in your browser. There is no
            account, database, tracking script, or remote schedule storage.
          </p>
        </div>
      </section>
    </main>
  );
}
