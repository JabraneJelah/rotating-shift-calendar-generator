import type { DomainResult } from "@/features/schedule/domain";
import {
  formatFullDate,
  SHIFT_LABELS,
} from "@/features/schedule/presentation/calendar-view";
import type { ScheduleInsights as ScheduleInsightsValue } from "@/features/schedule/presentation/schedule-insights";

type ScheduleInsightsProps = {
  readonly result: DomainResult<ScheduleInsightsValue>;
};

export function ScheduleInsights({ result }: ScheduleInsightsProps) {
  return (
    <section
      aria-labelledby="schedule-insights-heading"
      className="schedule-insights border-border bg-primary/5 mt-5 rounded-xl border p-4"
    >
      <h4 className="text-sm font-bold" id="schedule-insights-heading">
        Up next
      </h4>
      {result.ok ? (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Next schedule position
            </dt>
            <dd className="mt-1 font-semibold">
              {SHIFT_LABELS[result.value.nextPosition.shift]} tomorrow
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Next working day
            </dt>
            <dd className="mt-1 font-semibold">
              {SHIFT_LABELS[result.value.nextWorkingDay.shift]} on{" "}
              {formatFullDate(result.value.nextWorkingDay.date)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          No future schedule date is available inside the supported calendar
          range.
        </p>
      )}
    </section>
  );
}
