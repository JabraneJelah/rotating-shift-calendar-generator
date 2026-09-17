import type { FormEvent } from "react";

import { CalendarPlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  FixedPresetDefinition,
  PresetId,
  RotatingPresetDefinition,
  ShiftKind,
  WorkingShiftKind,
} from "@/features/schedule/domain";
import {
  PRESET_DEFINITIONS,
  getPresetDefinition,
} from "@/features/schedule/domain";
import type { ScheduleFieldErrors } from "@/features/schedule/presentation/schedule-error-messages";
import type { PlannerFieldErrors } from "@/features/schedule/presentation/planner-error-messages";

import { CustomCycleEditor } from "./custom-cycle-editor";
import { PresetCyclePreview } from "./preset-cycle-preview";
import {
  ShiftDetailsPanel,
  type EditableShiftDetails,
} from "./shift-details-panel";

export type ScheduleMode = "preset" | "custom";

type ScheduleFormProps = {
  readonly mode: ScheduleMode;
  readonly presetId: PresetId;
  readonly workingShift: WorkingShiftKind;
  readonly startDate: string;
  readonly customCycle: readonly ShiftKind[];
  readonly disabled: boolean;
  readonly errors: ScheduleFieldErrors;
  readonly plannerErrors: PlannerFieldErrors;
  readonly shiftDetails: EditableShiftDetails;
  readonly hasGenerated: boolean;
  readonly onModeChange: (mode: ScheduleMode) => void;
  readonly onPresetChange: (presetId: PresetId) => void;
  readonly onWorkingShiftChange: (shift: WorkingShiftKind) => void;
  readonly onStartDateChange: (value: string) => void;
  readonly onCustomCycleChange: (cycle: readonly ShiftKind[]) => void;
  readonly onShiftDetailsChange: (value: EditableShiftDetails) => void;
  readonly onShiftDetailsReset: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const controlClassName =
  "border-border bg-background focus-visible:ring-ring/45 min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function ScheduleForm({
  mode,
  presetId,
  workingShift,
  startDate,
  customCycle,
  disabled,
  errors,
  plannerErrors,
  shiftDetails,
  hasGenerated,
  onModeChange,
  onPresetChange,
  onWorkingShiftChange,
  onStartDateChange,
  onCustomCycleChange,
  onShiftDetailsChange,
  onShiftDetailsReset,
  onSubmit,
}: ScheduleFormProps) {
  const selectedPreset = getPresetDefinition(presetId);
  const fixedPresets = PRESET_DEFINITIONS.filter(
    (definition): definition is FixedPresetDefinition =>
      definition.type === "fixed",
  );
  const rotatingPresets = PRESET_DEFINITIONS.filter(
    (definition): definition is RotatingPresetDefinition =>
      definition.type === "rotating",
  );
  const workingKinds =
    mode === "custom"
      ? customCycle
      : selectedPreset.type === "fixed"
        ? [workingShift]
        : selectedPreset.cycle;
  const showDay = workingKinds.includes("day");
  const showNight = workingKinds.includes("night");

  return (
    <form className="space-y-6" noValidate onSubmit={onSubmit}>
      <fieldset>
        <legend className="text-sm font-semibold">Schedule type</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              [
                "preset",
                "Preset schedule",
                "Start with a verified fixed or rotating pattern.",
              ],
              [
                "custom",
                "Custom cycle",
                "Build your own repeating Day, Night, and Off sequence.",
              ],
            ] as const
          ).map(([value, label, description]) => (
            <label
              className={`focus-within:ring-ring/45 flex min-h-20 cursor-pointer gap-3 rounded-xl border p-4 transition-colors focus-within:ring-3 motion-reduce:transition-none ${
                mode === value
                  ? "border-primary bg-primary/8"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
              key={value}
            >
              <input
                checked={mode === value}
                className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                disabled={disabled}
                name="schedule-mode"
                onChange={() => onModeChange(value)}
                type="radio"
                value={value}
              />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="text-muted-foreground mt-1 block text-xs leading-5">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "preset" ? (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="schedule-preset">
              Shift pattern
            </label>
            <select
              className={`${controlClassName} mt-2`}
              aria-describedby="preset-preview-description"
              disabled={disabled}
              id="schedule-preset"
              onChange={(event) =>
                onPresetChange(event.target.value as PresetId)
              }
              value={presetId}
            >
              <optgroup label="Fixed Day or Night">
                {fixedPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Rotating Day and Night">
                {rotatingPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {selectedPreset.type === "fixed" ? (
            <fieldset>
              <legend className="text-sm font-semibold">Working shift</legend>
              <div className="mt-2 grid max-w-md grid-cols-2 gap-2">
                {(
                  [
                    ["day", "Day shift"],
                    ["night", "Night shift"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    className={`focus-within:ring-ring/45 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium focus-within:ring-3 ${
                      workingShift === value
                        ? "border-primary bg-primary/8"
                        : "border-border bg-background"
                    }`}
                    key={value}
                  >
                    <input
                      checked={workingShift === value}
                      className="size-4 accent-[var(--primary)]"
                      disabled={disabled}
                      name="working-shift"
                      onChange={() => onWorkingShiftChange(value)}
                      type="radio"
                      value={value}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                The preset stays on the selected shift; it does not rotate
                automatically.
              </p>
            </fieldset>
          ) : null}

          <PresetCyclePreview presetId={presetId} workingShift={workingShift} />
        </div>
      ) : (
        <CustomCycleEditor
          cycle={customCycle}
          disabled={disabled}
          error={errors.cycle}
          onChange={onCustomCycleChange}
        />
      )}

      <div>
        <label className="text-sm font-semibold" htmlFor="pattern-start-date">
          Pattern start date <span className="text-red-700">*</span>
        </label>
        <input
          aria-describedby={
            errors.startDate
              ? "pattern-start-help pattern-start-error"
              : "pattern-start-help"
          }
          aria-invalid={errors.startDate ? true : undefined}
          className={`${controlClassName} mt-2 sm:max-w-xs`}
          disabled={disabled}
          id="pattern-start-date"
          max="9999-12-31"
          min="0001-01-01"
          onChange={(event) => onStartDateChange(event.target.value)}
          required
          type="date"
          value={startDate}
        />
        <p
          id="pattern-start-help"
          className="text-muted-foreground mt-2 text-sm leading-6"
        >
          The selected date represents cycle day 1.
        </p>
        {errors.startDate ? (
          <p
            id="pattern-start-error"
            className="mt-2 text-sm font-semibold text-red-700"
          >
            {errors.startDate}
          </p>
        ) : null}
      </div>

      <ShiftDetailsPanel
        disabled={disabled}
        errors={plannerErrors}
        onChange={onShiftDetailsChange}
        onReset={onShiftDetailsReset}
        showDay={showDay}
        showNight={showNight}
        value={shiftDetails}
      />

      <Button className="w-full sm:w-auto" disabled={disabled} type="submit">
        <CalendarPlus2 aria-hidden="true" className="mr-2 size-4" />
        {hasGenerated ? "Update schedule" : "Generate schedule"}
      </Button>
    </form>
  );
}
