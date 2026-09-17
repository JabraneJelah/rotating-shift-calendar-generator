import type { ShiftKind } from "@/features/schedule/domain";

import {
  plannerError,
  plannerFailure,
  plannerSuccess,
  type PlannerError,
  type PlannerResult,
  type ShiftCategory,
  type ShiftColorToken,
  type ShiftDefinition,
  type ShiftDefinitionId,
  type ShiftDefinitionRegistry,
  type ShiftTimeDetails,
} from "./planner-types";
import { calculateNominalShift, parseLocalTime } from "./time-only";

export const MAX_SHIFT_DEFINITIONS = 12;
export const MAX_SHIFT_NAME_LENGTH = 40;
export const MAX_SHORT_LABEL_LENGTH = 4;

export const SHIFT_CATEGORIES = Object.freeze([
  "day",
  "evening",
  "night",
  "other",
] as const satisfies readonly ShiftCategory[]);

export const SHIFT_COLOR_TOKENS = Object.freeze([
  "amber",
  "blue",
  "indigo",
  "violet",
  "teal",
  "green",
  "rose",
  "slate",
] as const satisfies readonly ShiftColorToken[]);

const SHIFT_DEFINITION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const BUILTIN_DAY_DEFINITION_ID = "builtin-day" as ShiftDefinitionId;
export const BUILTIN_NIGHT_DEFINITION_ID = "builtin-night" as ShiftDefinitionId;

export type ShiftDefinitionInput = {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly shortLabel?: unknown;
  readonly category?: unknown;
  readonly color?: unknown;
  readonly startTime?: unknown;
  readonly endTime?: unknown;
  readonly is24Hours?: unknown;
  readonly breakMinutes?: unknown;
};

export type ShiftDefinitionRegistryInput = {
  readonly definitions?: unknown;
  readonly dayDefinitionId?: unknown;
  readonly nightDefinitionId?: unknown;
};

function characterLength(value: string): number {
  return Array.from(value).length;
}

function isCategory(value: unknown): value is ShiftCategory {
  return SHIFT_CATEGORIES.includes(value as ShiftCategory);
}

function isColor(value: unknown): value is ShiftColorToken {
  return SHIFT_COLOR_TOKENS.includes(value as ShiftColorToken);
}

function parseBreakMinutes(
  value: unknown,
  path: string,
): PlannerResult<number> {
  if (value === undefined || value === "") {
    return plannerSuccess(0);
  }

  const parsed =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;

  if (!Number.isSafeInteger(parsed) || (parsed as number) < 0) {
    return plannerFailure(
      plannerError("INVALID_BREAK_DURATION", {
        path,
        value:
          typeof value === "string" || typeof value === "number"
            ? value
            : undefined,
      }),
    );
  }

  return plannerSuccess(parsed as number);
}

function validateTimeDetails(
  input: ShiftDefinitionInput,
  path: string,
): PlannerResult<ShiftTimeDetails | undefined> {
  const startTime = input.startTime;
  const endTime = input.endTime;
  const hasStart = typeof startTime === "string" && startTime !== "";
  const hasEnd = typeof endTime === "string" && endTime !== "";
  const is24Hours = input.is24Hours ?? false;
  const breakResult = parseBreakMinutes(
    input.breakMinutes,
    `${path}.breakMinutes`,
  );

  if (!breakResult.ok) {
    return breakResult;
  }

  if (typeof is24Hours !== "boolean") {
    return plannerFailure(
      plannerError("INVALID_24_HOUR_CONFIGURATION", {
        path: `${path}.is24Hours`,
      }),
    );
  }

  if (!hasStart && !hasEnd) {
    if (startTime !== undefined && startTime !== "") {
      return plannerFailure(
        plannerError("INVALID_TIME_FORMAT", { path: `${path}.startTime` }),
      );
    }

    if (endTime !== undefined && endTime !== "") {
      return plannerFailure(
        plannerError("INVALID_TIME_FORMAT", { path: `${path}.endTime` }),
      );
    }

    if (is24Hours) {
      return plannerFailure(
        plannerError("INVALID_24_HOUR_CONFIGURATION", {
          path: `${path}.is24Hours`,
        }),
      );
    }

    if (breakResult.value !== 0) {
      return plannerFailure(
        plannerError("BREAK_REQUIRES_TIME", {
          path: `${path}.breakMinutes`,
        }),
      );
    }

    return plannerSuccess(undefined);
  }

  if (!hasStart || !hasEnd) {
    const invalidPath = !hasStart ? `${path}.startTime` : `${path}.endTime`;
    const invalidValue = !hasStart ? startTime : endTime;

    if (invalidValue !== undefined && invalidValue !== "") {
      return plannerFailure(
        plannerError("INVALID_TIME_FORMAT", { path: invalidPath }),
      );
    }

    return plannerFailure(
      plannerError("PARTIAL_SHIFT_TIME", { path: invalidPath }),
    );
  }

  const startResult = parseLocalTime(startTime, `${path}.startTime`);
  const endResult = parseLocalTime(endTime, `${path}.endTime`);
  const errors: PlannerError[] = [];

  if (!startResult.ok) {
    errors.push(...startResult.errors);
  }
  if (!endResult.ok) {
    errors.push(...endResult.errors);
  }
  if (errors.length > 0 || !startResult.ok || !endResult.ok) {
    return plannerFailure(...errors);
  }

  const time = Object.freeze({
    startTime: startResult.value,
    endTime: endResult.value,
    is24Hours,
    breakMinutes: breakResult.value,
  });
  const calculationResult = calculateNominalShift(time, path);

  if (!calculationResult.ok) {
    return calculationResult;
  }

  return plannerSuccess(time);
}

