import type { EffectiveScheduleStatistics } from "@/features/schedule/planner";
import { formatStatisticsMinutes } from "@/features/schedule/presentation/effective-schedule-presentation";

type PersonalStatisticsProps = {
  readonly statistics: EffectiveScheduleStatistics;
  readonly scope: "Monthly" | "Yearly";
};

export function PersonalStatistics({
  statistics,
  scope,
}: PersonalStatisticsProps) {
  const items = [
    ["Working dates", statistics.workingDates],
    ["Day occurrences", statistics.categories.day],
    ...(statistics.categories.evening > 0
      ? [["Evening occurrences", statistics.categories.evening] as const]
      : []),
    ["Night occurrences", statistics.categories.night],
    ...(statistics.categories.other > 0
      ? [["Other occurrences", statistics.categories.other] as const]
      : []),
    ["Training dates", statistics.trainingOccurrences],
    ["Additional work", statistics.additionalWorkOccurrences],
    ["Leave dates", statistics.leaveDates],
    ["Sick dates", statistics.sickDates],
    ["Weekend working dates", statistics.weekendWorkingDates],
    ["Overnight occurrences", statistics.overnightOccurrences],
  ] as const;

  return (
    <section
      aria-labelledby={`${scope.toLowerCase()}-personal-statistics-heading`}
      className="personal-statistics border-border bg-primary/5 mt-5 rounded-xl border p-4"
    >
      <h4
        className="font-bold"
        id={`${scope.toLowerCase()}-personal-statistics-heading`}
      >
        {scope} personal statistics
      </h4>
      <p className="text-muted-foreground mt-1 text-sm">
        Effective dates after private date changes. Occurrence categories can
        overlap with Training or Additional work.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(([label, value]) => (
          <div className="bg-background rounded-lg border p-3" key={label}>
            <dt className="text-muted-foreground text-xs font-semibold">
              {label}
            </dt>
            <dd className="mt-1 text-xl font-bold">{value}</dd>
          </div>
        ))}
        <div className="bg-background col-span-2 rounded-lg border p-3">
          <dt className="text-muted-foreground text-xs font-semibold">
            {statistics.complete ? "Net scheduled hours" : "Known net hours"}
          </dt>
          <dd className="mt-1 text-xl font-bold">
            {formatStatisticsMinutes(statistics.knownNetMinutes)}
          </dd>
          <dd className="text-muted-foreground text-xs">
            Gross {formatStatisticsMinutes(statistics.knownGrossMinutes)} ·
            Break {formatStatisticsMinutes(statistics.knownBreakMinutes)}
          </dd>
        </div>
      </dl>
      {!statistics.complete ? (
        <p className="mt-3 font-semibold text-amber-900">
          Incomplete: {statistics.untimedWorkingOccurrences} working{" "}
          {statistics.untimedWorkingOccurrences === 1
            ? "shift has"
            : "shifts have"}{" "}
          no times. Known values are subtotals.
        </p>
      ) : null}
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        Scheduled-hour totals use nominal local clock times. They are planning
        estimates, not payroll, timecard, legal-rest, or DST-adjusted
        elapsed-hour calculations.
      </p>
    </section>
  );
}
