import type { DomainError, DomainErrorCode } from "@/features/schedule/domain";

export const SCHEDULE_ERROR_MESSAGES = {
  INVALID_DATE_FORMAT: "Enter a valid date.",
  INVALID_CALENDAR_DATE: "This date does not exist.",
  UNSUPPORTED_YEAR: "Choose a date between year 1 and year 9999.",
  INVALID_VIEW_MONTH: "The calendar month in this link is invalid.",
  INVALID_DAY_OFFSET: "The calendar could not move by that number of days.",
  INVALID_CYCLE: "Create a valid custom cycle.",
  EMPTY_CYCLE: "Add at least one day to your cycle.",
  CYCLE_TOO_LONG: "A custom cycle can contain no more than 56 days.",
  NO_WORKING_SHIFT: "Your cycle must include at least one day or night shift.",
  INVALID_SHIFT_KIND: "Choose Day, Night, or Off for every cycle day.",
  UNKNOWN_PRESET: "This schedule preset is not supported.",
  INVALID_WORKING_SHIFT: "Choose either a day shift or a night shift.",
  INVALID_RANGE: "The calendar date range is invalid.",
  RANGE_TOO_LARGE: "The requested calendar range is too large.",
  UNSUPPORTED_CONFIG_VERSION:
    "This shared schedule link uses an unsupported version.",
  INVALID_CONFIG_KIND: "This shared schedule type is not supported.",
  INVALID_CONFIGURATION: "This schedule configuration is invalid.",
  MISSING_FIELD: "Complete all required schedule fields.",
  MISSING_PARAMETER: "This shared schedule link is missing required details.",
  DUPLICATE_PARAMETER: "This shared schedule link contains duplicate details.",
  UNKNOWN_PARAMETER: "This shared schedule link contains an unknown detail.",
  INVALID_CYCLE_TOKEN: "This shared custom cycle contains an invalid shift.",
} satisfies Record<DomainErrorCode, string>;

export type ScheduleFieldErrors = {
  readonly startDate?: string;
  readonly cycle?: string;
};

export type PresentedScheduleErrors = {
  readonly fields: ScheduleFieldErrors;
  readonly summary: readonly string[];
};

export function getScheduleErrorMessage(error: DomainError): string {
  return SCHEDULE_ERROR_MESSAGES[error.code];
}

export function presentScheduleErrors(
  errors: readonly DomainError[],
): PresentedScheduleErrors {
  const fields: { startDate?: string; cycle?: string } = {};
  const summary: string[] = [];

  for (const error of errors) {
    const message = getScheduleErrorMessage(error);

    if (
      error.path === "startDate" ||
      error.path === "date" ||
      error.path === "s"
    ) {
      fields.startDate ??= message;
      continue;
    }

    if (error.path === "cycle") {
      fields.cycle ??= message;
      continue;
    }

    summary.push(message);
  }

  if (fields.startDate) {
    summary.push(fields.startDate);
  }

  if (fields.cycle) {
    summary.push(fields.cycle);
  }

  return Object.freeze({
    fields: Object.freeze(fields),
    summary: Object.freeze(summary),
  });
}

export function presentScheduleLinkErrors(
  errors: readonly DomainError[],
): readonly string[] {
  const messages = errors.map(getScheduleErrorMessage);

  return Object.freeze([
    "This schedule link is invalid. You can enter a new schedule below.",
    ...messages,
  ]);
}
