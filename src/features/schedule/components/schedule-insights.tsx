import { formatFullDate } from "@/features/schedule/presentation/calendar-view";
import { presentEffectiveDate } from "@/features/schedule/presentation/effective-schedule-presentation";
import type { EffectiveScheduleInsightsResult } from "@/features/schedule/presentation/schedule-insights";

type ScheduleInsightsProps = {
  readonly result: EffectiveScheduleInsightsResult;
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
              {presentEffectiveDate(result.value.nextPosition).name} tomorrow
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Next working day
            </dt>
            <dd className="mt-1 font-semibold">
              {result.value.nextWorkingDate === null
                ? "No working date in the next 366 days"
                : `${presentEffectiveDate(result.value.nextWorkingDate).name} on ${formatFullDate(result.value.nextWorkingDate.date)}`}
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
