import {
  expandSchedule,
  isFixedPresetId,
  parseISODate,
  validateScheduleConfig,
  type ScheduleConfig,
  type WeekStart,
} from "@/features/schedule/domain";
import {
  validateDateExceptionCollection,
  validateDateException,
  validateShiftDefinitionRegistry,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";

import {
  MAX_JSON_DEPTH,
  MAX_JSON_STRING_CODE_POINTS,
  MAX_PLANNER_NAME_LENGTH,
  PLANNER_DOMAIN_VERSION,
  PLANNER_SCHEMA_VERSION,
  PlannerPersistenceError,
  type PersistedPlannerV1,
  type PlannerContent,
  type StoredPlannerRecordV1,
} from "./persistence-types";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTROL_OR_BIDI =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

type RecordValue = Record<string, unknown>;

function fail(
  code: ConstructorParameters<typeof PlannerPersistenceError>[0],
  path?: string,
): never {
  throw new PlannerPersistenceError(code, path);
}

export function isPlainRecord(value: unknown): value is RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(
  value: RecordValue,
  allowed: readonly string[],
  path: string,
  optional: readonly string[] = [],
): void {
  const allowedKeys = new Set(allowed);
  const optionalKeys = new Set(optional);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail("INVALID_PLANNER", `${path}.${key}`);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key) && !optionalKeys.has(key)) {
      fail("INVALID_PLANNER", `${path}.${key}`);
    }
  }
}

function countCodePoints(value: string): number {
  return Array.from(value).length;
}

export function scanUntrustedValue(value: unknown): void {
  const stack: Array<{ value: unknown; depth: number; path: string }> = [
    { value, depth: 1, path: "$" },
  ];
  let stringCount = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current.depth > MAX_JSON_DEPTH) fail("INVALID_BACKUP", current.path);

    if (typeof current.value === "string") {
      stringCount += countCodePoints(current.value);
    } else if (Array.isArray(current.value)) {
      current.value.forEach((item, index) => {
        stack.push({
          value: item,
          depth: current.depth + 1,
          path: `${current.path}[${index}]`,
        });
      });
    } else if (isPlainRecord(current.value)) {
      const descriptors = Object.getOwnPropertyDescriptors(current.value);
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (
          FORBIDDEN_KEYS.has(key) ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined
        ) {
          fail("INVALID_BACKUP", `${current.path}.${key}`);
        }
        stringCount += countCodePoints(key);
        stack.push({
          value: descriptor.value,
          depth: current.depth + 1,
          path: `${current.path}.${key}`,
        });
      }
    } else if (typeof current.value === "object" && current.value !== null) {
      fail("INVALID_BACKUP", current.path);
    }

    if (stringCount > MAX_JSON_STRING_CODE_POINTS) {
      fail("INVALID_BACKUP", current.path);
    }
  }
}

export function normalizePlannerName(value: unknown): string {
  if (typeof value !== "string") fail("INVALID_PLANNER_NAME", "name");
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (
    normalized === "" ||
    countCodePoints(normalized) > MAX_PLANNER_NAME_LENGTH ||
    CONTROL_OR_BIDI.test(normalized)
  ) {
    fail("INVALID_PLANNER_NAME", "name");
  }
  return normalized;
}

export function plannerNameKey(name: string): string {
  return normalizePlannerName(name).toLowerCase();
}

export function validatePlannerId(value: unknown, path = "id"): string {
  if (typeof value !== "string" || !UUID_V4.test(value)) {
    fail("INVALID_PLANNER", path);
  }
  return value;
}

export function validateTimestamp(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !UTC_TIMESTAMP.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    fail("INVALID_PLANNER", path);
  }
  return value;
}

function validateSchedule(value: unknown): ScheduleConfig {
  if (!isPlainRecord(value)) fail("INVALID_PLANNER", "schedule");
  const result = validateScheduleConfig(value);
  if (!result.ok) fail("INVALID_PLANNER", "schedule");
  const keys =
    result.value.kind === "custom"
      ? ["kind", "version", "startDate", "cycle"]
      : isFixedPresetId(result.value.presetId)
        ? ["kind", "version", "presetId", "startDate", "workingShift"]
        : ["kind", "version", "presetId", "startDate"];
  exactKeys(value, keys, "schedule");
  return result.value;
}

