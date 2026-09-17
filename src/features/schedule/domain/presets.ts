import {
  domainError,
  domainFailure,
  domainSuccess,
  type DomainResult,
  type FixedPresetCyclePosition,
  type FixedPresetDefinition,
  type FixedPresetId,
  type PresetDefinition,
  type PresetId,
  type PresetScheduleConfig,
  type RotatingPresetDefinition,
  type RotatingPresetId,
  type SchedulePattern,
  type ShiftKind,
  type WorkingShiftKind,
} from "./schedule-types";

export const MAX_CUSTOM_CYCLE_LENGTH = 56;

export const PRESET_IDS = Object.freeze([
  "4-on-4-off",
  "2-2-3",
  "7-on-7-off-fixed",
  "2-day-2-night-4-off",
  "dupont-28-day",
  "7-day-7-off-7-night-7-off",
] as const satisfies readonly PresetId[]);

const fixedCycle = (
  cycle: readonly FixedPresetCyclePosition[],
): readonly FixedPresetCyclePosition[] => Object.freeze([...cycle]);

const rotatingCycle = (cycle: readonly ShiftKind[]): readonly ShiftKind[] =>
  Object.freeze([...cycle]);

function countsForFixedCycle(cycle: readonly FixedPresetCyclePosition[]) {
  const working = cycle.filter((position) => position === "work").length;
  return Object.freeze({
    day: 0,
    night: 0,
    off: cycle.length - working,
    working,
  });
}

function countsForRotatingCycle(cycle: readonly ShiftKind[]) {
  const day = cycle.filter((shift) => shift === "day").length;
  const night = cycle.filter((shift) => shift === "night").length;
  const off = cycle.filter((shift) => shift === "off").length;
  return Object.freeze({ day, night, off, working: day + night });
}

function fixedDefinition(
  definition: Omit<FixedPresetDefinition, "cycleLength" | "counts">,
): FixedPresetDefinition {
  return Object.freeze({
    ...definition,
    cycleLength: definition.cycle.length,
    counts: countsForFixedCycle(definition.cycle),
  });
}

function rotatingDefinition(
  definition: Omit<RotatingPresetDefinition, "cycleLength" | "counts">,
): RotatingPresetDefinition {
  return Object.freeze({
    ...definition,
    cycleLength: definition.cycle.length,
    counts: countsForRotatingCycle(definition.cycle),
  });
}

export const PRESET_DEFINITIONS = Object.freeze([
  fixedDefinition({
    type: "fixed",
    id: "4-on-4-off",
    name: "4 On / 4 Off",
    description:
      "Work four consecutive Day or Night shifts, then take four days off.",
    anchor: "The selected date is the first working shift in the cycle.",
    cycle: fixedCycle([
      "work",
      "work",
      "work",
      "work",
      "off",
      "off",
      "off",
      "off",
    ]),
    requiresWorkingShift: true,
  }),
  fixedDefinition({
    type: "fixed",
    id: "2-2-3",
    name: "2-2-3 Fixed Shift",
    description:
      "Work two shifts, take two days off, work three, take two off, work two, then take three off.",
    anchor: "The selected date is the first working shift in the cycle.",
    cycle: fixedCycle([
      "work",
      "work",
      "off",
      "off",
      "work",
      "work",
      "work",
      "off",
      "off",
      "work",
      "work",
      "off",
      "off",
      "off",
    ]),
    requiresWorkingShift: true,
  }),
  fixedDefinition({
    type: "fixed",
    id: "7-on-7-off-fixed",
    name: "7 On / 7 Off — Fixed Shift",
    description:
      "Work seven consecutive Day or Night shifts, then take seven days off.",
    anchor:
      "The selected date is the first working shift in the seven-day block.",
    cycle: fixedCycle([
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
    ]),
    requiresWorkingShift: true,
  }),
  rotatingDefinition({
    type: "rotating",
    id: "2-day-2-night-4-off",
    name: "2 Day / 2 Night / 4 Off",
    description:
      "Work two Day shifts, then two Night shifts, followed by four days off.",
    anchor: "The selected date is the first Day shift in the cycle.",
    cycle: rotatingCycle([
      "day",
      "day",
      "night",
      "night",
      "off",
      "off",
      "off",
      "off",
    ]),
    requiresWorkingShift: false,
  }),
  rotatingDefinition({
    type: "rotating",
    id: "dupont-28-day",
    name: "DuPont 28-Day Rotation",
    description:
      "Follow a 28-day rotation containing seven Day shifts, seven Night shifts, and fourteen days off.",
    anchor:
      "The selected date is the first Night shift in the opening four-Night block.",
    variationNote:
      "DuPont schedules can vary by employer. This preset uses the documented sequence shown in the preview.",
    cycle: rotatingCycle([
      "night",
      "night",
      "night",
      "night",
      "off",
      "off",
      "off",
      "day",
      "day",
      "day",
      "off",
      "night",
      "night",
      "night",
      "off",
      "off",
      "off",
      "day",
      "day",
      "day",
      "day",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
    ]),
    requiresWorkingShift: false,
  }),
  rotatingDefinition({
    type: "rotating",
    id: "7-day-7-off-7-night-7-off",
    name: "7 Day / 7 Off / 7 Night / 7 Off",
    description:
      "Work seven Day shifts, take seven days off, work seven Night shifts, then take seven days off.",
    anchor: "The selected date is the first Day shift in the cycle.",
    cycle: rotatingCycle([
      "day",
      "day",
      "day",
      "day",
      "day",
      "day",
      "day",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
      "night",
      "night",
      "night",
      "night",
      "night",
      "night",
      "night",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
      "off",
    ]),
    requiresWorkingShift: false,
  }),
] as const satisfies readonly PresetDefinition[]);

