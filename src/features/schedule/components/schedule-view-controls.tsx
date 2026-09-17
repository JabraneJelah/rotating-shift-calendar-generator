import type { WeekStart } from "@/features/schedule/domain";

export type ScheduleViewMode = "month" | "year";

type ScheduleViewControlsProps = {
  readonly value: ScheduleViewMode;
  readonly weekStart: WeekStart;
  readonly onChange: (value: ScheduleViewMode) => void;
  readonly onWeekStartChange: (value: WeekStart) => void;
};

export function ScheduleViewControls({
  value,
  weekStart,
  onChange,
  onWeekStartChange,
}: ScheduleViewControlsProps) {
  return (
    <section
      aria-label="Calendar preferences"
      className="print-hidden border-border mt-8 grid gap-4 rounded-xl border p-4 sm:grid-cols-2"
    >
      <fieldset>
        <legend className="text-sm font-bold">Schedule view</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {(["month", "year"] as const).map((mode) => (
            <label
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold"
              key={mode}
            >
              <input
                checked={value === mode}
                className="accent-primary size-4"
                name="schedule-view"
                onChange={() => onChange(mode)}
                type="radio"
                value={mode}
              />
              {mode === "month" ? "Month" : "Year"}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold">Week starts on</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {(["monday", "sunday"] as const).map((day) => (
            <label
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold"
              key={day}
            >
              <input
                checked={weekStart === day}
                className="accent-primary size-4"
                name="week-start"
                onChange={() => onWeekStartChange(day)}
                type="radio"
                value={day}
              />
              {day === "monday" ? "Monday" : "Sunday"}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