function registryInputFromStored(value: unknown): unknown {
  if (!isPlainRecord(value)) fail("INVALID_PLANNER", "shiftDefinitions");
  exactKeys(
    value,
    ["definitions", "dayDefinitionId", "nightDefinitionId"],
    "shiftDefinitions",
  );
  if (!Array.isArray(value.definitions))
    fail("INVALID_PLANNER", "shiftDefinitions.definitions");

  const definitions = value.definitions.map((definition, index) => {
    if (!isPlainRecord(definition))
      fail("INVALID_PLANNER", `shiftDefinitions.definitions.${index}`);
    exactKeys(
      definition,
      ["id", "name", "shortLabel", "category", "color", "time"],
      `shiftDefinitions.definitions.${index}`,
      ["time"],
    );
    const base = {
      id: definition.id,
      name: definition.name,
      shortLabel: definition.shortLabel,
      category: definition.category,
      color: definition.color,
    };
    if (definition.time === undefined) return base;
    if (!isPlainRecord(definition.time))
      fail("INVALID_PLANNER", `shiftDefinitions.definitions.${index}.time`);
    exactKeys(
      definition.time,
      ["startTime", "endTime", "is24Hours", "breakMinutes"],
      `shiftDefinitions.definitions.${index}.time`,
    );
    return {
      ...base,
      startTime: definition.time.startTime,
      endTime: definition.time.endTime,
      is24Hours: definition.time.is24Hours,
      breakMinutes: definition.time.breakMinutes,
    };
  });

  return {
    definitions,
    dayDefinitionId: value.dayDefinitionId,
    nightDefinitionId: value.nightDefinitionId,
  };
}

function validateRegistry(value: unknown): ShiftDefinitionRegistry {
  const result = validateShiftDefinitionRegistry(
    registryInputFromStored(value),
  );
  if (!result.ok) fail("INVALID_PLANNER", "shiftDefinitions");
  return result.value;
}

function validateExceptionShapes(value: unknown): void {
  if (!Array.isArray(value)) fail("INVALID_PLANNER", "exceptions");
  value.forEach((exception, index) => {
    if (!isPlainRecord(exception))
      fail("INVALID_PLANNER", `exceptions.${index}`);
    exactKeys(
      exception,
      ["id", "date", "primary", "additionalWork", "note"],
      `exceptions.${index}`,
      ["primary", "additionalWork", "note"],
    );
    if (exception.primary !== undefined) {
      if (!isPlainRecord(exception.primary))
        fail("INVALID_PLANNER", `exceptions.${index}.primary`);
      const allowed =
        exception.primary.type === "replacement" ||
        exception.primary.type === "training"
          ? ["type", "definitionId"]
          : ["type"];
      exactKeys(exception.primary, allowed, `exceptions.${index}.primary`);
    }
    if (exception.additionalWork !== undefined) {
      if (!isPlainRecord(exception.additionalWork))
        fail("INVALID_PLANNER", `exceptions.${index}.additionalWork`);
      exactKeys(
        exception.additionalWork,
        ["definitionId"],
        `exceptions.${index}.additionalWork`,
      );
    }
  });
}

