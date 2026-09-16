import type { ShiftKind } from "@/features/schedule/domain";
import { SHIFT_LABELS } from "@/features/schedule/presentation/calendar-view";
import { cn } from "@/lib/utils";

import { shiftPresentation } from "./calendar-month-grid";

export function ShiftLegend() {
  return (
    <div
      className="shift-legend mt-5 flex flex-wrap gap-x-5 gap-y-2"
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
  );
}
