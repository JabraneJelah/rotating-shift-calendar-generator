import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ISOYearMonth, ScheduleConfig } from "@/features/schedule/domain";
import type {
  EffectiveScheduleDate,
  EffectiveScheduleStatistics,
  ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
import {
  getAdjacentViewMonth,
  getScheduleName,
  type MonthlyCalendarView,
} from "@/features/schedule/presentation/calendar-view";

import { CalendarMonthGrid } from "./calendar-month-grid";
import { PersonalStatistics } from "./personal-statistics";
import { ShiftLegend } from "./shift-legend";

type MonthlyCalendarProps = {
  readonly config: ScheduleConfig;
  readonly view: MonthlyCalendarView;
  readonly headingRef: React.RefObject<HTMLHeadingElement | null>;
  readonly onNavigate: (viewMonth: ISOYearMonth) => void;
  readonly planner?: ShiftDefinitionRegistry | null;
  readonly effectiveDates?: readonly EffectiveScheduleDate[];
  readonly statistics?: EffectiveScheduleStatistics | null;
};

export function MonthlyCalendar({
  config,
  view,
  headingRef,
  onNavigate,
  planner = null,
  effectiveDates,
  statistics = null,
}: MonthlyCalendarProps) {
  const previousMonth = getAdjacentViewMonth(view.viewMonth, -1);
  const nextMonth = getAdjacentViewMonth(view.viewMonth, 1);

  return (
    <section
      className="monthly-calendar border-border mt-8 border-t pt-8"
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
            {view.label}
          </h3>
        </div>
        <div
          className="print-hidden flex items-center justify-between gap-2"
          aria-label="Calendar month navigation"
        >
          <Button
            aria-label="Show previous month"
            className="size-11 px-0"
            disabled={previousMonth === null}
            onClick={() => previousMonth && onNavigate(previousMonth)}
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <p
            className="min-w-36 text-center text-sm font-semibold"
            aria-live="polite"
          >
            {view.label}
          </p>
          <Button
            aria-label="Show next month"
            className="size-11 px-0"
            disabled={nextMonth === null}
            onClick={() => nextMonth && onNavigate(nextMonth)}
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>

      <dl
        aria-label="Monthly shift totals"
        className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-7"
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
            [statistics === null ? "Day" : "Base Day", view.counts.day],
            [statistics === null ? "Night" : "Base Night", view.counts.night],
            [statistics === null ? "Off" : "Base Off", view.counts.off],
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

      <div className="mt-5" data-calendar-container>
        <CalendarMonthGrid
          label={view.label}
          weeks={view.weeks}
          weekStart={view.weekStart}
          planner={planner}
          effectiveDates={effectiveDates}
        />
      </div>
      <ShiftLegend planner={planner} effectiveDates={effectiveDates} />
      {statistics === null ? null : (
        <PersonalStatistics scope="Monthly" statistics={statistics} />
      )}
    </section>
  );
}
