import type { DomainResult } from "@/features/schedule/domain";
import type { ShiftDefinitionRegistry } from "@/features/schedule/planner";
import { formatFullDate } from "@/features/schedule/presentation/calendar-view";
import { getShiftDisplay } from "@/features/schedule/presentation/planner-shift-presentation";
import type { ScheduleInsights as ScheduleInsightsValue } from "@/features/schedule/presentation/schedule-insights";

type ScheduleInsightsProps = {
  readonly result: DomainResult<ScheduleInsightsValue>;
  readonly planner?: ShiftDefinitionRegistry | null;
};

export function ScheduleInsights({
  result,
  planner = null,
}: ScheduleInsightsProps) {
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
              {getShiftDisplay(result.value.nextPosition.shift, planner).name}{" "}
              tomorrow
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Next working day
            </dt>
            <dd className="mt-1 font-semibold">
              {getShiftDisplay(result.value.nextWorkingDay.shift, planner).name}{" "}
              on {formatFullDate(result.value.nextWorkingDay.date)}
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
