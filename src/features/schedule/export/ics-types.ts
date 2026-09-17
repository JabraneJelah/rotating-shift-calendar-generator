import type {
  ISOYearMonth,
  ScheduleConfig,
  ScheduleOccurrence,
} from "@/features/schedule/domain";

export const ICS_MIME_TYPE = "text/calendar;charset=utf-8" as const;

export type ICSExportErrorCode =
  | "INVALID_CALENDAR_NAME"
  | "INVALID_TIMESTAMP"
  | "EMPTY_OCCURRENCES"
  | "DUPLICATE_DATE"
  | "INVALID_OCCURRENCE_ORDER"
  | "OCCURRENCE_OUTSIDE_MONTH"
  | "OCCURRENCE_OUTSIDE_YEAR"
  | "INCOMPLETE_EXPORT_RANGE"
  | "INVALID_EXPORT_YEAR"
  | "DATE_OVERFLOW"
  | "INVALID_CONFIGURATION";

export type ICSExportError = {
  readonly code: ICSExportErrorCode;
  readonly occurrenceDate?: string;
};

type ICSExportInputBase = {
  readonly calendarName: string;
  readonly config: ScheduleConfig;
  readonly occurrences: readonly ScheduleOccurrence[];
  readonly generatedAt: string;
};

export type ICSExportInput = ICSExportInputBase &
  (
    | {
        readonly viewMonth: ISOYearMonth;
        readonly year?: never;
      }
    | {
        readonly year: number;
        readonly viewMonth?: never;
      }
  );

export type ICSExportSuccess = {
  readonly success: true;
  readonly content: string;
  readonly filename: string;
  readonly mimeType: typeof ICS_MIME_TYPE;
};

export type ICSExportResult =
  | ICSExportSuccess
  | {
      readonly success: false;
      readonly error: ICSExportError;
    };
