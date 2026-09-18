import type {
  ISODate,
  ISOYearMonth,
  ScheduleConfig,
} from "@/features/schedule/domain";
import type {
  EffectiveScheduleDate,
  LocalTime,
} from "@/features/schedule/planner";

declare const utcInstantBrand: unique symbol;
declare const ianaTimeZoneBrand: unique symbol;

export type UTCInstant = string & { readonly [utcInstantBrand]: true };
export type IANATimeZone = string & { readonly [ianaTimeZoneBrand]: true };
export type TimedBoundary = "start" | "end";
export type TimedDisambiguation = "earlier" | "later";

export const MIN_TIMED_EXPORT_YEAR = 1970;
export const MAX_TIMED_EXPORT_YEAR = 2037;
export const EXPECTED_IANA_VERSION = "2026d";

export type TimedCandidate = {
  readonly utc: UTCInstant;
  readonly offsetMinutes: number;
};

export type TimedBoundaryIssue = {
  readonly key: string;
  readonly eventIdentity: string;
  readonly label: string;
  readonly boundary: TimedBoundary;
  readonly date: ISODate;
  readonly time: LocalTime;
  readonly timeZone: string;
  readonly candidates?: readonly [TimedCandidate, TimedCandidate];
};

export type TimedExportErrorCode =
  | "MISSING_TIME_ZONE"
  | "UNKNOWN_TIME_ZONE"
  | "UNSUPPORTED_TIMED_EXPORT_YEAR"
  | "UNSUPPORTED_TIME_ZONE_RUNTIME"
  | "NONEXISTENT_LOCAL_TIME"
  | "AMBIGUOUS_LOCAL_TIME"
  | "INVALID_TIMED_DEFINITION"
  | "UNTIMED_WORK_OCCURRENCES"
  | "DATE_OVERFLOW"
  | "TIME_ZONE_INITIALIZATION_FAILED"
  | "TIME_ZONE_DATA_VERSION_MISMATCH"
  | "TIME_ZONE_CONVERSION_FAILED"
  | "TIMED_ICS_SERIALIZATION_FAILED"
  | "TIMED_ICS_DOWNLOAD_FAILED";

export type TimedExportError = {
  readonly code: TimedExportErrorCode;
  readonly occurrenceDate?: string;
  readonly count?: number;
  readonly timeZone?: string;
  readonly activeIanaVersion?: string;
  readonly boundaries?: readonly TimedBoundaryIssue[];
  readonly labels?: readonly string[];
};

export type TimedResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TimedExportError };

export type TimedExportScope =
  | { readonly viewMonth: ISOYearMonth; readonly year?: never }
  | { readonly year: number; readonly viewMonth?: never };

export type TimedExportRequest = {
  readonly calendarName: string;
  readonly config: ScheduleConfig;
  readonly dates: readonly EffectiveScheduleDate[];
  readonly generatedAt: string;
  readonly timeZone: string;
  readonly disambiguations?: Readonly<
    Record<string, TimedDisambiguation | undefined>
  >;
} & TimedExportScope;

export type TimedICSExportSuccess = {
  readonly success: true;
  readonly content: string;
  readonly filename: string;
  readonly mimeType: "text/calendar;charset=utf-8";
};

export type TimedExportResponse = TimedResult<TimedICSExportSuccess>;

export type TimeZoneSupport = {
  readonly activeIanaVersion: string;
  readonly timeZones: readonly string[];
};

export type TimedProjectedEvent = {
  readonly identity: string;
  readonly occurrenceDate: ISODate;
  readonly role: "primary" | "additional";
  readonly origin: "generated" | "replacement" | "training" | "additional";
  readonly definitionId: string;
  readonly summary: string;
  readonly category: string;
  readonly localStartDate: ISODate;
  readonly localStartTime: LocalTime;
  readonly localEndDate: ISODate;
  readonly localEndTime: LocalTime;
  readonly timeZone: IANATimeZone;
  readonly utcStart: UTCInstant;
  readonly utcEnd: UTCInstant;
  readonly startOffsetMinutes: number;
  readonly endOffsetMinutes: number;
  readonly overnight: boolean;
  readonly is24Hours: boolean;
  readonly breakMinutes: number;
};

export function timedSuccess<T>(value: T): TimedResult<T> {
  return Object.freeze({ ok: true, value });
}

export function timedFailure<T>(error: TimedExportError): TimedResult<T> {
  return Object.freeze({ ok: false, error: Object.freeze(error) });
}