export function validateShiftDefinition(
  input: unknown,
  path = "definition",
): PlannerResult<ShiftDefinition> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return plannerFailure(plannerError("INVALID_SHIFT_DEFINITION", { path }));
  }

  const candidate = input as ShiftDefinitionInput;
  const errors: PlannerError[] = [];
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const shortLabel =
    typeof candidate.shortLabel === "string" ? candidate.shortLabel.trim() : "";

  if (!SHIFT_DEFINITION_ID_PATTERN.test(id)) {
    errors.push(
      plannerError("INVALID_SHIFT_DEFINITION_ID", {
        path: `${path}.id`,
        value: typeof candidate.id === "string" ? candidate.id : undefined,
      }),
    );
  }

  if (name === "") {
    errors.push(plannerError("INVALID_SHIFT_NAME", { path: `${path}.name` }));
  } else if (characterLength(name) > MAX_SHIFT_NAME_LENGTH) {
    errors.push(
      plannerError("SHIFT_NAME_TOO_LONG", {
        path: `${path}.name`,
        limit: MAX_SHIFT_NAME_LENGTH,
      }),
    );
  }

  if (shortLabel === "") {
    errors.push(
      plannerError("INVALID_SHORT_LABEL", { path: `${path}.shortLabel` }),
    );
  } else if (characterLength(shortLabel) > MAX_SHORT_LABEL_LENGTH) {
    errors.push(
      plannerError("SHORT_LABEL_TOO_LONG", {
        path: `${path}.shortLabel`,
        limit: MAX_SHORT_LABEL_LENGTH,
      }),
    );
  }

  if (!isCategory(candidate.category)) {
    errors.push(
      plannerError("INVALID_SHIFT_CATEGORY", {
        path: `${path}.category`,
        value:
          typeof candidate.category === "string"
            ? candidate.category
            : undefined,
      }),
    );
  }

  if (!isColor(candidate.color)) {
    errors.push(
      plannerError("INVALID_SHIFT_COLOR", {
        path: `${path}.color`,
        value:
          typeof candidate.color === "string" ? candidate.color : undefined,
      }),
    );
  }

  const timeResult = validateTimeDetails(candidate, `${path}.time`);
  if (!timeResult.ok) {
    errors.push(...timeResult.errors);
  }

  if (
    errors.length > 0 ||
    !isCategory(candidate.category) ||
    !isColor(candidate.color) ||
    !timeResult.ok
  ) {
    return plannerFailure(...errors);
  }

  return plannerSuccess(
    Object.freeze({
      id: id as ShiftDefinitionId,
      name,
      shortLabel,
      category: candidate.category,
      color: candidate.color,
      ...(timeResult.value === undefined ? {} : { time: timeResult.value }),
    }),
  );
}

