export type ScheduleViewMode = "month" | "year";

type ScheduleViewControlsProps = {
  readonly value: ScheduleViewMode;
  readonly onChange: (value: ScheduleViewMode) => void;
};

export function ScheduleViewControls({
  value,
  onChange,
}: ScheduleViewControlsProps) {
  return (
    <fieldset className="print-hidden border-border mt-8 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">Schedule view</legend>
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
  );
}
