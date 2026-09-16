import { ChevronLeft, ChevronRight, Moon, Pause, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ISOYearMonth,
  ScheduleConfig,
  ShiftKind,
} from "@/features/schedule/domain";
import {
  formatFullDate,
  getAdjacentViewMonth,
  SHIFT_LABELS,
  SHIFT_SHORT_LABELS,
  WEEKDAY_FULL_LABELS,
  WEEKDAY_SHORT_LABELS,
  type MonthlyCalendarView,
} from "@/features/schedule/presentation/calendar-view";
import { cn } from "@/lib/utils";

import { ScheduleActions } from "./schedule-actions";

type MonthlyCalendarProps = {
  readonly config: ScheduleConfig;
  readonly view: MonthlyCalendarView;
  readonly headingRef: React.RefObject<HTMLHeadingElement | null>;
  readonly onNavigate: (viewMonth: ISOYearMonth) => void;
};

const shiftPresentation = {
  day: {
    icon: Sun,
    className: "border-amber-300/80 bg-day/70",
  },
  night: {
    icon: Moon,
    className: "border-indigo-300/80 bg-night/75",
  },
  off: {
    icon: Pause,
    className: "border-emerald-300/80 bg-off/70",
  },
} satisfies Record<ShiftKind, { icon: typeof Sun; className: string }>;

function scheduleName(config: ScheduleConfig): string {
  if (config.kind === "custom") {
    return "Custom cycle";
  }

  return config.presetId === "4-on-4-off"
    ? "4 on / 4 off"
    : "2-2-3 fixed shift";
}

export function MonthlyCalendar({
  config,
  view,
  headingRef,
  onNavigate,
}: MonthlyCalendarProps) {
  const previousMonth = getAdjacentViewMonth(view.viewMonth, -1);
  const nextMonth = getAdjacentViewMonth(view.viewMonth, 1);

  return (
    <section
      className="border-border mt-8 border-t pt-8"
      aria-labelledby="calendar-result-heading"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold">
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
          className="flex items-center justify-between gap-2"
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
        className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        <div className="bg-muted/55 col-span-2 rounded-xl p-3 sm:col-span-2">
          <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Schedule
          </dt>
          <dd className="mt-1 text-sm font-semibold">{scheduleName(config)}</dd>
          <dd className="text-muted-foreground mt-1 text-xs">
            Starts {config.startDate}
            {config.kind === "preset"
              ? ` · ${config.workingShift === "day" ? "Day shift" : "Night shift"}`
              : ""}
          </dd>
        </div>
        {(
          [
            ["Day", view.counts.day],
            ["Night", view.counts.night],
            ["Off", view.counts.off],
          ] as const
        ).map(([label, count]) => (
          <div className="bg-muted/55 rounded-xl p-3 text-center" key={label}>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-xl font-bold">{count}</dd>
          </div>
        ))}
      </dl>

      <ScheduleActions config={config} view={view} />

      <div className="mt-5" data-calendar-container>
        <table className="w-full table-fixed border-separate border-spacing-1 sm:border-spacing-2">
          <caption className="sr-only">{view.label} work schedule</caption>
          <thead>
            <tr>
              {WEEKDAY_SHORT_LABELS.map((label, index) => (
                <th
                  abbr={WEEKDAY_FULL_LABELS[index]}
                  className="text-muted-foreground pb-1 text-center text-[0.65rem] font-bold tracking-wide uppercase sm:text-xs"
                  key={label}
                  scope="col"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((occurrence, dayIndex) => {
                  if (occurrence === null) {
                    return <td aria-hidden="true" key={`empty-${dayIndex}`} />;
                  }

                  const presentation = shiftPresentation[occurrence.shift];
                  const Icon = presentation.icon;
                  const dayNumber = Number(occurrence.date.slice(-2));
                  const fullLabel = `${formatFullDate(occurrence.date)} — ${SHIFT_LABELS[occurrence.shift]}`;

                  return (
                    <td
                      aria-label={fullLabel}
                      className={cn(
                        "h-14 rounded-lg border align-top sm:h-20",
                        presentation.className,
                      )}
                      key={occurrence.date}
                    >
                      <time
                        className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 p-1 text-center"
                        dateTime={occurrence.date}
                      >
                        <span
                          className="text-xs font-bold sm:text-sm"
                          aria-hidden="true"
                        >
                          {dayNumber}
                        </span>
                        <Icon
                          aria-hidden="true"
                          className="size-3.5 sm:size-4"
                        />
                        <span
                          className="text-[0.59rem] leading-none font-semibold sm:text-xs"
                          aria-hidden="true"
                        >
                          {SHIFT_SHORT_LABELS[occurrence.shift]}
                        </span>
                      </time>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-x-5 gap-y-2"
        aria-label="Shift legend"
      >
        {(Object.keys(SHIFT_LABELS) as ShiftKind[]).map((shift) => {
          const presentation = shiftPresentation[shift];
          const Icon = presentation.icon;

          return (
            <span
              className="inline-flex items-center gap-2 text-sm font-medium"
              key={shift}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-lg border",
                  presentation.className,
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
              {SHIFT_LABELS[shift]}
            </span>
          );
        })}
      </div>
    </section>
  );
}
