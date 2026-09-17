import type { ShiftKind } from "@/features/schedule/domain";
import {
  calculateNominalShift,
  type EffectiveScheduleDate,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
import { SHIFT_LABELS } from "@/features/schedule/presentation/calendar-view";
import {
  formatNominalMinutes,
  formatShiftTimeSummary,
  getShiftDisplay,
  SHIFT_COLOR_PRESENTATION,
} from "@/features/schedule/presentation/planner-shift-presentation";
import { cn } from "@/lib/utils";

import { shiftPresentation } from "./calendar-month-grid";

type ShiftLegendProps = {
  readonly planner?: ShiftDefinitionRegistry | null;
  readonly effectiveDates?: readonly EffectiveScheduleDate[];
};

export function ShiftLegend({
  planner = null,
  effectiveDates,
}: ShiftLegendProps) {
  const primaryKinds = new Set(
    effectiveDates?.map(({ primary }) => primary.kind),
  );
  const hasTraining = effectiveDates?.some(
    ({ primary }) => primary.kind === "work" && primary.origin === "training",
  );
  const hasAdditional = effectiveDates?.some(
    ({ additionalWork }) => additionalWork !== null,
  );
  const hasNote = effectiveDates?.some(({ note }) => note !== null);
  return (
    <div
      className="shift-legend mt-5 flex flex-wrap gap-x-5 gap-y-2"
      aria-label="Shift legend"
    >
      {(Object.keys(SHIFT_LABELS) as ShiftKind[]).map((shift) => {
        const presentation = shiftPresentation[shift];
        const display = getShiftDisplay(shift, planner);
        const Icon = presentation.icon;
        const colorClassName =
          display.definition === null
            ? presentation.className
            : SHIFT_COLOR_PRESENTATION[display.definition.color].cellClassName;
        const timeSummary =
          display.definition === null
            ? null
            : formatShiftTimeSummary(display.definition);
        const calculation =
          display.definition?.time === undefined
            ? null
            : calculateNominalShift(display.definition.time);

        return (
          <span
            className="inline-flex items-center gap-2 text-sm font-medium"
            key={shift}
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-lg border",
                colorClassName,
              )}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            <span>
              <span className="font-semibold">
                {display.name}
                {display.definition === null ? "" : ` (${display.shortLabel})`}
              </span>
              {timeSummary === null ? null : (
                <span className="text-muted-foreground block text-xs">
                  {timeSummary}
                  {calculation?.ok
                    ? ` · ${formatNominalMinutes(calculation.value.netMinutes)} net`
                    : ""}
                </span>
              )}
            </span>
          </span>
        );
      })}
      {primaryKinds.has("leave") ? (
        <span className="text-sm font-semibold">LV — Leave</span>
      ) : null}
      {primaryKinds.has("sick") ? (
        <span className="text-sm font-semibold">S — Sick</span>
      ) : null}
      {hasTraining ? (
        <span className="text-sm font-semibold">TR — Training</span>
      ) : null}
      {hasAdditional ? (
        <span className="text-sm font-semibold">+A — Additional work</span>
      ) : null}
      {hasNote ? (
        <span className="text-sm font-semibold">
          Note — Private note attached (contents hidden)
        </span>
      ) : null}
    </div>
  );
}
