import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ScheduleConfig } from "@/features/schedule/domain";
import { getScheduleName } from "@/features/schedule/presentation/calendar-view";
import {
  getAdjacentYear,
  type YearlyCalendarView,
} from "@/features/schedule/presentation/yearly-calendar-view";

import { CalendarMonthGrid } from "./calendar-month-grid";
import { ShiftLegend } from "./shift-legend";

type YearlyCalendarProps = {
  readonly config: ScheduleConfig;
  readonly view: YearlyCalendarView;
  readonly headingRef: React.RefObject<HTMLHeadingElement | null>;
  readonly onNavigate: (year: number) => void;
};

export function YearlyCalendar({
  config,
  view,
  headingRef,
  onNavigate,
}: YearlyCalendarProps) {
  const previousYear = getAdjacentYear(view.year, -1);
  const nextYear = getAdjacentYear(view.year, 1);

  return (
    <section
      className="yearly-calendar border-border mt-8 border-t pt-8"
      aria-labelledby="calendar-result-heading"
    >
      <p className="print-only print-site-name">Shift Calendar</p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="print-hidden text-primary text-sm font-semibold">
            Your generated schedule
          </p>
          <h3
            className="focus-visible:ring-ring/45 mt-1 text-2xl font-bold tracking-tight outline-none focus-visible:rounded-md focus-visible:ring-3"
            id="calendar-result-heading"
            ref={headingRef}
            tabIndex={-1}
          >
            {view.year} yearly schedule
          </h3>
        </div>
        <div
          className="print-hidden flex items-center justify-between gap-2"
          aria-label="Calendar year navigation"
        >
          <Button
            aria-label={
              previousYear === null
                ? "Previous year unavailable"
                : `Show ${previousYear}`
            }
            className="size-11 px-0"
            disabled={previousYear === null}
            onClick={() => previousYear !== null && onNavigate(previousYear)}
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <p
            className="min-w-24 text-center text-sm font-semibold"
            aria-live="polite"
          >
            {view.year}
          </p>
          <Button
            aria-label={
              nextYear === null ? "Next year unavailable" : `Show ${nextYear}`
            }
            className="size-11 px-0"
            disabled={nextYear === null}
            onClick={() => nextYear !== null && onNavigate(nextYear)}
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>

      <dl
        aria-label="Yearly shift totals"
        className="year-summary mt-6 grid grid-cols-2 gap-3 sm:grid-cols-9"
      >
        <div className="bg-muted/55 col-span-2 rounded-xl p-3 sm:col-span-2">
          <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Schedule
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {getScheduleName(config)}
          </dd>
          <dd className="text-muted-foreground mt-1 text-xs">
            Starts {config.startDate}
            {config.kind === "preset" && "workingShift" in config
              ? ` · ${config.workingShift === "day" ? "Day shift" : "Night shift"}`
              : ""}
          </dd>
        </div>
        {(
          [
            ["Year", view.year],
            ["Day", view.counts.day],
            ["Night", view.counts.night],
            ["Off", view.counts.off],
            ["Total dates", view.occurrences.length],
          ] as const
        ).map(([label, count]) => (
          <div className="bg-muted/55 rounded-xl p-3 text-center" key={label}>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-xl font-bold">{count}</dd>
          </div>
        ))}
        <div className="bg-muted/55 col-span-2 rounded-xl p-3 text-center">
          <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Weekend dates
          </dt>
          <dd className="mt-1 text-sm font-bold">
            {view.weekendDates.worked} of {view.weekendDates.total} worked
          </dd>
        </div>
      </dl>

      <div
        className="year-grid mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        data-calendar-container
      >
        {view.months.map((month, index) => (
          <article
            className={`year-month border-border rounded-xl border p-2 ${index === 6 ? "year-print-break" : ""}`}
            key={month.viewMonth}
          >
            <CalendarMonthGrid
              compact
              label={month.label}
              weeks={month.weeks}
              weekStart={view.weekStart}
            />
          </article>
        ))}
      </div>

      <ShiftLegend />
    </section>
  );
}
