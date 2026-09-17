declare const localTimeBrand: unique symbol;
declare const shiftDefinitionIdBrand: unique symbol;

export type LocalTime = string & { readonly [localTimeBrand]: true };
export type ShiftDefinitionId = string & {
  readonly [shiftDefinitionIdBrand]: true;
};

export type ShiftCategory = "day" | "evening" | "night" | "other";
export type ShiftColorToken =
  "amber" | "blue" | "indigo" | "violet" | "teal" | "green" | "rose" | "slate";

export type ShiftTimeDetails = {
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly is24Hours: boolean;
  readonly breakMinutes: number;
};

export type ShiftDefinition = {
  readonly id: ShiftDefinitionId;
  readonly name: string;
  readonly shortLabel: string;
  readonly category: ShiftCategory;
  readonly color: ShiftColorToken;
  readonly time?: ShiftTimeDetails;
};

export type ShiftDefinitionRegistry = {
  readonly definitions: readonly ShiftDefinition[];
  readonly dayDefinitionId: ShiftDefinitionId;
  readonly nightDefinitionId: ShiftDefinitionId;
};

export type NominalShiftCalculation = {
  readonly grossMinutes: number;
  readonly breakMinutes: number;
  readonly netMinutes: number;
  readonly crossesMidnight: boolean;
  readonly is24Hours: boolean;
};

export type PlannerErrorCode =
  | "INVALID_TIME_FORMAT"
  | "PARTIAL_SHIFT_TIME"
  | "INVALID_24_HOUR_CONFIGURATION"
  | "EQUAL_SHIFT_TIMES"
  | "INVALID_BREAK_DURATION"
  | "BREAK_REQUIRES_TIME"
  | "BREAK_NOT_SHORTER_THAN_SHIFT"
  | "INVALID_SHIFT_DEFINITION_ID"
  | "DUPLICATE_SHIFT_DEFINITION_ID"
  | "INVALID_SHIFT_NAME"
  | "SHIFT_NAME_TOO_LONG"
  | "DUPLICATE_SHIFT_NAME"
  | "INVALID_SHORT_LABEL"
  | "SHORT_LABEL_TOO_LONG"
  | "INVALID_SHIFT_CATEGORY"
  | "INVALID_SHIFT_COLOR"
  | "INVALID_SHIFT_DEFINITION"
  | "INVALID_DEFINITION_COLLECTION"
  | "TOO_MANY_SHIFT_DEFINITIONS"
  | "MISSING_DAY_DEFINITION"
  | "MISSING_NIGHT_DEFINITION"
  | "INVALID_DAY_DEFINITION"
  | "INVALID_NIGHT_DEFINITION";

export type PlannerError = {
  readonly code: PlannerErrorCode;
  readonly path?: string;
  readonly value?: string | number | boolean | null;
  readonly index?: number;
  readonly limit?: number;
};

export type PlannerResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly PlannerError[] };

export function plannerSuccess<T>(value: T): PlannerResult<T> {
  return Object.freeze({ ok: true, value });
}

export function plannerFailure<T>(
  ...errors: readonly PlannerError[]
): PlannerResult<T> {
  return Object.freeze({ ok: false, errors: Object.freeze([...errors]) });
}

export function plannerError(
  code: PlannerErrorCode,
  context: Omit<PlannerError, "code"> = {},
): PlannerError {
  return Object.freeze({ code, ...context });
}
