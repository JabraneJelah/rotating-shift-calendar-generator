declare const isoDateBrand: unique symbol;
declare const isoYearMonthBrand: unique symbol;

export type ShiftKind = "day" | "night" | "off";
export type WorkingShiftKind = Exclude<ShiftKind, "off">;
export type WeekStart = "monday" | "sunday";

export type ISODate = string & { readonly [isoDateBrand]: true };
export type ISOYearMonth = string & { readonly [isoYearMonthBrand]: true };

export type PresetId = "4-on-4-off" | "2-2-3";

export type SchedulePattern = {
  readonly cycle: readonly ShiftKind[];
};

export type PresetScheduleConfig = {
  readonly kind: "preset";
  readonly version: 1;
  readonly presetId: PresetId;
  readonly startDate: ISODate;
  readonly workingShift: WorkingShiftKind;
};

export type CustomScheduleConfig = {
  readonly kind: "custom";
  readonly version: 1;
  readonly startDate: ISODate;
  readonly cycle: readonly ShiftKind[];
};

export type ScheduleConfig = PresetScheduleConfig | CustomScheduleConfig;

export type ScheduleOccurrence = {
  readonly date: ISODate;
  readonly shift: ShiftKind;
  readonly cycleIndex: number;
};

export type ScheduleShareState = {
  readonly config: ScheduleConfig;
  readonly viewMonth?: ISOYearMonth;
  readonly weekStart?: WeekStart;
};

export type DomainErrorCode =
  | "INVALID_DATE_FORMAT"
  | "INVALID_CALENDAR_DATE"
  | "UNSUPPORTED_YEAR"
  | "INVALID_VIEW_MONTH"
  | "INVALID_DAY_OFFSET"
  | "INVALID_CYCLE"
  | "EMPTY_CYCLE"
  | "CYCLE_TOO_LONG"
  | "NO_WORKING_SHIFT"
  | "INVALID_SHIFT_KIND"
  | "UNKNOWN_PRESET"
  | "INVALID_WORKING_SHIFT"
  | "INVALID_RANGE"
  | "RANGE_TOO_LARGE"
  | "UNSUPPORTED_CONFIG_VERSION"
  | "INVALID_CONFIG_KIND"
  | "INVALID_CONFIGURATION"
  | "MISSING_FIELD"
  | "MISSING_PARAMETER"
  | "DUPLICATE_PARAMETER"
  | "UNKNOWN_PARAMETER"
  | "INVALID_CYCLE_TOKEN";

export type DomainError = {
  readonly code: DomainErrorCode;
  readonly path?: string;
  readonly value?: string | number | boolean | null;
  readonly index?: number;
  readonly limit?: number;
};

export type DomainResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly DomainError[] };

export function domainSuccess<T>(value: T): DomainResult<T> {
  return Object.freeze({ ok: true, value });
}

export function domainFailure<T>(
  ...errors: readonly DomainError[]
): DomainResult<T> {
  return Object.freeze({ ok: false, errors: Object.freeze([...errors]) });
}

export function domainError(
  code: DomainErrorCode,
  context: Omit<DomainError, "code"> = {},
): DomainError {
  return Object.freeze({ code, ...context });
}