export function validatePlannerContent(
  value: unknown,
  isSupportedTimeZone: (value: string) => boolean,
): PlannerContent {
  if (!isPlainRecord(value)) fail("INVALID_PLANNER");
  exactKeys(
    value,
    ["schedule", "weekStart", "shiftDefinitions", "exceptions", "timeZone"],
    "planner",
    ["timeZone"],
  );
  const schedule = validateSchedule(value.schedule);
  const weekStart = value.weekStart;
  if (weekStart !== "monday" && weekStart !== "sunday")
    fail("INVALID_PLANNER", "weekStart");
  const shiftDefinitions = validateRegistry(value.shiftDefinitions);
  validateExceptionShapes(value.exceptions);
  const exceptionsResult = validateDateExceptionCollection(
    value.exceptions,
    shiftDefinitions,
  );
  if (!exceptionsResult.ok) fail("INVALID_PLANNER", "exceptions");
  for (const [index, exception] of exceptionsResult.value.entries()) {
    const date = parseISODate(exception.date);
    if (!date.ok) fail("INVALID_PLANNER", `exceptions.${index}.date`);
    const occurrence = expandSchedule(schedule, date.value, date.value);
    if (!occurrence.ok || occurrence.value[0] === undefined) {
      fail("INVALID_PLANNER", `exceptions.${index}.date`);
    }
    const validated = validateDateException(
      exception,
      shiftDefinitions,
      occurrence.value[0],
    );
    if (!validated.ok) fail("INVALID_PLANNER", `exceptions.${index}`);
  }
  let timeZone: string | undefined;
  if (value.timeZone !== undefined) {
    if (
      typeof value.timeZone !== "string" ||
      value.timeZone === "" ||
      value.timeZone.length > 255 ||
      !isSupportedTimeZone(value.timeZone)
    ) {
      fail("INVALID_PLANNER", "timeZone");
    }
    timeZone = value.timeZone;
  }
  return Object.freeze({
    schedule,
    weekStart: weekStart as WeekStart,
    shiftDefinitions,
    exceptions: exceptionsResult.value,
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

export function validatePersistedPlanner(
  value: unknown,
  isSupportedTimeZone: (value: string) => boolean,
): PersistedPlannerV1 {
  if (!isPlainRecord(value)) fail("CORRUPT_RECORD");
  if (value.schemaVersion !== PLANNER_SCHEMA_VERSION)
    fail("UNSUPPORTED_PLANNER_VERSION", "schemaVersion");
  if (value.domainVersion !== PLANNER_DOMAIN_VERSION)
    fail("UNSUPPORTED_DOMAIN_VERSION", "domainVersion");
  exactKeys(
    value,
    [
      "schemaVersion",
      "domainVersion",
      "id",
      "revision",
      "name",
      "createdAt",
      "updatedAt",
      "schedule",
      "weekStart",
      "shiftDefinitions",
      "exceptions",
      "timeZone",
    ],
    "planner",
    ["timeZone"],
  );
  const id = validatePlannerId(value.id);
  if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 1)
    fail("INVALID_PLANNER", "revision");
  const name = normalizePlannerName(value.name);
  const createdAt = validateTimestamp(value.createdAt, "createdAt");
  const updatedAt = validateTimestamp(value.updatedAt, "updatedAt");
  if (updatedAt < createdAt) fail("INVALID_PLANNER", "updatedAt");
  const content = validatePlannerContent(
    {
      schedule: value.schedule,
      weekStart: value.weekStart,
      shiftDefinitions: value.shiftDefinitions,
      exceptions: value.exceptions,
      ...(value.timeZone === undefined ? {} : { timeZone: value.timeZone }),
    },
    isSupportedTimeZone,
  );
  return Object.freeze({
    schemaVersion: 1,
    domainVersion: 1,
    id,
    revision: value.revision as number,
    name,
    createdAt,
    updatedAt,
    ...content,
  });
}

export function validateStoredPlanner(
  value: unknown,
  isSupportedTimeZone: (value: string) => boolean,
): StoredPlannerRecordV1 {
  if (!isPlainRecord(value)) fail("CORRUPT_RECORD");
  const { nameKey, ...portable } = value;
  const planner = validatePersistedPlanner(portable, isSupportedTimeZone);
  if (nameKey !== plannerNameKey(planner.name))
    fail("CORRUPT_RECORD", "nameKey");
  return Object.freeze({ ...planner, nameKey });
}

export function storedRecordFromPlanner(
  planner: PersistedPlannerV1,
): StoredPlannerRecordV1 {
  return Object.freeze({ ...planner, nameKey: plannerNameKey(planner.name) });
}
