import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BUILTIN_DAY_DEFINITION_ID,
  BUILTIN_NIGHT_DEFINITION_ID,
  calculateNominalShift,
  SHIFT_COLOR_TOKENS,
  validateShiftDefinition,
  type ShiftColorToken,
  type ShiftDefinitionRegistryInput,
} from "@/features/schedule/planner";
import {
  type PlannerFieldErrors,
  presentPlannerErrors,
} from "@/features/schedule/presentation/planner-error-messages";
import {
  formatNominalMinutes,
  SHIFT_COLOR_PRESENTATION,
} from "@/features/schedule/presentation/planner-shift-presentation";
import { cn } from "@/lib/utils";

export type EditableShiftDefinition = {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly category: "day" | "night";
  readonly color: ShiftColorToken;
  readonly startTime: string;
  readonly endTime: string;
  readonly is24Hours: boolean;
  readonly breakMinutes: string;
};

export type EditableShiftDetails = {
  readonly day: EditableShiftDefinition;
  readonly night: EditableShiftDefinition;
};

export function createDefaultEditableShiftDetails(): EditableShiftDetails {
  return {
    day: {
      id: BUILTIN_DAY_DEFINITION_ID,
      name: "Day shift",
      shortLabel: "D",
      category: "day",
      color: "amber",
      startTime: "",
      endTime: "",
      is24Hours: false,
      breakMinutes: "0",
    },
    night: {
      id: BUILTIN_NIGHT_DEFINITION_ID,
      name: "Night shift",
      shortLabel: "N",
      category: "night",
      color: "indigo",
      startTime: "",
      endTime: "",
      is24Hours: false,
      breakMinutes: "0",
    },
  };
}

export function shiftDetailsToRegistryInput(
  value: EditableShiftDetails,
): ShiftDefinitionRegistryInput {
  return {
    definitions: [value.day, value.night],
    dayDefinitionId: BUILTIN_DAY_DEFINITION_ID,
    nightDefinitionId: BUILTIN_NIGHT_DEFINITION_ID,
  };
}

type ShiftDetailsPanelProps = {
  readonly value: EditableShiftDetails;
  readonly errors: PlannerFieldErrors;
  readonly disabled: boolean;
  readonly showDay: boolean;
  readonly showNight: boolean;
  readonly onChange: (value: EditableShiftDetails) => void;
  readonly onReset: () => void;
};

type DefinitionEditorProps = {
  readonly kind: "day" | "night";
  readonly index: 0 | 1;
  readonly value: EditableShiftDefinition;
  readonly errors: PlannerFieldErrors;
  readonly disabled: boolean;
  readonly onChange: (value: EditableShiftDefinition) => void;
};

const inputClassName =
  "border-border bg-background focus-visible:ring-ring/45 min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

function fieldPath(index: number, field: string): string {
  return `definitions.${index}.${field}`;
}

function timeFieldPath(index: number, field: string): string {
  return `definitions.${index}.time.${field}`;
}