export function validateShiftDefinitionRegistry(
  input: unknown,
): PlannerResult<ShiftDefinitionRegistry> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return plannerFailure(
      plannerError("INVALID_DEFINITION_COLLECTION", { path: "definitions" }),
    );
  }

  const candidate = input as ShiftDefinitionRegistryInput;

  if (!Array.isArray(candidate.definitions)) {
    return plannerFailure(
      plannerError("INVALID_DEFINITION_COLLECTION", { path: "definitions" }),
    );
  }

  if (candidate.definitions.length > MAX_SHIFT_DEFINITIONS) {
    return plannerFailure(
      plannerError("TOO_MANY_SHIFT_DEFINITIONS", {
        path: "definitions",
        value: candidate.definitions.length,
        limit: MAX_SHIFT_DEFINITIONS,
      }),
    );
  }

  const definitions: ShiftDefinition[] = [];
  const errors: PlannerError[] = [];

  candidate.definitions.forEach((definition, index) => {
    const result = validateShiftDefinition(definition, `definitions.${index}`);

    if (result.ok) {
      definitions.push(result.value);
    } else {
      errors.push(...result.errors);
    }
  });

  const idIndexes = new Map<string, number>();
  const nameIndexes = new Map<string, number>();

  for (const [index, definition] of definitions.entries()) {
    if (idIndexes.has(definition.id)) {
      errors.push(
        plannerError("DUPLICATE_SHIFT_DEFINITION_ID", {
          path: `definitions.${index}.id`,
          value: definition.id,
          index,
        }),
      );
    } else {
      idIndexes.set(definition.id, index);
    }

    const normalizedName = definition.name.toLowerCase();
    if (nameIndexes.has(normalizedName)) {
      errors.push(
        plannerError("DUPLICATE_SHIFT_NAME", {
          path: `definitions.${index}.name`,
          value: definition.name,
          index,
        }),
      );
    } else {
      nameIndexes.set(normalizedName, index);
    }
  }

  const dayId =
    typeof candidate.dayDefinitionId === "string"
      ? candidate.dayDefinitionId
      : "";
  const nightId =
    typeof candidate.nightDefinitionId === "string"
      ? candidate.nightDefinitionId
      : "";
  const dayDefinition = definitions.find(({ id }) => id === dayId);
  const nightDefinition = definitions.find(({ id }) => id === nightId);
  const providedIds = new Set(
    candidate.definitions.flatMap((definition) =>
      typeof definition === "object" &&
      definition !== null &&
      !Array.isArray(definition) &&
      typeof (definition as ShiftDefinitionInput).id === "string"
        ? [(definition as ShiftDefinitionInput).id as string]
        : [],
    ),
  );

  if (dayDefinition === undefined) {
    if (!providedIds.has(dayId)) {
      errors.push(
        plannerError("MISSING_DAY_DEFINITION", { path: "dayDefinitionId" }),
      );
    }
  } else if (dayDefinition.category !== "day") {
    errors.push(
      plannerError("INVALID_DAY_DEFINITION", { path: "dayDefinitionId" }),
    );
  }

  if (nightDefinition === undefined) {
    if (!providedIds.has(nightId)) {
      errors.push(
        plannerError("MISSING_NIGHT_DEFINITION", {
          path: "nightDefinitionId",
        }),
      );
    }
  } else if (nightDefinition.category !== "night") {
    errors.push(
      plannerError("INVALID_NIGHT_DEFINITION", {
        path: "nightDefinitionId",
      }),
    );
  }

  if (
    errors.length > 0 ||
    dayDefinition === undefined ||
    nightDefinition === undefined
  ) {
    return plannerFailure(...errors);
  }

  return plannerSuccess(
    Object.freeze({
      definitions: Object.freeze([...definitions]),
      dayDefinitionId: dayDefinition.id,
      nightDefinitionId: nightDefinition.id,
    }),
  );
}

const defaultRegistryResult = validateShiftDefinitionRegistry({
  definitions: [
    {
      id: BUILTIN_DAY_DEFINITION_ID,
      name: "Day shift",
      shortLabel: "D",
      category: "day",
      color: "amber",
    },
    {
      id: BUILTIN_NIGHT_DEFINITION_ID,
      name: "Night shift",
      shortLabel: "N",
      category: "night",
      color: "indigo",
    },
  ],
  dayDefinitionId: BUILTIN_DAY_DEFINITION_ID,
  nightDefinitionId: BUILTIN_NIGHT_DEFINITION_ID,
});

if (!defaultRegistryResult.ok) {
  throw new Error("The trusted default shift definitions must be valid.");
}

export const DEFAULT_SHIFT_DEFINITION_REGISTRY = defaultRegistryResult.value;

export function resolveShiftDefinition(
  registry: ShiftDefinitionRegistry,
  shift: ShiftKind,
): ShiftDefinition | null {
  if (shift === "off") {
    return null;
  }

  const id =
    shift === "day" ? registry.dayDefinitionId : registry.nightDefinitionId;
  const definition = registry.definitions.find((item) => item.id === id);

  if (definition === undefined) {
    throw new Error("A validated registry must resolve each working shift.");
  }

  return definition;
}

export function hasTimedDefinitions(
  registry: ShiftDefinitionRegistry,
): boolean {
  return registry.definitions.some(
    (definition) => definition.time !== undefined,
  );
}

export function isDefaultShiftDefinitionRegistry(
  registry: ShiftDefinitionRegistry,
): boolean {
  if (registry.definitions.length !== 2) {
    return false;
  }

  return registry.definitions.every((definition, index) => {
    const expected = DEFAULT_SHIFT_DEFINITION_REGISTRY.definitions[index];
    return (
      expected !== undefined &&
      definition.id === expected.id &&
      definition.name === expected.name &&
      definition.shortLabel === expected.shortLabel &&
      definition.category === expected.category &&
      definition.color === expected.color &&
      definition.time === undefined
    );
  });
}
