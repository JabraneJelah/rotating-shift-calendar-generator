import {
  domainError,
  domainFailure,
  domainSuccess,
  type DomainResult,
  type PresetId,
  type SchedulePattern,
  type ShiftKind,
  type WorkingShiftKind,
} from "./schedule-types";

export const MAX_CUSTOM_CYCLE_LENGTH = 56;

export const PRESET_IDS = Object.freeze([
  "4-on-4-off",
  "2-2-3",
] as const satisfies readonly PresetId[]);

const FOUR_ON_FOUR_OFF_WORK_POSITIONS = Object.freeze([
  true,
  true,
  true,
  true,
  false,
  false,
  false,
  false,
]);

const TWO_TWO_THREE_WORK_POSITIONS = Object.freeze([
  true,
  true,
  false,
  false,
  true,
  true,
  true,
  false,
  false,
  true,
  true,
  false,
  false,
  false,
]);

export function isShiftKind(value: unknown): value is ShiftKind {
  return value === "day" || value === "night" || value === "off";
}

export function isWorkingShiftKind(value: unknown): value is WorkingShiftKind {
  return value === "day" || value === "night";
}

export function isPresetId(value: unknown): value is PresetId {
  return value === "4-on-4-off" || value === "2-2-3";
}

function workPositionsForPreset(presetId: PresetId): readonly boolean[] {
  switch (presetId) {
    case "4-on-4-off":
      return FOUR_ON_FOUR_OFF_WORK_POSITIONS;
    case "2-2-3":
      return TWO_TWO_THREE_WORK_POSITIONS;
  }
}

export function trustedPresetPattern(
  presetId: PresetId,
  workingShift: WorkingShiftKind,
): SchedulePattern {
  const cycle = workPositionsForPreset(presetId).map((isWorking) =>
    isWorking ? workingShift : "off",
  );

  return Object.freeze({ cycle: Object.freeze(cycle) });
}

export function resolvePresetPattern(
  presetId: string,
  workingShift: string,
): DomainResult<SchedulePattern> {
  if (!isPresetId(presetId)) {
    return domainFailure(
      domainError("UNKNOWN_PRESET", {
        path: "presetId",
        value: presetId,
      }),
    );
  }

  if (!isWorkingShiftKind(workingShift)) {
    return domainFailure(
      domainError("INVALID_WORKING_SHIFT", {
        path: "workingShift",
        value: workingShift,
      }),
    );
  }

  return domainSuccess(trustedPresetPattern(presetId, workingShift));
}

export function validateCustomPattern(
  cycle: unknown,
): DomainResult<SchedulePattern> {
  if (!Array.isArray(cycle)) {
    return domainFailure(domainError("INVALID_CYCLE", { path: "cycle" }));
  }

  if (cycle.length === 0) {
    return domainFailure(domainError("EMPTY_CYCLE", { path: "cycle" }));
  }

  if (cycle.length > MAX_CUSTOM_CYCLE_LENGTH) {
    return domainFailure(
      domainError("CYCLE_TOO_LONG", {
        path: "cycle",
        value: cycle.length,
        limit: MAX_CUSTOM_CYCLE_LENGTH,
      }),
    );
  }

  const validatedCycle: ShiftKind[] = [];

  for (const [index, value] of cycle.entries()) {
    if (!isShiftKind(value)) {
      return domainFailure(
        domainError("INVALID_SHIFT_KIND", {
          path: "cycle",
          value:
            typeof value === "string" || typeof value === "number"
              ? value
              : undefined,
          index,
        }),
      );
    }

    validatedCycle.push(value);
  }

  if (!validatedCycle.some((shift) => shift !== "off")) {
    return domainFailure(domainError("NO_WORKING_SHIFT", { path: "cycle" }));
  }

  return domainSuccess(Object.freeze({ cycle: Object.freeze(validatedCycle) }));
}