function DefinitionEditor({
  kind,
  index,
  value,
  errors,
  disabled,
  onChange,
}: DefinitionEditorProps) {
  const validationResult = validateShiftDefinition(
    value,
    `definitions.${index}`,
  );
  const liveErrors = validationResult.ok
    ? {}
    : presentPlannerErrors(validationResult.errors).fields;
  const allErrors = { ...liveErrors, ...errors };
  const prefix = `shift-details-${kind}`;

  function update<Key extends keyof EditableShiftDefinition>(
    key: Key,
    nextValue: EditableShiftDefinition[Key],
  ) {
    onChange({ ...value, [key]: nextValue });
  }

  const calculation =
    validationResult.ok && validationResult.value.time !== undefined
      ? calculateNominalShift(validationResult.value.time)
      : null;

  return (
    <fieldset className="border-border min-w-0 rounded-2xl border p-4">
      <legend className="px-1 font-bold">
        {kind === "day" ? "Day details" : "Night details"}
      </legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor={`${prefix}-name`}>
            Shift name
          </label>
          <input
            aria-describedby={
              allErrors[fieldPath(index, "name")]
                ? `${prefix}-name-help ${prefix}-name-error`
                : `${prefix}-name-help`
            }
            aria-invalid={
              allErrors[fieldPath(index, "name")] ? true : undefined
            }
            className={`${inputClassName} mt-2`}
            disabled={disabled}
            id={`${prefix}-name`}
            maxLength={40}
            onChange={(event) => update("name", event.target.value)}
            value={value.name}
          />
          <p
            className="text-muted-foreground mt-1 text-xs"
            id={`${prefix}-name-help`}
          >
            1–40 characters. Names must be different.
          </p>
          {allErrors[fieldPath(index, "name")] ? (
            <p
              className="mt-1 text-sm font-semibold text-red-700"
              id={`${prefix}-name-error`}
            >
              {allErrors[fieldPath(index, "name")]}
            </p>
          ) : null}
        </div>
        <div className="sm:max-w-40">
          <label className="text-sm font-semibold" htmlFor={`${prefix}-label`}>
            Short label
          </label>
          <input
            aria-describedby={
              allErrors[fieldPath(index, "shortLabel")]
                ? `${prefix}-label-help ${prefix}-label-error`
                : `${prefix}-label-help`
            }
            aria-invalid={
              allErrors[fieldPath(index, "shortLabel")] ? true : undefined
            }
            className={`${inputClassName} mt-2`}
            disabled={disabled}
            id={`${prefix}-label`}
            maxLength={4}
            onChange={(event) => update("shortLabel", event.target.value)}
            value={value.shortLabel}
          />
          <p
            className="text-muted-foreground mt-1 text-xs"
            id={`${prefix}-label-help`}
          >
            1–4 visible characters.
          </p>
          {allErrors[fieldPath(index, "shortLabel")] ? (
            <p
              className="mt-1 text-sm font-semibold text-red-700"
              id={`${prefix}-label-error`}
            >
              {allErrors[fieldPath(index, "shortLabel")]}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Color</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHIFT_COLOR_TOKENS.map((color) => {
            const presentation = SHIFT_COLOR_PRESENTATION[color];
            return (
              <label
                className={cn(
                  "focus-within:ring-ring/45 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2 text-xs font-semibold focus-within:ring-3",
                  value.color === color
                    ? "border-primary bg-primary/8"
                    : "border-border bg-background",
                )}
                key={color}
              >
                <input
                  checked={value.color === color}
                  className="sr-only"
                  disabled={disabled}
                  name={`${prefix}-color`}
                  onChange={() => update("color", color)}
                  type="radio"
                  value={color}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0 rounded-full border",
                    presentation.swatchClassName,
                  )}
                />
                {presentation.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor={`${prefix}-start`}>
            Start time (optional)
          </label>
          <input
            aria-describedby={
              allErrors[timeFieldPath(index, "startTime")]
                ? `${prefix}-time-help ${prefix}-start-error`
                : `${prefix}-time-help`
            }
            aria-invalid={
              allErrors[timeFieldPath(index, "startTime")] ? true : undefined
            }
            className={`${inputClassName} mt-2`}
            disabled={disabled}
            id={`${prefix}-start`}
            onChange={(event) => update("startTime", event.target.value)}
            step={60}
            type="time"
            value={value.startTime}
          />
          {allErrors[timeFieldPath(index, "startTime")] ? (
            <p
              className="mt-1 text-sm font-semibold text-red-700"
              id={`${prefix}-start-error`}
            >
              {allErrors[timeFieldPath(index, "startTime")]}
            </p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor={`${prefix}-end`}>
            End time (optional)
          </label>
          <input
            aria-describedby={
              allErrors[timeFieldPath(index, "endTime")]
                ? `${prefix}-time-help ${prefix}-end-error`
                : `${prefix}-time-help`
            }
            aria-invalid={
              allErrors[timeFieldPath(index, "endTime")] ? true : undefined
            }
            className={`${inputClassName} mt-2`}
            disabled={disabled}
            id={`${prefix}-end`}
            onChange={(event) => update("endTime", event.target.value)}
            step={60}
            type="time"
            value={value.endTime}
          />
          {allErrors[timeFieldPath(index, "endTime")] ? (
            <p
              className="mt-1 text-sm font-semibold text-red-700"
              id={`${prefix}-end-error`}
            >
              {allErrors[timeFieldPath(index, "endTime")]}
            </p>
          ) : null}
        </div>
      </div>
      <p
        className="text-muted-foreground mt-2 text-xs leading-5"
        id={`${prefix}-time-help`}
      >
        Enter both times. An end earlier than the start means the shift ends the
        next day.
      </p>

      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
        <input
          aria-describedby={
            allErrors[timeFieldPath(index, "is24Hours")]
              ? `${prefix}-24-help ${prefix}-24-error`
              : `${prefix}-24-help`
          }
          aria-invalid={
            allErrors[timeFieldPath(index, "is24Hours")] ? true : undefined
          }
          checked={value.is24Hours}
          className="accent-primary size-4"
          disabled={disabled}
          onChange={(event) => update("is24Hours", event.target.checked)}
          type="checkbox"
        />
        This is an explicit 24-hour shift
      </label>
      <p className="text-muted-foreground text-xs" id={`${prefix}-24-help`}>
        Use only when the valid start and end times are equal.
      </p>
      {allErrors[timeFieldPath(index, "is24Hours")] ? (
        <p
          className="mt-1 text-sm font-semibold text-red-700"
          id={`${prefix}-24-error`}
        >
          {allErrors[timeFieldPath(index, "is24Hours")]}
        </p>
      ) : null}

      <div className="mt-4 sm:max-w-xs">
        <label className="text-sm font-semibold" htmlFor={`${prefix}-break`}>
          Unpaid break (minutes)
        </label>
        <input
          aria-describedby={
            allErrors[timeFieldPath(index, "breakMinutes")]
              ? `${prefix}-break-help ${prefix}-break-error`
              : `${prefix}-break-help`
          }
          aria-invalid={
            allErrors[timeFieldPath(index, "breakMinutes")] ? true : undefined
          }
          className={`${inputClassName} mt-2`}
          disabled={disabled}
          id={`${prefix}-break`}
          inputMode="numeric"
          min={0}
          onChange={(event) => update("breakMinutes", event.target.value)}
          step={1}
          type="number"
          value={value.breakMinutes}
        />
        <p
          className="text-muted-foreground mt-1 text-xs"
          id={`${prefix}-break-help`}
        >
          Must be shorter than the shift. Use 0 for no unpaid break.
        </p>
        {allErrors[timeFieldPath(index, "breakMinutes")] ? (
          <p
            className="mt-1 text-sm font-semibold text-red-700"
            id={`${prefix}-break-error`}
          >
            {allErrors[timeFieldPath(index, "breakMinutes")]}
          </p>
        ) : null}
      </div>

      {calculation?.ok ? (
        <dl
          className="bg-muted/55 mt-5 grid gap-3 rounded-xl p-3 text-sm sm:grid-cols-3"
          aria-label={`${value.name || kind} nominal duration`}
        >
          <div>
            <dt className="text-muted-foreground text-xs font-semibold uppercase">
              Gross
            </dt>
            <dd className="mt-1 font-bold">
              {formatNominalMinutes(calculation.value.grossMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-semibold uppercase">
              Break
            </dt>
            <dd className="mt-1 font-bold">
              {formatNominalMinutes(calculation.value.breakMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-semibold uppercase">
              Net
            </dt>
            <dd className="mt-1 font-bold">
              {formatNominalMinutes(calculation.value.netMinutes)}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="sr-only">Timing</dt>
            <dd className="font-semibold">
              {calculation.value.is24Hours
                ? "Explicit 24-hour shift · Ends next day"
                : calculation.value.crossesMidnight
                  ? "Ends next day"
                  : "Ends the same day"}
            </dd>
          </div>
        </dl>
      ) : null}
    </fieldset>
  );
}

export function ShiftDetailsPanel({
  value,
  errors,
  disabled,
  showDay,
  showNight,
  onChange,
  onReset,
}: ShiftDetailsPanelProps) {
  const hasTimedInput =
    (showDay && value.day.startTime !== "" && value.day.endTime !== "") ||
    (showNight && value.night.startTime !== "" && value.night.endTime !== "");

  return (
    <details className="border-border rounded-2xl border">
      <summary className="focus-visible:ring-ring/45 min-h-11 cursor-pointer rounded-2xl px-4 py-3 font-bold outline-none focus-visible:ring-3">
        Shift details (optional)
      </summary>
      <div className="border-border border-t p-4">
        <p className="text-muted-foreground text-sm leading-6">
          Add private names, colors, and optional wall-clock hours. These
          details are not saved after a refresh or included in shared links.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {showDay ? (
            <DefinitionEditor
              disabled={disabled}
              errors={errors}
              index={0}
              kind="day"
              onChange={(day) => onChange({ ...value, day })}
              value={value.day}
            />
          ) : null}
          {showNight ? (
            <DefinitionEditor
              disabled={disabled}
              errors={errors}
              index={1}
              kind="night"
              onChange={(night) => onChange({ ...value, night })}
              value={value.night}
            />
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {hasTimedInput ? (
            <p className="text-muted-foreground max-w-2xl text-xs leading-5">
              Shift hours are calculated from the entered wall-clock times.
              Actual elapsed time can differ during daylight-saving changes.
            </p>
          ) : (
            <span />
          )}
          <Button
            disabled={disabled}
            onClick={onReset}
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" className="mr-2 size-4" />
            Reset shift details
          </Button>
        </div>
      </div>
    </details>
  );
}
