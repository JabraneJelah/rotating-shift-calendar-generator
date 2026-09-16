import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MAX_CUSTOM_CYCLE_LENGTH,
  type ShiftKind,
} from "@/features/schedule/domain";

type CustomCycleEditorProps = {
  readonly cycle: readonly ShiftKind[];
  readonly disabled: boolean;
  readonly error?: string;
  readonly onChange: (cycle: readonly ShiftKind[]) => void;
};

export function CustomCycleEditor({
  cycle,
  disabled,
  error,
  onChange,
}: CustomCycleEditorProps) {
  const atMinimum = cycle.length === 1;
  const atMaximum = cycle.length >= MAX_CUSTOM_CYCLE_LENGTH;

  function updatePosition(index: number, shift: ShiftKind) {
    onChange(
      cycle.map((value, itemIndex) => (itemIndex === index ? shift : value)),
    );
  }

  function removePosition(index: number) {
    if (atMinimum) {
      return;
    }

    onChange(cycle.filter((_, itemIndex) => itemIndex !== index));
  }

  function addPosition() {
    if (atMaximum) {
      return;
    }

    onChange([...cycle, "off"]);
  }

  return (
    <fieldset
      className="border-border rounded-2xl border p-4"
      aria-describedby={
        error ? "custom-cycle-help custom-cycle-error" : "custom-cycle-help"
      }
    >
      <legend className="px-1 text-sm font-semibold">Repeating cycle</legend>
      <p
        id="custom-cycle-help"
        className="text-muted-foreground mt-1 text-sm leading-6"
      >
        Set each position in order. After the final day, the cycle starts again.
      </p>

      <div className="mt-4 space-y-2">
        {cycle.map((shift, index) => (
          <div
            className="border-border bg-muted/35 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-2"
            key={index}
          >
            <span className="text-muted-foreground min-w-14 pl-1 text-xs font-semibold">
              Day {index + 1}
            </span>
            <label className="sr-only" htmlFor={`cycle-day-${index}`}>
              Shift for cycle day {index + 1}
            </label>
            <select
              id={`cycle-day-${index}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "custom-cycle-error" : undefined}
              className="border-border bg-background focus-visible:ring-ring/45 min-h-11 min-w-0 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
              disabled={disabled}
              value={shift}
              onChange={(event) =>
                updatePosition(index, event.target.value as ShiftKind)
              }
            >
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="off">Off</option>
            </select>
            <Button
              aria-label={`Remove cycle day ${index + 1}`}
              className="size-11 shrink-0 px-0"
              disabled={disabled || atMinimum}
              onClick={() => removePosition(index)}
              type="button"
              variant="outline"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {error ? (
        <p
          id="custom-cycle-error"
          className="mt-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          {cycle.length} of {MAX_CUSTOM_CYCLE_LENGTH} days
          {atMinimum ? " · Keep at least one day" : ""}
        </p>
        <Button
          disabled={disabled || atMaximum}
          onClick={addPosition}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="mr-2 size-4" />
          Add cycle day
        </Button>
      </div>
    </fieldset>
  );
}
