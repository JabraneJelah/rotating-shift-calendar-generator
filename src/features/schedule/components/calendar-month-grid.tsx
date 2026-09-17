import { Moon, Pause, Sun } from "lucide-react";

import type {
  ScheduleOccurrence,
  ShiftKind,
  WeekStart,
} from "@/features/schedule/domain";
import type {
  EffectiveScheduleDate,
  ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
import {
  formatFullDate,
  getWeekdayLabels,
} from "@/features/schedule/presentation/calendar-view";
import {
  formatShiftTimeSummary,
  getShiftDisplay,
  SHIFT_COLOR_PRESENTATION,
} from "@/features/schedule/presentation/planner-shift-presentation";
import { presentEffectiveDate } from "@/features/schedule/presentation/effective-schedule-presentation";
import { cn } from "@/lib/utils";

type CalendarMonthGridProps = {
  readonly label: string;
  readonly weeks: readonly (readonly (ScheduleOccurrence | null)[])[];
  readonly weekStart: WeekStart;
  readonly compact?: boolean;
  readonly planner?: ShiftDefinitionRegistry | null;
  readonly effectiveDates?: readonly EffectiveScheduleDate[];
};

export const shiftPresentation = {
  day: { icon: Sun, className: "border-amber-300/80 bg-day/70" },
  night: { icon: Moon, className: "border-indigo-300/80 bg-night/75" },
  off: { icon: Pause, className: "border-emerald-300/80 bg-off/70" },
} satisfies Record<ShiftKind, { icon: typeof Sun; className: string }>;

export function CalendarMonthGrid({
  label,
  weeks,
  weekStart,
  compact = false,
  planner = null,
  effectiveDates,
}: CalendarMonthGridProps) {
  const weekdayLabels = getWeekdayLabels(weekStart);
  const effectiveByDate = new Map(
    effectiveDates?.map((value) => [value.date, value]),
  );

  return (
    <table
      className={cn(
        "w-full table-fixed border-separate",
        compact ? "border-spacing-0.5" : "border-spacing-1 sm:border-spacing-2",
      )}
    >
      <caption
        className={compact ? "mb-1 caption-top text-sm font-bold" : "sr-only"}
      >
        {label} work schedule
      </caption>
      <thead>
        <tr>
          {weekdayLabels.short.map((weekday, index) => (
            <th
              abbr={weekdayLabels.full[index]}
              className={cn(
                "text-muted-foreground pb-1 text-center font-bold tracking-wide uppercase",
                compact ? "text-[0.5rem]" : "text-[0.65rem] sm:text-xs",
              )}
              key={weekday}
              scope="col"
            >
              {compact ? weekday.slice(0, 1) : weekday}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, weekIndex) => (
          <tr key={weekIndex}>
            {week.map((occurrence, dayIndex) => {
              if (occurrence === null) {
                return <td aria-hidden="true" key={`empty-${dayIndex}`} />;
              }

              const presentation = shiftPresentation[occurrence.shift];
              const display = getShiftDisplay(occurrence.shift, planner);
              const effective = effectiveByDate.get(occurrence.date);
              const effectiveDisplay =
                effective === undefined
                  ? null
                  : presentEffectiveDate(effective);
              const Icon = presentation.icon;
              const dayNumber = Number(occurrence.date.slice(-2));
              const timeSummary =
                display.definition === null
                  ? null
                  : formatShiftTimeSummary(display.definition);
              const fullLabel = `${formatFullDate(occurrence.date)} — ${effectiveDisplay?.description ?? `${display.name}${timeSummary === null ? "" : `, ${timeSummary}`}`}`;
              const cellClassName =
                effectiveDisplay !== null
                  ? effectiveDisplay.cellClassName
                  : display.definition === null
                    ? presentation.className
                    : SHIFT_COLOR_PRESENTATION[display.definition.color]
                        .cellClassName;

              return (
                <td
                  aria-label={fullLabel}
                  className={cn(
                    "rounded-lg border align-top",
                    compact ? "h-8" : "h-14 sm:h-20",
                    cellClassName,
                  )}
                  key={occurrence.date}
                >
                  <time
                    className={cn(
                      "flex h-full min-w-0 flex-col items-center justify-center text-center",
                      compact ? "gap-0 p-0.5" : "gap-0.5 p-1",
                    )}
                    dateTime={occurrence.date}
                  >
                    <span
                      aria-hidden="true"
                      className={
                        compact
                          ? "text-[0.58rem] font-bold"
                          : "text-xs font-bold sm:text-sm"
                      }
                    >
                      {dayNumber}
                    </span>
                    {compact ||
                    (effective !== undefined &&
                      effective.primary.origin !== "generated") ? null : (
                      <Icon aria-hidden="true" className="size-3.5 sm:size-4" />
                    )}
                    <span
                      aria-hidden="true"
                      className={
                        compact
                          ? "text-[0.48rem] leading-none font-semibold"
                          : "text-[0.59rem] leading-none font-semibold sm:text-xs"
                      }
                    >
                      {compact
                        ? (
                            effectiveDisplay?.shortLabel ?? display.shortLabel
                          ).slice(0, 1)
                        : (effectiveDisplay?.shortLabel ?? display.shortLabel)}
                    </span>
                    {effectiveDisplay?.additionalLabel ? (
                      <span
                        aria-hidden="true"
                        className="text-[0.46rem] leading-none font-bold"
                      >
                        +A
                      </span>
                    ) : null}
                    {effectiveDisplay?.hasNote ? (
                      <span
                        aria-hidden="true"
                        className="text-[0.46rem] leading-none"
                      >
                        {compact ? "•" : "Note"}
                      </span>
                    ) : null}
                  </time>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