const PRESET_DEFINITION_BY_ID = new Map(
  PRESET_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function isShiftKind(value: unknown): value is ShiftKind {
  return value === "day" || value === "night" || value === "off";
}

export function isWorkingShiftKind(value: unknown): value is WorkingShiftKind {
  return value === "day" || value === "night";
}

export function isPresetId(value: unknown): value is PresetId {
  return (
    typeof value === "string" && PRESET_DEFINITION_BY_ID.has(value as PresetId)
  );
}

export function isFixedPresetId(value: unknown): value is FixedPresetId {
  return isPresetId(value) && getPresetDefinition(value).type === "fixed";
}

export function isRotatingPresetId(value: unknown): value is RotatingPresetId {
  return isPresetId(value) && getPresetDefinition(value).type === "rotating";
}

export function getPresetDefinition(presetId: PresetId): PresetDefinition {
  const definition = PRESET_DEFINITION_BY_ID.get(presetId);

  if (definition === undefined) {
    throw new Error("A validated preset ID must have a definition.");
  }

  return definition;
}

function patternFromDefinition(
  definition: PresetDefinition,
  workingShift?: WorkingShiftKind,
): SchedulePattern {
  const cycle =
    definition.type === "fixed"
      ? definition.cycle.map((position) =>
          position === "work" ? (workingShift ?? "day") : "off",
        )
      : definition.cycle;

  return Object.freeze({ cycle: Object.freeze([...cycle]) });
}

export function trustedPresetPattern(
  config: PresetScheduleConfig,
): SchedulePattern {
  const definition = getPresetDefinition(config.presetId);

  if (definition.type === "fixed") {
    if (!("workingShift" in config)) {
      throw new Error(
        "A fixed preset configuration must include a working shift.",
      );
    }
    return patternFromDefinition(definition, config.workingShift);
  }

  if ("workingShift" in config) {
    throw new Error(
      "A rotating preset configuration cannot include a working shift.",
    );
  }
  return patternFromDefinition(definition);
}

export function resolvePresetPattern(
  presetId: string,
  workingShift?: string,
): DomainResult<SchedulePattern> {
  if (!isPresetId(presetId)) {
    return domainFailure(
      domainError("UNKNOWN_PRESET", {
        path: "presetId",
        value: presetId,
      }),
    );
  }

  const definition = getPresetDefinition(presetId);

  if (definition.type === "rotating") {
    if (workingShift !== undefined) {
      return domainFailure(
        domainError("INAPPLICABLE_WORKING_SHIFT", {
          path: "workingShift",
          value: workingShift,
        }),
      );
    }

    return domainSuccess(patternFromDefinition(definition));
  }

  if (workingShift === undefined) {
    return domainFailure(
      domainError("MISSING_FIELD", { path: "workingShift" }),
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

  return domainSuccess(patternFromDefinition(definition, workingShift));
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
